package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/users"
)

const (
	testGitHubLoginPath     = "/api/auth/github/login"
	testGitHubCallbackPath  = "/api/auth/github/callback"
	testGitHubOAuthState    = "test-oauth-state"
	testDifferentOAuthState = "different-oauth-state"
	testGitHubOAuthCode     = "test-oauth-code"
	testGitHubAuthorization = "https://github.com/login/oauth/authorize"
)

// Login state.

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
			handler := newOAuthStateTestHandler(state)
			generateStateCalls := 0
			handler.generateState = func() (string, error) {
				generateStateCalls++
				return testGitHubOAuthState, nil
			}
			router := newOAuthStateTestRouter(handler)

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
			if !slices.Equal(state.authorizationStates, []string{testGitHubOAuthState}) {
				t.Fatalf("authorization states = %q, want %q", state.authorizationStates, []string{testGitHubOAuthState})
			}
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
	handler := newOAuthStateTestHandler(state)
	handler.generateState = func() (string, error) { return "", errors.New("random source unavailable") }
	router := newOAuthStateTestRouter(handler)

	response := performOAuthStateRequest(router, testGitHubLoginPath, "", "")

	assertAuthErrorResponse(t, response, http.StatusInternalServerError, failedToInitializeGitHub)
	if len(state.authorizationStates) != 0 {
		t.Fatalf("authorization states = %q, want no provider call", state.authorizationStates)
	}
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
		name                  string
		storedState           string
		providedState         string
		expectedStatus        int
		expectedError         API_MESSAGE
		expectedProviderCalls []string
		expectedCookieDeleted bool
	}{
		{
			name:          "matching state reaches GitHub authentication and deletes the cookie",
			storedState:   testGitHubOAuthState,
			providedState: testGitHubOAuthState, expectedStatus: http.StatusInternalServerError,
			expectedError: failedToExchangeToken, expectedProviderCalls: []string{testGitHubOAuthCode},
			expectedCookieDeleted: true,
		},
		{name: "missing cookie is rejected", providedState: testGitHubOAuthState, expectedStatus: http.StatusBadRequest, expectedError: invalidGitHubOAuthState},
		{name: "missing callback state is rejected without deleting the cookie", storedState: testGitHubOAuthState, expectedStatus: http.StatusBadRequest, expectedError: invalidGitHubOAuthState},
		{name: "mismatched state is rejected without deleting the cookie", storedState: testGitHubOAuthState, providedState: testDifferentOAuthState, expectedStatus: http.StatusBadRequest, expectedError: invalidGitHubOAuthState},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			state := newMockAuthState()
			state.authenticateError = fmt.Errorf("authenticate: %w", ErrGitHubTokenExchange)
			router := newOAuthStateTestRouter(newOAuthStateTestHandler(state))

			response := performOAuthStateRequest(router, testGitHubCallbackPath, testCase.storedState, testCase.providedState)

			assertAuthErrorResponse(t, response, testCase.expectedStatus, testCase.expectedError)
			if !slices.Equal(state.authenticationCodes, testCase.expectedProviderCalls) {
				t.Fatalf("authentication codes = %q, want %q", state.authenticationCodes, testCase.expectedProviderCalls)
			}
			if state.repositoryCalls != 0 {
				t.Fatalf("repository calls = %d, want 0", state.repositoryCalls)
			}
			if testCase.expectedCookieDeleted {
				assertOAuthStateCookie(t, response, "", -1, false)
			} else if len(response.Result().Cookies()) != 0 {
				t.Fatalf("response cookies = %+v, want none", response.Result().Cookies())
			}
		})
	}
}

// Test support.

func newOAuthStateTestHandler(state *mockAuthState) *AuthHandler {
	return NewAuthHandler(mockGitHubProvider{state}, mockAuthUserRepository{state})
}

func newOAuthStateTestRouter(handler *AuthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterRoutes(router, handler)
	return router
}

func performOAuthStateRequest(router *gin.Engine, path string, storedState string, providedState string) *httptest.ResponseRecorder {
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

// Stateful mocks.

type mockAuthState struct {
	authorizationStates []string
	authenticationCodes []string
	authenticateError   error
	storedUsers         map[int64]users.User
	nextUserID          int64
	repositoryCalls     int
}

func newMockAuthState() *mockAuthState {
	return &mockAuthState{storedUsers: map[int64]users.User{}, nextUserID: 1}
}

type mockGitHubProvider struct{ *mockAuthState }

func (provider mockGitHubProvider) AuthorizationURL(state string) string {
	provider.authorizationStates = append(provider.authorizationStates, state)
	return testGitHubAuthorization + "?state=" + url.QueryEscape(state)
}

func (provider mockGitHubProvider) Authenticate(_ context.Context, code string) (*GitHubUser, error) {
	provider.authenticationCodes = append(provider.authenticationCodes, code)
	if provider.authenticateError != nil {
		return nil, provider.authenticateError
	}
	return &GitHubUser{}, nil
}

type mockAuthUserRepository struct{ *mockAuthState }

func (repository mockAuthUserRepository) FindByGitHubID(githubID int64) (*users.User, error) {
	repository.repositoryCalls++
	user, found := repository.storedUsers[githubID]
	if !found {
		return nil, users.ErrUserNotFound
	}
	return &user, nil
}

func (repository mockAuthUserRepository) Save(user *users.User) error {
	repository.repositoryCalls++
	user.ID = repository.nextUserID
	repository.nextUserID++
	repository.storedUsers[user.GithubID] = *user
	return nil
}

func (repository mockAuthUserRepository) Update(user *users.User) error {
	repository.repositoryCalls++
	repository.storedUsers[user.GithubID] = *user
	return nil
}
