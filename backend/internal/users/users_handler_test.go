package users

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"reflect"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

const (
	testUserHandlerID              = int64(42)
	testUserHandlerPath            = "/api/user"
	testProfilePath                = testUserHandlerPath + "/profile"
	testCFHandlePath               = testUserHandlerPath + "/cfhandle"
	testVerificationTokenPath      = testUserHandlerPath + "/cfverification-token"
	testVerifyTokenPath            = testUserHandlerPath + "/verify-cftoken"
	testOriginalCFHandle           = "tourist"
	testUpdatedCFHandle            = "Petr"
	testGeneratedVerificationToken = "generated"
	testStoredVerificationToken    = "stored-token"
)

var testUserDependencyFailure = errors.New("dependency unavailable")

type userHandlerTestCase struct {
	name           string
	method         string
	path           string
	body           string
	setup          func(state *mockUserState, tokens *VerificationTokenStore)
	expectedStatus int
	expectedBody   any
	expectedCalls  []userDependencyCall
	assertState    func(t *testing.T, state *mockUserState, tokens *VerificationTokenStore)
}

func TestNewAPIInitializesDefaults(t *testing.T) {
	state := newmockUserState()
	api := NewAPI(mockUserRepository{state}, nil, mockCodeforcesProvider{state})

	if api.tokens == nil {
		t.Fatal("NewAPI() token store = nil")
	}
	token, err := api.generateToken(9)
	if err != nil {
		t.Fatalf("generateToken(9): %v", err)
	}
	if len(token) != 9 {
		t.Fatalf("generateToken(9) length = %d, want 9", len(token))
	}
}

func TestUserHandlers(t *testing.T) {
	previousLogOutput := log.Writer()
	log.SetOutput(io.Discard)
	t.Cleanup(func() { log.SetOutput(previousLogOutput) })

	user := newUserHandlerFixture()
	verifiedUser := user
	verifiedUser.CFVerified = true
	updatedUser := verifiedUser
	updatedUser.CFHandle = testUpdatedCFHandle
	updatedUser.CFVerified = false
	newlyVerifiedUser := user
	newlyVerifiedUser.CFVerified = true
	findUserCall := userDependencyCall{operation: findUserOperation, userID: testUserHandlerID}
	providerCall := userDependencyCall{operation: getVerificationValueOperation, cfHandle: testOriginalCFHandle}
	verifyUserCall := userDependencyCall{operation: updateCFVerifiedOperation, userID: testUserHandlerID, cfVerified: true}

	testCases := []userHandlerTestCase{
		// Profile
		{
			name: "profile returns the authenticated user", method: http.MethodGet, path: testProfilePath,
			expectedStatus: http.StatusOK, expectedBody: map[string]any{"user": user},
			expectedCalls: []userDependencyCall{findUserCall},
		},
		userNotFoundCase("profile returns not found", http.MethodGet, testProfilePath, "", findUserCall),
		userReadFailureCase("profile handles repository failure", http.MethodGet, testProfilePath, "", findUserCall),

		// Codeforces handle
		{
			name: "handle update persists the new handle", method: http.MethodPut, path: testCFHandlePath,
			body:  fmt.Sprintf(`{"cf_handle":"%s"}`, testUpdatedCFHandle),
			setup: storeUserSetup(verifiedUser), expectedStatus: http.StatusOK,
			expectedBody: messageBody(cfHandleUpdated),
			expectedCalls: []userDependencyCall{
				findUserCall,
				{operation: updateCFHandleOperation, userID: testUserHandlerID, cfHandle: testUpdatedCFHandle},
			},
			assertState: expectUserAndToken(updatedUser, "", false),
		},
		validationCase("handle update rejects malformed JSON", http.MethodPut, testCFHandlePath, `{"cf_handle":`, invalidRequest),
		userNotFoundCase("handle update returns not found", http.MethodPut, testCFHandlePath,
			fmt.Sprintf(`{"cf_handle":"%s"}`, testUpdatedCFHandle), findUserCall),
		userReadFailureCase("handle update handles lookup failure", http.MethodPut, testCFHandlePath,
			fmt.Sprintf(`{"cf_handle":"%s"}`, testUpdatedCFHandle), findUserCall),
		{
			name: "handle update handles persistence failure", method: http.MethodPut, path: testCFHandlePath,
			body:           fmt.Sprintf(`{"cf_handle":"%s"}`, testUpdatedCFHandle),
			setup:          operationFailureSetup(updateCFHandleOperation, testUserDependencyFailure),
			expectedStatus: http.StatusInternalServerError, expectedBody: errorBody(failedToUpdateCFHandle),
			expectedCalls: []userDependencyCall{
				findUserCall,
				{operation: updateCFHandleOperation, userID: testUserHandlerID, cfHandle: testUpdatedCFHandle},
			},
			assertState: expectUserAndToken(user, "", false),
		},

		// Verification token
		{
			name: "token endpoint creates and stores a token", method: http.MethodGet, path: testVerificationTokenPath,
			expectedStatus: http.StatusOK,
			expectedBody:   map[string]any{"token": testGeneratedVerificationToken},
			expectedCalls: []userDependencyCall{
				findUserCall,
				{operation: generateTokenOperation, tokenLength: 9},
			},
			assertState: expectUserAndToken(user, testGeneratedVerificationToken, true),
		},
		{
			name: "token endpoint reuses a stored token", method: http.MethodGet, path: testVerificationTokenPath,
			setup: seedTokenSetup(testStoredVerificationToken), expectedStatus: http.StatusOK,
			expectedBody:  map[string]any{"token": testStoredVerificationToken},
			expectedCalls: []userDependencyCall{findUserCall},
			assertState:   expectUserAndToken(user, testStoredVerificationToken, true),
		},
		{
			name: "token endpoint handles generator failure", method: http.MethodGet, path: testVerificationTokenPath,
			setup:          operationFailureSetup(generateTokenOperation, testUserDependencyFailure),
			expectedStatus: http.StatusInternalServerError, expectedBody: errorBody(failedToGenerateToken),
			expectedCalls: []userDependencyCall{
				findUserCall,
				{operation: generateTokenOperation, tokenLength: 9},
			},
			assertState: expectUserAndToken(user, "", false),
		},
		{
			name: "token endpoint rejects an already verified user", method: http.MethodGet, path: testVerificationTokenPath,
			setup:          combineSetups(storeUserSetup(verifiedUser), seedTokenSetup(testStoredVerificationToken)),
			expectedStatus: http.StatusBadRequest, expectedBody: errorBody(userAlreadyVerified),
			expectedCalls: []userDependencyCall{findUserCall},
			assertState:   expectUserAndToken(verifiedUser, testStoredVerificationToken, true),
		},
		userNotFoundCase("token endpoint returns not found", http.MethodGet, testVerificationTokenPath, "", findUserCall),
		userReadFailureCase("token endpoint handles lookup failure", http.MethodGet, testVerificationTokenPath, "", findUserCall),

		// Codeforces verification
		{
			name: "verification matches, persists, and deletes the token", method: http.MethodGet, path: testVerifyTokenPath,
			setup: seedTokenSetup(testStoredVerificationToken), expectedStatus: http.StatusOK,
			expectedBody:  messageBody(userVerified),
			expectedCalls: []userDependencyCall{findUserCall, providerCall, verifyUserCall},
			assertState:   expectUserAndToken(newlyVerifiedUser, "", false),
		},
		{
			name: "verification rejects an already verified user", method: http.MethodGet, path: testVerifyTokenPath,
			setup:          combineSetups(storeUserSetup(verifiedUser), seedTokenSetup(testStoredVerificationToken)),
			expectedStatus: http.StatusBadRequest, expectedBody: errorBody(userAlreadyVerified),
			expectedCalls: []userDependencyCall{findUserCall},
			assertState:   expectUserAndToken(verifiedUser, testStoredVerificationToken, true),
		},
		{
			name: "verification rejects a mismatched token", method: http.MethodGet, path: testVerifyTokenPath,
			setup:          combineSetups(seedTokenSetup(testStoredVerificationToken), verificationValueSetup("different-token")),
			expectedStatus: http.StatusBadRequest, expectedBody: errorBody(invalidVerificationToken),
			expectedCalls: []userDependencyCall{findUserCall, providerCall},
			assertState:   expectUserAndToken(user, testStoredVerificationToken, true),
		},
		{
			name: "verification rejects a missing token", method: http.MethodGet, path: testVerifyTokenPath,
			expectedStatus: http.StatusBadRequest, expectedBody: errorBody(invalidVerificationToken),
			expectedCalls: []userDependencyCall{findUserCall, providerCall},
			assertState:   expectUserAndToken(user, "", false),
		},
		userNotFoundCase("verification returns not found", http.MethodGet, testVerifyTokenPath, "", findUserCall),
		userReadFailureCase("verification handles lookup failure", http.MethodGet, testVerifyTokenPath, "", findUserCall),
		providerErrorCase("verification handles request creation failure", ErrCodeforcesRequestCreation,
			http.StatusInternalServerError, failedToCreateCodeforcesRequest, findUserCall, providerCall),
		providerErrorCase("verification handles request failure", ErrCodeforcesRequest,
			http.StatusInternalServerError, failedToCallCodeforces, findUserCall, providerCall),
		providerErrorCase("verification handles rejected response", ErrCodeforcesRejectedResponse,
			http.StatusBadGateway, codeforcesRequestFailed, findUserCall, providerCall),
		providerErrorCase("verification handles invalid response", ErrCodeforcesInvalidResponse,
			http.StatusBadGateway, failedToParseCodeforcesResponse, findUserCall, providerCall),
		providerErrorCase("verification handles a missing Codeforces user", ErrCodeforcesUserNotFound,
			http.StatusBadRequest, codeforcesUserNotFound, findUserCall, providerCall),
		providerErrorCase("verification handles an unknown provider failure", testUserDependencyFailure,
			http.StatusInternalServerError, failedToCallCodeforces, findUserCall, providerCall),
		{
			name: "verification retains the token when persistence fails", method: http.MethodGet, path: testVerifyTokenPath,
			setup: combineSetups(
				seedTokenSetup(testStoredVerificationToken),
				operationFailureSetup(updateCFVerifiedOperation, testUserDependencyFailure),
			),
			expectedStatus: http.StatusInternalServerError, expectedBody: errorBody(failedToVerifyUser),
			expectedCalls: []userDependencyCall{findUserCall, providerCall, verifyUserCall},
			assertState:   expectUserAndToken(user, testStoredVerificationToken, true),
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			state := newmockUserState()
			tokens := NewVerificationTokenStore()
			if testCase.setup != nil {
				testCase.setup(state, tokens)
			}
			api := newUserHandlerTestAPI(state, tokens)
			router := newUserHandlerTestRouter(api)

			response := performUserRequest(router, testCase.method, testCase.path, testCase.body)

			assertResponseStatus(t, response, testCase.expectedStatus)
			assertJSONBody(t, response, testCase.expectedBody)
			if !slices.Equal(state.calls, testCase.expectedCalls) {
				t.Fatalf("dependency calls = %+v, want %+v", state.calls, testCase.expectedCalls)
			}
			if testCase.assertState != nil {
				testCase.assertState(t, state, tokens)
			}
		})
	}
}

// Test case builders
func validationCase(name string, method string, path string, body string, message API_MESSAGE) userHandlerTestCase {
	return userHandlerTestCase{
		name: name, method: method, path: path, body: body,
		expectedStatus: http.StatusBadRequest, expectedBody: errorBody(message),
	}
}

func userNotFoundCase(name string, method string, path string, body string, expectedCall userDependencyCall) userHandlerTestCase {
	return userHandlerTestCase{
		name: name, method: method, path: path, body: body, setup: clearUsersSetup,
		expectedStatus: http.StatusNotFound, expectedBody: errorBody(userNotFound),
		expectedCalls: []userDependencyCall{expectedCall},
	}
}

func userReadFailureCase(name string, method string, path string, body string, expectedCall userDependencyCall) userHandlerTestCase {
	return userHandlerTestCase{
		name: name, method: method, path: path, body: body,
		setup:          operationFailureSetup(findUserOperation, testUserDependencyFailure),
		expectedStatus: http.StatusInternalServerError, expectedBody: errorBody(failedToLoadUser),
		expectedCalls: []userDependencyCall{expectedCall},
	}
}

func providerErrorCase(
	name string,
	providerError error,
	expectedStatus int,
	expectedMessage API_MESSAGE,
	expectedCalls ...userDependencyCall,
) userHandlerTestCase {
	return userHandlerTestCase{
		name: name, method: http.MethodGet, path: testVerifyTokenPath,
		setup:          operationFailureSetup(getVerificationValueOperation, fmt.Errorf("provider failure: %w", providerError)),
		expectedStatus: expectedStatus, expectedBody: errorBody(expectedMessage), expectedCalls: expectedCalls,
	}
}

// HTTP test setup
func newUserHandlerTestAPI(state *mockUserState, tokens *VerificationTokenStore) *API {
	api := NewAPI(mockUserRepository{state}, tokens, mockCodeforcesProvider{state})
	api.generateToken = func(length int) (string, error) {
		state.record(userDependencyCall{operation: generateTokenOperation, tokenLength: length})
		if err := state.operationErrors[generateTokenOperation]; err != nil {
			return "", err
		}
		return testGeneratedVerificationToken, nil
	}
	return api
}

func newUserHandlerTestRouter(api *API) *gin.Engine {
	router := gin.New()
	userRoutes := router.Group(testUserHandlerPath)
	userRoutes.Use(func(context *gin.Context) {
		context.Set(middlewares.UserIdKey, testUserHandlerID)
		context.Next()
	})
	userRoutes.GET("/profile", api.GetProfile)
	userRoutes.PUT("/cfhandle", api.UpdateCFHandle)
	userRoutes.GET("/cfverification-token", api.GetCFVerificationToken)
	userRoutes.GET("/verify-cftoken", api.VerifyCFVerificationToken)
	return router
}

func performUserRequest(router *gin.Engine, method string, path string, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

// Response assertions
func assertResponseStatus(t *testing.T, response *httptest.ResponseRecorder, expectedStatus int) {
	t.Helper()
	if response.Code != expectedStatus {
		t.Fatalf("response status = %d, want %d; body = %s", response.Code, expectedStatus, response.Body.String())
	}
}

func assertJSONBody(t *testing.T, response *httptest.ResponseRecorder, expectedBody any) {
	t.Helper()
	actualJSON := decodeJSON(t, response.Body.Bytes())
	expectedBytes, err := json.Marshal(expectedBody)
	if err != nil {
		t.Fatalf("encode expected response: %v", err)
	}
	expectedJSON := decodeJSON(t, expectedBytes)
	if !reflect.DeepEqual(actualJSON, expectedJSON) {
		t.Fatalf("response JSON = %#v, want %#v", actualJSON, expectedJSON)
	}
}

func decodeJSON(t *testing.T, data []byte) any {
	t.Helper()
	var value any
	if err := json.Unmarshal(data, &value); err != nil {
		t.Fatalf("decode JSON %q: %v", data, err)
	}
	return value
}

func messageBody(message API_MESSAGE) map[string]any {
	return map[string]any{"message": message}
}

func errorBody(message API_MESSAGE) map[string]any {
	return map[string]any{"error": message}
}

// Scenario setup and state assertions
func combineSetups(setups ...func(*mockUserState, *VerificationTokenStore)) func(*mockUserState, *VerificationTokenStore) {
	return func(state *mockUserState, tokens *VerificationTokenStore) {
		for _, setup := range setups {
			setup(state, tokens)
		}
	}
}

func storeUserSetup(user User) func(*mockUserState, *VerificationTokenStore) {
	return func(state *mockUserState, _ *VerificationTokenStore) { state.storeUser(user) }
}

func seedTokenSetup(token string) func(*mockUserState, *VerificationTokenStore) {
	return func(_ *mockUserState, tokens *VerificationTokenStore) {
		tokens.SetToken(testUserHandlerID, token, time.Hour)
	}
}

func verificationValueSetup(value string) func(*mockUserState, *VerificationTokenStore) {
	return func(state *mockUserState, _ *VerificationTokenStore) { state.verificationValue = value }
}

func operationFailureSetup(operation userDependencyOperation, err error) func(*mockUserState, *VerificationTokenStore) {
	return func(state *mockUserState, _ *VerificationTokenStore) { state.operationErrors[operation] = err }
}

func clearUsersSetup(state *mockUserState, _ *VerificationTokenStore) {
	state.users = map[int64]User{}
}

func expectUserAndToken(expectedUser User, expectedToken string, expectedTokenFound bool) func(*testing.T, *mockUserState, *VerificationTokenStore) {
	return func(t *testing.T, state *mockUserState, tokens *VerificationTokenStore) {
		t.Helper()
		actualUser, found := state.users[expectedUser.ID]
		if !found || actualUser != expectedUser {
			t.Fatalf("stored user = %+v, %v; want %+v, true", actualUser, found, expectedUser)
		}
		actualToken, tokenFound := tokens.GetToken(expectedUser.ID)
		if actualToken != expectedToken || tokenFound != expectedTokenFound {
			t.Fatalf("stored token = %q, %v; want %q, %v", actualToken, tokenFound, expectedToken, expectedTokenFound)
		}
	}
}

// Fixtures
func newUserHandlerFixture() User {
	return User{
		ID:             testUserHandlerID,
		GithubID:       101,
		GithubUserName: "test-user",
		Email:          "test@example.com",
		AvatarURL:      "https://example.com/avatar.png",
		CFHandle:       testOriginalCFHandle,
	}
}

// Mocks
type userDependencyOperation string

const (
	findUserOperation             userDependencyOperation = "find user"
	updateCFHandleOperation       userDependencyOperation = "update CF handle"
	updateCFVerifiedOperation     userDependencyOperation = "update CF verification"
	getVerificationValueOperation userDependencyOperation = "get verification value"
	generateTokenOperation        userDependencyOperation = "generate token"
)

type userDependencyCall struct {
	operation   userDependencyOperation
	userID      int64
	cfHandle    string
	cfVerified  bool
	tokenLength int
}

type mockUserState struct {
	users             map[int64]User
	verificationValue string
	operationErrors   map[userDependencyOperation]error
	calls             []userDependencyCall
}

func newmockUserState() *mockUserState {
	state := &mockUserState{
		users:             map[int64]User{},
		verificationValue: testStoredVerificationToken,
		operationErrors:   map[userDependencyOperation]error{},
	}
	state.storeUser(newUserHandlerFixture())
	return state
}

type mockUserRepository struct{ *mockUserState }

func (repository mockUserRepository) FindByID(userID int64) (*User, error) {
	repository.record(userDependencyCall{operation: findUserOperation, userID: userID})
	if err := repository.operationErrors[findUserOperation]; err != nil {
		return nil, err
	}
	user, found := repository.users[userID]
	if !found {
		return nil, ErrUserNotFound
	}
	return &user, nil
}

func (repository mockUserRepository) UpdateCFHandle(user *User, cfHandle string) error {
	repository.record(userDependencyCall{operation: updateCFHandleOperation, userID: user.ID, cfHandle: cfHandle})
	if err := repository.operationErrors[updateCFHandleOperation]; err != nil {
		return err
	}
	storedUser, found := repository.users[user.ID]
	if !found {
		return ErrUserNotFound
	}
	storedUser.CFHandle = cfHandle
	storedUser.CFVerified = false
	repository.storeUser(storedUser)
	*user = storedUser
	return nil
}

func (repository mockUserRepository) UpdateCFVerified(user *User, cfVerified bool) error {
	repository.record(userDependencyCall{operation: updateCFVerifiedOperation, userID: user.ID, cfVerified: cfVerified})
	if err := repository.operationErrors[updateCFVerifiedOperation]; err != nil {
		return err
	}
	storedUser, found := repository.users[user.ID]
	if !found {
		return ErrUserNotFound
	}
	storedUser.CFVerified = cfVerified
	repository.storeUser(storedUser)
	*user = storedUser
	return nil
}

type mockCodeforcesProvider struct{ *mockUserState }

func (provider mockCodeforcesProvider) GetVerificationValue(_ context.Context, cfHandle string) (string, error) {
	provider.record(userDependencyCall{operation: getVerificationValueOperation, cfHandle: cfHandle})
	if err := provider.operationErrors[getVerificationValueOperation]; err != nil {
		return "", err
	}
	return provider.verificationValue, nil
}

func (state *mockUserState) record(call userDependencyCall) {
	state.calls = append(state.calls, call)
}

func (state *mockUserState) storeUser(user User) {
	state.users[user.ID] = user
}
