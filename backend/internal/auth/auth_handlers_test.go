package auth

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/testutil"
	"github.com/mbashem/cftracker/backend/internal/users"
	"github.com/mbashem/cftracker/backend/internal/utils"
)

const (
	testGitHubLoginPath     = "/api/auth/github/login"
	testGitHubCallbackPath  = "/api/auth/github/callback"
	testGitHubOAuthState    = "test-oauth-state"
	testDifferentOAuthState = "different-oauth-state"
	testGitHubOAuthCode     = "test-oauth-code"
	testGitHubAuthorization = "https://github.com/login/oauth/authorize"
	testGitHubID            = int64(12345)
	testExistingUserID      = int64(42)
	testSavedUserID         = int64(84)
	testGitHubLogin         = "new-github-login"
	testGitHubEmail         = "new@example.com"
	testGitHubAvatarURL     = "https://example.com/new-avatar.png"
	testJWTSecret           = "fixed-test-jwt-secret-with-at-least-32-bytes"
	testDependencyFailure   = "dependency unavailable"
)

type authHandlerTestCase struct {
	name               string
	setup              func(state *mockAuthState)
	expectedStatus     int
	expectedError      API_MESSAGE
	expectedUser       *users.User
	expectedStoredUser *users.User
	expectedCalls      []authDependencyCall
}

type authHandlerResponse struct {
	User  users.User `json:"user"`
	Token string     `json:"token"`
}

// Login flow.

func TestGitHubLoginStoresGeneratedOAuthState(t *testing.T) {
	testCases := []struct {
		name           string
		directHTTPS    bool
		forwardedProto string
		expectedSecure bool
	}{
		{name: "HTTP login stores a local-development cookie"},
		{name: "direct HTTPS login stores a secure cookie", directHTTPS: true, expectedSecure: true},
		{name: "proxied HTTPS login stores a secure cookie", forwardedProto: "https", expectedSecure: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			state := newMockAuthState()
			handler, githubProvider := newAuthHandlerTestHandler(state)
			generateStateCalls := 0
			handler.generateState = func() (string, error) {
				generateStateCalls++
				return testGitHubOAuthState, nil
			}
			router := newAuthHandlerTestRouter(handler)

			requestURL := testGitHubLoginPath
			if testCase.directHTTPS {
				requestURL = "https://cftracker.test" + testGitHubLoginPath
			}
			request := httptest.NewRequest(http.MethodGet, requestURL, nil)
			request.Header.Set("X-Forwarded-Proto", testCase.forwardedProto)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)

			if response.Code != http.StatusTemporaryRedirect {
				t.Fatalf("response status = %d, want %d; body = %s", response.Code, http.StatusTemporaryRedirect, response.Body.String())
			}
			if generateStateCalls != 1 {
				t.Fatalf("generateState calls = %d, want 1", generateStateCalls)
			}
			assertGitHubProviderCalls(t, githubProvider, []string{testGitHubOAuthState}, nil)
			assertAuthDependencyCalls(t, state, nil)
			expectedLocation := testGitHubAuthorization + "?state=" + url.QueryEscape(testGitHubOAuthState)
			if location := response.Header().Get("Location"); location != expectedLocation {
				t.Fatalf("redirect location = %q, want %q", location, expectedLocation)
			}
			assertOAuthStateCookie(t, response, testGitHubOAuthState, githubOAuthStateMaxAge, testCase.expectedSecure)
		})
	}
}

func TestGitHubLoginHandlesOAuthStateGenerationFailure(t *testing.T) {
	state := newMockAuthState()
	handler, githubProvider := newAuthHandlerTestHandler(state)
	handler.generateState = func() (string, error) { return "", errors.New(testDependencyFailure) }
	router := newAuthHandlerTestRouter(handler)

	response := performAuthRequest(router, testGitHubLoginPath, "", "")

	assertAuthErrorResponse(t, response, http.StatusInternalServerError, failedToInitializeGitHub)
	assertGitHubProviderCalls(t, githubProvider, nil, nil)
	assertAuthDependencyCalls(t, state, nil)
	if len(response.Result().Cookies()) != 0 {
		t.Fatalf("response cookies = %+v, want none", response.Result().Cookies())
	}
}

func TestGenerateGitHubOAuthState(t *testing.T) {
	state, err := generateGitHubOAuthState()
	if err != nil {
		t.Fatalf("generateGitHubOAuthState(): %v", err)
	}
	decodedState, err := base64.RawURLEncoding.DecodeString(state)
	if err != nil {
		t.Fatalf("decode generated state %q: %v", state, err)
	}
	if len(decodedState) != githubOAuthStateLength {
		t.Fatalf("generated state length = %d bytes, want %d", len(decodedState), githubOAuthStateLength)
	}
}

// Callback state validation.

func TestGitHubCallbackValidatesAndConsumesOAuthState(t *testing.T) {
	testCases := []struct {
		name                        string
		storedState                 string
		providedState               string
		expectedStatus              int
		expectedError               API_MESSAGE
		expectedAuthenticationCodes []string
		expectedCookieDeleted       bool
	}{
		{
			name:        "matching state reaches GitHub authentication and deletes the cookie",
			storedState: testGitHubOAuthState, providedState: testGitHubOAuthState,
			expectedStatus: http.StatusInternalServerError, expectedError: failedToExchangeToken,
			expectedAuthenticationCodes: []string{testGitHubOAuthCode}, expectedCookieDeleted: true,
		},
		{name: "missing cookie is rejected", providedState: testGitHubOAuthState, expectedStatus: http.StatusBadRequest, expectedError: invalidGitHubOAuthState},
		{name: "missing callback state is rejected without deleting the cookie", storedState: testGitHubOAuthState, expectedStatus: http.StatusBadRequest, expectedError: invalidGitHubOAuthState},
		{name: "mismatched state is rejected without deleting the cookie", storedState: testGitHubOAuthState, providedState: testDifferentOAuthState, expectedStatus: http.StatusBadRequest, expectedError: invalidGitHubOAuthState},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			state := newMockAuthState()
			state.operationErrors[authenticateOperation] = fmt.Errorf("authenticate: %w", ErrGitHubTokenExchange)
			handler, githubProvider := newAuthHandlerTestHandler(state)
			router := newAuthHandlerTestRouter(handler)

			response := performAuthRequest(router, testGitHubCallbackPath, testCase.storedState, testCase.providedState)

			assertAuthErrorResponse(t, response, testCase.expectedStatus, testCase.expectedError)
			assertGitHubProviderCalls(t, githubProvider, nil, testCase.expectedAuthenticationCodes)
			assertAuthDependencyCalls(t, state, nil)
			if testCase.expectedCookieDeleted {
				assertOAuthStateCookie(t, response, "", -1, false)
			} else if len(response.Result().Cookies()) != 0 {
				t.Fatalf("response cookies = %+v, want none", response.Result().Cookies())
			}
		})
	}
}

// Callback persistence and JWT response.

func TestGitHubCallback(t *testing.T) {
	previousLogOutput := log.Writer()
	log.SetOutput(io.Discard)
	t.Cleanup(func() { log.SetOutput(previousLogOutput) })

	githubUser := newGitHubUserFixture()
	newUser := userFromGitHubUser(githubUser)
	savedUser := newUser
	savedUser.ID = testSavedUserID
	existingUser := newExistingAuthUserFixture()
	updatedUser := existingUser
	updatedUser.GithubUserName = githubUser.Login
	updatedUser.Email = githubUser.Email
	updatedUser.AvatarURL = githubUser.AvatarURL
	findCall := authDependencyCall{operation: findByGitHubIDOperation, githubID: githubUser.ID}

	testCases := []authHandlerTestCase{
		{
			name:           "new GitHub user is saved and receives a valid JWT",
			expectedStatus: http.StatusOK, expectedUser: &savedUser, expectedStoredUser: &savedUser,
			expectedCalls: []authDependencyCall{
				findCall,
				{operation: saveOperation, user: newUser},
				{operation: generateTokenOperation, email: githubUser.Email, userID: savedUser.ID},
			},
		},
		{
			name:  "returning GitHub user is refreshed and receives a valid JWT",
			setup: storeAuthUserSetup(existingUser), expectedStatus: http.StatusOK,
			expectedUser: &updatedUser, expectedStoredUser: &updatedUser,
			expectedCalls: []authDependencyCall{
				findCall,
				{operation: updateOperation, user: updatedUser},
				{operation: generateTokenOperation, email: githubUser.Email, userID: existingUser.ID},
			},
		},
		providerFailureCase("token exchange failure is mapped", ErrGitHubTokenExchange, http.StatusInternalServerError, failedToExchangeToken),
		providerFailureCase("GitHub user request failure is mapped", ErrGitHubUserRequest, http.StatusInternalServerError, failedToGetUserInfo),
		providerFailureCase("GitHub rejected response is mapped", ErrGitHubRejectedResponse, http.StatusBadGateway, githubUserRequestFailed),
		providerFailureCase("invalid GitHub response is mapped", ErrGitHubInvalidResponse, http.StatusInternalServerError, failedToDecodeUserInfo),
		providerFailureCase("unknown GitHub failure is mapped", errors.New(testDependencyFailure), http.StatusInternalServerError, failedToGetUserInfo),
		{
			name: "user lookup failure is returned", setup: operationFailureSetup(findByGitHubIDOperation),
			expectedStatus: http.StatusInternalServerError, expectedError: failedToLoadUser,
			expectedCalls: []authDependencyCall{findCall},
		},
		{
			name: "new user save failure is returned", setup: operationFailureSetup(saveOperation),
			expectedStatus: http.StatusInternalServerError, expectedError: failedToSaveUser,
			expectedCalls: []authDependencyCall{
				findCall,
				{operation: saveOperation, user: newUser},
			},
		},
		{
			name:           "returning user update failure preserves the stored user",
			setup:          combineAuthSetups(storeAuthUserSetup(existingUser), operationFailureSetup(updateOperation)),
			expectedStatus: http.StatusInternalServerError, expectedError: failedToUpdateUser,
			expectedStoredUser: &existingUser,
			expectedCalls: []authDependencyCall{
				findCall,
				{operation: updateOperation, user: updatedUser},
			},
		},
		{
			name:           "JWT generation failure is returned after saving the user",
			setup:          operationFailureSetup(generateTokenOperation),
			expectedStatus: http.StatusInternalServerError, expectedError: failedToGenerateToken,
			expectedStoredUser: &savedUser,
			expectedCalls: []authDependencyCall{
				findCall,
				{operation: saveOperation, user: newUser},
				{operation: generateTokenOperation, email: githubUser.Email, userID: savedUser.ID},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			utils.Init(testJWTSecret)
			state := newMockAuthState()
			if testCase.setup != nil {
				testCase.setup(state)
			}
			handler, githubProvider := newAuthHandlerTestHandler(state)
			response := performAuthRequest(newAuthHandlerTestRouter(handler), testGitHubCallbackPath, testGitHubOAuthState, testGitHubOAuthState)

			if testCase.expectedError != "" {
				assertAuthErrorResponse(t, response, testCase.expectedStatus, testCase.expectedError)
			} else {
				assertSuccessfulAuthResponse(t, response, testCase.expectedUser)
			}
			assertGitHubProviderCalls(t, githubProvider, nil, []string{testGitHubOAuthCode})
			assertAuthDependencyCalls(t, state, testCase.expectedCalls)
			assertStoredAuthUser(t, state, testCase.expectedStoredUser)
			assertOAuthStateCookie(t, response, "", -1, false)
		})
	}
}

// Test case builders.

func providerFailureCase(name string, providerError error, status int, message API_MESSAGE) authHandlerTestCase {
	return authHandlerTestCase{
		name: name,
		setup: func(state *mockAuthState) {
			state.operationErrors[authenticateOperation] = fmt.Errorf("provider failure: %w", providerError)
		},
		expectedStatus: status, expectedError: message,
	}
}

func storeAuthUserSetup(user users.User) func(*mockAuthState) {
	return func(state *mockAuthState) { state.storeUser(user) }
}

func operationFailureSetup(operation authDependencyOperation) func(*mockAuthState) {
	return func(state *mockAuthState) {
		state.operationErrors[operation] = errors.New(testDependencyFailure)
	}
}

func combineAuthSetups(setups ...func(*mockAuthState)) func(*mockAuthState) {
	return func(state *mockAuthState) {
		for _, setup := range setups {
			setup(state)
		}
	}
}

// HTTP test setup.

func newAuthHandlerTestHandler(state *mockAuthState) (*AuthHandler, *testutil.GitHubProviderMock[GitHubUser]) {
	githubProvider := testutil.NewGitHubProviderMock(
		testGitHubAuthorization,
		map[string]GitHubUser{testGitHubOAuthCode: state.githubUser},
	)
	githubProvider.AuthenticationError = state.operationErrors[authenticateOperation]
	handler := NewAuthHandler(githubProvider, mockAuthUserRepository{state})
	handler.generateToken = func(email string, userID int64) (string, error) {
		state.record(authDependencyCall{operation: generateTokenOperation, email: email, userID: userID})
		if err := state.operationErrors[generateTokenOperation]; err != nil {
			return "", err
		}
		return utils.GenerateToken(email, userID)
	}
	return handler, githubProvider
}

func newAuthHandlerTestRouter(handler *AuthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterRoutes(router, handler)
	return router
}

func performAuthRequest(router *gin.Engine, path string, storedState string, providedState string) *httptest.ResponseRecorder {
	requestURL := path
	if path == testGitHubCallbackPath {
		query := url.Values{"code": []string{testGitHubOAuthCode}}
		if providedState != "" {
			query.Set("state", providedState)
		}
		requestURL += "?" + query.Encode()
	}
	request := httptest.NewRequest(http.MethodGet, requestURL, nil)
	if storedState != "" {
		request.AddCookie(&http.Cookie{Name: githubOAuthStateCookieName, Value: storedState})
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

// Response and state assertions.

func assertSuccessfulAuthResponse(t *testing.T, response *httptest.ResponseRecorder, expectedUser *users.User) {
	t.Helper()
	if response.Code != http.StatusOK {
		t.Fatalf("response status = %d, want %d; body = %s", response.Code, http.StatusOK, response.Body.String())
	}
	var body authHandlerResponse
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response body %q: %v", response.Body.String(), err)
	}
	if expectedUser == nil || body.User != *expectedUser {
		t.Fatalf("response user = %+v, want %+v", body.User, expectedUser)
	}
	userID, err := utils.VerifyToken(body.Token)
	if err != nil {
		t.Fatalf("verify response token: %v", err)
	}
	if userID != expectedUser.ID {
		t.Fatalf("response token userID = %d, want %d", userID, expectedUser.ID)
	}
}

func assertAuthErrorResponse(t *testing.T, response *httptest.ResponseRecorder, expectedStatus int, expectedError API_MESSAGE) {
	t.Helper()
	if response.Code != expectedStatus {
		t.Fatalf("response status = %d, want %d; body = %s", response.Code, expectedStatus, response.Body.String())
	}
	var body map[string]API_MESSAGE
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response body %q: %v", response.Body.String(), err)
	}
	if body["error"] != expectedError {
		t.Fatalf("response error = %q, want %q", body["error"], expectedError)
	}
}

func assertAuthDependencyCalls(t *testing.T, state *mockAuthState, expectedCalls []authDependencyCall) {
	t.Helper()
	if !slices.Equal(state.calls, expectedCalls) {
		t.Fatalf("dependency calls = %+v, want %+v", state.calls, expectedCalls)
	}
}

func assertGitHubProviderCalls(
	t *testing.T,
	provider *testutil.GitHubProviderMock[GitHubUser],
	expectedStates []string,
	expectedCodes []string,
) {
	t.Helper()
	if !slices.Equal(provider.AuthorizationStates, expectedStates) {
		t.Fatalf("GitHub authorization states = %v, want %v", provider.AuthorizationStates, expectedStates)
	}
	if !slices.Equal(provider.AuthenticationCodes, expectedCodes) {
		t.Fatalf("GitHub authentication codes = %v, want %v", provider.AuthenticationCodes, expectedCodes)
	}
}

func assertStoredAuthUser(t *testing.T, state *mockAuthState, expectedUser *users.User) {
	t.Helper()
	if expectedUser == nil {
		if len(state.storedUsers) != 0 {
			t.Fatalf("stored users = %+v, want none", state.storedUsers)
		}
		return
	}
	actualUser, found := state.storedUsers[expectedUser.GithubID]
	if !found || actualUser != *expectedUser {
		t.Fatalf("stored user = %+v, %v; want %+v, true", actualUser, found, *expectedUser)
	}
}

func assertOAuthStateCookie(t *testing.T, response *httptest.ResponseRecorder, expectedValue string, expectedMaxAge int, expectedSecure bool) {
	t.Helper()
	cookies := response.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("response cookies = %+v, want exactly one", cookies)
	}
	cookie := cookies[0]
	expectedSameSite := http.SameSiteLaxMode
	if expectedSecure {
		expectedSameSite = http.SameSiteNoneMode
	}
	if cookie.Name != githubOAuthStateCookieName || cookie.Value != expectedValue || cookie.Path != "/" ||
		cookie.MaxAge != expectedMaxAge || !cookie.HttpOnly || cookie.Secure != expectedSecure || cookie.SameSite != expectedSameSite {
		t.Fatalf("OAuth state cookie = %+v", cookie)
	}
}

// Fixtures.

func newGitHubUserFixture() GitHubUser {
	return GitHubUser{ID: testGitHubID, Login: testGitHubLogin, Email: testGitHubEmail, AvatarURL: testGitHubAvatarURL}
}

func userFromGitHubUser(githubUser GitHubUser) users.User {
	return users.User{
		GithubID: githubUser.ID, GithubUserName: githubUser.Login,
		Email: githubUser.Email, AvatarURL: githubUser.AvatarURL,
	}
}

func newExistingAuthUserFixture() users.User {
	return users.User{
		ID: testExistingUserID, GithubID: testGitHubID,
		GithubUserName: "old-github-login", Email: "old@example.com",
		AvatarURL: "https://example.com/old-avatar.png",
		CFHandle:  "tourist", CFVerified: true, Admin: true,
	}
}

// Stateful mocks.

type authDependencyOperation string

const (
	authenticateOperation   authDependencyOperation = "authenticate"
	findByGitHubIDOperation authDependencyOperation = "find by GitHub ID"
	saveOperation           authDependencyOperation = "save"
	updateOperation         authDependencyOperation = "update"
	generateTokenOperation  authDependencyOperation = "generate token"
)

type authDependencyCall struct {
	operation authDependencyOperation
	githubID  int64
	user      users.User
	email     string
	userID    int64
}

type mockAuthState struct {
	githubUser      GitHubUser
	storedUsers     map[int64]users.User
	nextUserID      int64
	operationErrors map[authDependencyOperation]error
	calls           []authDependencyCall
}

func newMockAuthState() *mockAuthState {
	return &mockAuthState{
		githubUser: newGitHubUserFixture(), storedUsers: map[int64]users.User{},
		nextUserID: testSavedUserID, operationErrors: map[authDependencyOperation]error{},
	}
}

func (state *mockAuthState) record(call authDependencyCall) {
	state.calls = append(state.calls, call)
}

func (state *mockAuthState) storeUser(user users.User) {
	state.storedUsers[user.GithubID] = user
}

type mockAuthUserRepository struct{ *mockAuthState }

func (repository mockAuthUserRepository) FindByGitHubID(githubID int64) (*users.User, error) {
	repository.record(authDependencyCall{operation: findByGitHubIDOperation, githubID: githubID})
	if err := repository.operationErrors[findByGitHubIDOperation]; err != nil {
		return nil, err
	}
	user, found := repository.storedUsers[githubID]
	if !found {
		return nil, users.ErrUserNotFound
	}
	return &user, nil
}

func (repository mockAuthUserRepository) Save(user *users.User) error {
	repository.record(authDependencyCall{operation: saveOperation, user: *user})
	if err := repository.operationErrors[saveOperation]; err != nil {
		return err
	}
	user.ID = repository.nextUserID
	repository.nextUserID++
	repository.storeUser(*user)
	return nil
}

func (repository mockAuthUserRepository) Update(user *users.User) error {
	repository.record(authDependencyCall{operation: updateOperation, user: *user})
	if err := repository.operationErrors[updateOperation]; err != nil {
		return err
	}
	if _, found := repository.storedUsers[user.GithubID]; !found {
		return users.ErrUserNotFound
	}
	repository.storeUser(*user)
	return nil
}
