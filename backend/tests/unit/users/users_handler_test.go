package users_test

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
	"github.com/mbashem/cftracker/backend/internal/users"
	testutil "github.com/mbashem/cftracker/backend/tests/support"
)

const (
	staleCFVerification             = "Codeforces handle changed; please retry"
	invalidRequest                  = "Invalid request"
	failedToUpdateCFHandle          = "Failed to update CF Handle"
	cfHandleUpdated                 = "CF Handle updated"
	userAlreadyVerified             = "User is already verified"
	failedToGenerateToken           = "Failed to generate token"
	failedToCreateCodeforcesRequest = "Failed to make request object"
	failedToCallCodeforces          = "Failed to make request to CF"
	codeforcesRequestFailed         = "Codeforces request failed"
	failedToParseCodeforcesResponse = "Error parsing CF response"
	codeforcesUserNotFound          = "Codeforces user not found"
	invalidVerificationToken        = "Invalid token"
	failedToVerifyUser              = "Failed to verify user. Please try again later!"
	userVerified                    = "User verified"
	userNotFound                    = "User not found"
	failedToLoadUser                = "Failed to load user"
	testUserHandlerID               = int64(42)
	testUserHandlerPath             = "/api/user"
	testProfilePath                 = testUserHandlerPath + "/profile"
	testCFHandlePath                = testUserHandlerPath + "/cfhandle"
	testVerificationTokenPath       = testUserHandlerPath + "/cfverification-token"
	testVerifyTokenPath             = testUserHandlerPath + "/verify-cftoken"
	testOriginalCFHandle            = "tourist"
	testUpdatedCFHandle             = "Petr"
	testGeneratedVerificationToken  = "generated"
	testStoredVerificationToken     = "stored-token"
)

var testUserDependencyFailure = errors.New("dependency unavailable")

type userHandlerTestCase struct {
	name                        string
	method                      string
	path                        string
	body                        string
	setup                       func(state *mockUserState, tokens *users.VerificationTokenStore)
	expectedStatus              int
	expectedBody                any
	expectedCalls               []userDependencyCall
	expectedVerificationHandles []string
	expectedHistoricHandles     []string
	setupProvider               func(*testutil.CodeforcesProviderMock, *mockUserState)
	assertState                 func(t *testing.T, state *mockUserState, tokens *users.VerificationTokenStore)
}

func TestNewAPIInitializesDefaults(t *testing.T) {
	gin.SetMode(gin.TestMode)
	state := newMockUserState()
	api := users.NewAPI(mockUserRepository{state}, nil, testutil.NewCodeforcesProviderMock(state.verificationValue))

	state.expectedContext = t.Context()
	router := newUserHandlerTestRouter(api)
	first := performUserRequest(t.Context(), router, http.MethodGet, testVerificationTokenPath, "")
	assertResponseStatus(t, first, http.StatusOK)
	var payload testutil.APIResponse
	if err := json.Unmarshal(first.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Token) != 9 {
		t.Fatalf("token length = %d, want 9", len(payload.Token))
	}
	second := performUserRequest(t.Context(), router, http.MethodGet, testVerificationTokenPath, "")
	assertResponseStatus(t, second, http.StatusOK)
	assertJSONBody(t, second, payload)
}

func TestUserHandlers(t *testing.T) {
	previousLogOutput := log.Writer()
	log.SetOutput(io.Discard)
	t.Cleanup(func() { log.SetOutput(previousLogOutput) })

	user := newUserHandlerFixture()
	verifiedUser := user
	verifiedUser.CFVerifiedHandle = verifiedUser.CFHandle
	updatedUser := verifiedUser
	updatedUser.CFHandle = testUpdatedCFHandle
	newlyVerifiedUser := user
	newlyVerifiedUser.CFVerifiedHandle = newlyVerifiedUser.CFHandle
	renamedUser := verifiedUser
	renamedUser.CFHandle = testUpdatedCFHandle
	renamedUser.CFVerifiedHandle = testUpdatedCFHandle
	changedProofUser := verifiedUser
	changedProofUser.CFVerifiedHandle = "other-proof"
	findUserCall := userDependencyCall{operation: findUserOperation, userID: testUserHandlerID}
	verifyUserCall := userDependencyCall{operation: updateCFVerifiedHandleOperation, userID: testUserHandlerID, cfVerifiedHandle: testOriginalCFHandle}
	expectedVerificationHandles := []string{testOriginalCFHandle}

	testCases := []userHandlerTestCase{
		// Profile
		{
			name: "profile returns the authenticated user", method: http.MethodGet, path: testProfilePath,
			expectedStatus: http.StatusOK, expectedBody: testutil.APIResponse{User: user},
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
				{operation: updateCFHandleOperation, userID: testUserHandlerID, cfHandle: testUpdatedCFHandle, cfVerifiedHandle: testOriginalCFHandle},
			},
			expectedHistoricHandles: []string{testOriginalCFHandle},
			assertState:             expectUserAndToken(updatedUser, "", false),
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

		{
			name: "handle rename preserves verified ownership", method: http.MethodPut, path: testCFHandlePath,
			body: fmt.Sprintf(`{"cf_handle":"%s"}`, testUpdatedCFHandle), setup: storeUserSetup(verifiedUser),
			setupProvider: func(provider *testutil.CodeforcesProviderMock, _ *mockUserState) {
				provider.CurrentHandle = testUpdatedCFHandle
			},
			expectedStatus: http.StatusOK, expectedBody: messageBody(cfHandleUpdated),
			expectedCalls:           []userDependencyCall{findUserCall, {operation: updateCFHandleOperation, userID: testUserHandlerID, cfHandle: testUpdatedCFHandle, cfVerifiedHandle: testUpdatedCFHandle}},
			expectedHistoricHandles: []string{testOriginalCFHandle},
			assertState:             expectUserAndToken(renamedUser, "", false),
		},
		{
			name: "rename lookup failure preserves both stored handles", method: http.MethodPut, path: testCFHandlePath,
			body: fmt.Sprintf(`{"cf_handle":"%s"}`, testUpdatedCFHandle), setup: storeUserSetup(verifiedUser),
			setupProvider: func(provider *testutil.CodeforcesProviderMock, _ *mockUserState) {
				provider.CurrentHandleError = users.ErrCodeforcesRequest
			},
			expectedStatus: http.StatusInternalServerError, expectedBody: errorBody(failedToCallCodeforces),
			expectedCalls: []userDependencyCall{findUserCall}, expectedHistoricHandles: []string{testOriginalCFHandle},
			assertState: expectUserAndToken(verifiedUser, "", false),
		},
		{
			name: "unchanged verified handle avoids historical lookup", method: http.MethodPut, path: testCFHandlePath,
			body: fmt.Sprintf(`{"cf_handle":"%s"}`, testOriginalCFHandle), setup: storeUserSetup(verifiedUser),
			expectedStatus: http.StatusOK, expectedBody: messageBody(cfHandleUpdated),
			expectedCalls: []userDependencyCall{findUserCall, {operation: updateCFHandleOperation, userID: testUserHandlerID, cfHandle: testOriginalCFHandle, cfVerifiedHandle: testOriginalCFHandle}},
			assertState:   expectUserAndToken(verifiedUser, "", false),
		},
		{
			name: "handle update rejects changes during historical lookup", method: http.MethodPut, path: testCFHandlePath,
			body: fmt.Sprintf(`{"cf_handle":"%s"}`, testUpdatedCFHandle), setup: storeUserSetup(verifiedUser),
			setupProvider: func(provider *testutil.CodeforcesProviderMock, state *mockUserState) {
				provider.CurrentHandle = testUpdatedCFHandle
				provider.BeforeHistoricLookup = func() {
					changed := state.users[testUserHandlerID]
					changed.CFVerifiedHandle = "other-proof"
					state.storeUser(changed)
				}
			},
			expectedStatus: http.StatusConflict, expectedBody: errorBody(staleCFVerification),
			expectedCalls:           []userDependencyCall{findUserCall, {operation: updateCFHandleOperation, userID: testUserHandlerID, cfHandle: testUpdatedCFHandle, cfVerifiedHandle: testUpdatedCFHandle}},
			expectedHistoricHandles: []string{testOriginalCFHandle},
			assertState:             expectUserAndToken(changedProofUser, "", false),
		},
		validationCase("handle update rejects missing handle", http.MethodPut, testCFHandlePath, `{}`, invalidRequest),
		{
			name: "handle update rejects whitespace", method: http.MethodPut, path: testCFHandlePath, body: `{"cf_handle":" "}`,
			expectedStatus: http.StatusBadRequest, expectedBody: errorBody(invalidRequest), expectedCalls: []userDependencyCall{findUserCall},
		},
		{
			name: "handle update rejects multiple accounts", method: http.MethodPut, path: testCFHandlePath, body: `{"cf_handle":"tourist;Petr"}`,
			expectedStatus: http.StatusBadRequest, expectedBody: errorBody(invalidRequest), expectedCalls: []userDependencyCall{findUserCall},
		},
		{
			name: "verification rejects a concurrent selected handle change", method: http.MethodGet, path: testVerifyTokenPath,
			setup: seedTokenSetup(testStoredVerificationToken),
			setupProvider: func(provider *testutil.CodeforcesProviderMock, state *mockUserState) {
				provider.BeforeVerification = func() {
					changed := state.users[testUserHandlerID]
					changed.CFHandle = testUpdatedCFHandle
					state.storeUser(changed)
				}
			},
			expectedStatus: http.StatusConflict, expectedBody: errorBody(staleCFVerification),
			expectedCalls: []userDependencyCall{findUserCall, verifyUserCall}, expectedVerificationHandles: expectedVerificationHandles,
			assertState: func(t *testing.T, state *mockUserState, tokens *users.VerificationTokenStore) {
				changed := state.users[testUserHandlerID]
				if changed.CFVerifiedHandle != "" || changed.IsCFVerified() || changed.CFHandle != testUpdatedCFHandle {
					t.Fatalf("stale verification changed user: %+v", changed)
				}
				if token, found := tokens.GetToken(testUserHandlerID, testOriginalCFHandle); !found || token != testStoredVerificationToken {
					t.Fatal("stale verification removed token")
				}
			},
		},
		{
			name: "verification cannot use another handle token", method: http.MethodGet, path: testVerifyTokenPath,
			setup: func(_ *mockUserState, tokens *users.VerificationTokenStore) {
				tokens.SetToken(testUserHandlerID, testUpdatedCFHandle, testStoredVerificationToken, time.Hour)
			},
			expectedStatus: http.StatusBadRequest, expectedBody: errorBody(invalidVerificationToken),
			expectedCalls: []userDependencyCall{findUserCall}, expectedVerificationHandles: expectedVerificationHandles,
		},
		{
			name: "verification rejects a concurrent verified handle change", method: http.MethodGet, path: testVerifyTokenPath,
			setup: seedTokenSetup(testStoredVerificationToken),
			setupProvider: func(provider *testutil.CodeforcesProviderMock, state *mockUserState) {
				provider.BeforeVerification = func() {
					changed := state.users[testUserHandlerID]
					changed.CFVerifiedHandle = testUpdatedCFHandle
					state.storeUser(changed)
				}
			},
			expectedStatus: http.StatusConflict, expectedBody: errorBody(staleCFVerification),
			expectedCalls: []userDependencyCall{findUserCall, verifyUserCall}, expectedVerificationHandles: expectedVerificationHandles,
		},
		// Verification token
		{
			name: "token endpoint creates and stores a token", method: http.MethodGet, path: testVerificationTokenPath,
			expectedStatus: http.StatusOK,
			expectedBody:   testutil.APIResponse{Token: testGeneratedVerificationToken},
			expectedCalls: []userDependencyCall{
				findUserCall,
				{operation: generateTokenOperation, tokenLength: 9},
			},
			assertState: expectUserAndToken(user, testGeneratedVerificationToken, true),
		},
		{
			name: "token endpoint reuses a stored token", method: http.MethodGet, path: testVerificationTokenPath,
			setup: seedTokenSetup(testStoredVerificationToken), expectedStatus: http.StatusOK,
			expectedBody:  testutil.APIResponse{Token: testStoredVerificationToken},
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
			expectedBody:                messageBody(userVerified),
			expectedCalls:               []userDependencyCall{findUserCall, verifyUserCall},
			expectedVerificationHandles: expectedVerificationHandles,
			assertState:                 expectUserAndToken(newlyVerifiedUser, "", false),
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
			expectedCalls:               []userDependencyCall{findUserCall},
			expectedVerificationHandles: expectedVerificationHandles,
			assertState:                 expectUserAndToken(user, testStoredVerificationToken, true),
		},
		{
			name: "verification rejects a missing token", method: http.MethodGet, path: testVerifyTokenPath,
			expectedStatus: http.StatusBadRequest, expectedBody: errorBody(invalidVerificationToken),
			expectedCalls:               []userDependencyCall{findUserCall},
			expectedVerificationHandles: expectedVerificationHandles,
			assertState:                 expectUserAndToken(user, "", false),
		},
		userNotFoundCase("verification returns not found", http.MethodGet, testVerifyTokenPath, "", findUserCall),
		userReadFailureCase("verification handles lookup failure", http.MethodGet, testVerifyTokenPath, "", findUserCall),
		providerErrorCase("verification handles request creation failure", users.ErrCodeforcesRequestCreation,
			http.StatusInternalServerError, failedToCreateCodeforcesRequest, findUserCall),
		providerErrorCase("verification handles request failure", users.ErrCodeforcesRequest,
			http.StatusInternalServerError, failedToCallCodeforces, findUserCall),
		providerErrorCase("verification handles rejected response", users.ErrCodeforcesRejectedResponse,
			http.StatusBadGateway, codeforcesRequestFailed, findUserCall),
		providerErrorCase("verification handles invalid response", users.ErrCodeforcesInvalidResponse,
			http.StatusBadGateway, failedToParseCodeforcesResponse, findUserCall),
		providerErrorCase("verification handles a missing Codeforces user", users.ErrCodeforcesUserNotFound,
			http.StatusBadRequest, codeforcesUserNotFound, findUserCall),
		providerErrorCase("verification handles an unknown provider failure", testUserDependencyFailure,
			http.StatusInternalServerError, failedToCallCodeforces, findUserCall),
		{
			name: "verification retains the token when persistence fails", method: http.MethodGet, path: testVerifyTokenPath,
			setup: combineSetups(
				seedTokenSetup(testStoredVerificationToken),
				operationFailureSetup(updateCFVerifiedHandleOperation, testUserDependencyFailure),
			),
			expectedStatus: http.StatusInternalServerError, expectedBody: errorBody(failedToVerifyUser),
			expectedCalls:               []userDependencyCall{findUserCall, verifyUserCall},
			expectedVerificationHandles: expectedVerificationHandles,
			assertState:                 expectUserAndToken(user, testStoredVerificationToken, true),
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			state := newMockUserState()
			tokens := users.NewVerificationTokenStore()
			if testCase.setup != nil {
				testCase.setup(state, tokens)
			}
			api, codeforcesProvider := newUserHandlerTestAPI(state, tokens)
			if testCase.setupProvider != nil {
				testCase.setupProvider(codeforcesProvider, state)
			}
			router := newUserHandlerTestRouter(api)

			state.expectedContext = t.Context()
			response := performUserRequest(t.Context(), router, testCase.method, testCase.path, testCase.body)

			assertResponseStatus(t, response, testCase.expectedStatus)
			assertJSONBody(t, response, testCase.expectedBody)
			if state.contextMismatch {
				t.Fatal("repository did not receive the HTTP request context")
			}
			if !slices.Equal(state.calls, testCase.expectedCalls) {
				t.Fatalf("dependency calls = %+v, want %+v", state.calls, testCase.expectedCalls)
			}
			if !slices.Equal(codeforcesProvider.VerificationHandles, testCase.expectedVerificationHandles) {
				t.Fatalf(
					"Codeforces verification handles = %v, want %v",
					codeforcesProvider.VerificationHandles,
					testCase.expectedVerificationHandles,
				)
			}
			if !slices.Equal(codeforcesProvider.HistoricHandles, testCase.expectedHistoricHandles) {
				t.Fatalf("historic handles = %v, want %v", codeforcesProvider.HistoricHandles, testCase.expectedHistoricHandles)
			}
			if testCase.assertState != nil {
				testCase.assertState(t, state, tokens)
			}
		})
	}
}

// Test case builders
func validationCase(name string, method string, path string, body string, message users.API_MESSAGE) userHandlerTestCase {
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
	expectedMessage users.API_MESSAGE,
	expectedCall userDependencyCall,
) userHandlerTestCase {
	return userHandlerTestCase{
		name: name, method: http.MethodGet, path: testVerifyTokenPath,
		setup:          operationFailureSetup(getVerificationValueOperation, fmt.Errorf("provider failure: %w", providerError)),
		expectedStatus: expectedStatus, expectedBody: errorBody(expectedMessage),
		expectedCalls:               []userDependencyCall{expectedCall},
		expectedVerificationHandles: []string{testOriginalCFHandle},
	}
}

// HTTP test setup
func newUserHandlerTestAPI(
	state *mockUserState,
	tokens *users.VerificationTokenStore,
) (*users.API, *testutil.CodeforcesProviderMock) {
	codeforcesProvider := testutil.NewCodeforcesProviderMock(state.verificationValue)
	codeforcesProvider.VerificationError = state.operationErrors[getVerificationValueOperation]
	api := users.NewAPI(mockUserRepository{state}, tokens, codeforcesProvider, users.WithVerificationTokenGenerator(func(length int) (string, error) {
		state.record(userDependencyCall{operation: generateTokenOperation, tokenLength: length})
		if err := state.operationErrors[generateTokenOperation]; err != nil {
			return "", err
		}
		return testGeneratedVerificationToken, nil
	}))
	return api, codeforcesProvider
}

func newUserHandlerTestRouter(api *users.API) *gin.Engine {
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

func performUserRequest(ctx context.Context, router *gin.Engine, method string, path string, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequestWithContext(ctx, method, path, strings.NewReader(body))
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

func messageBody(message users.API_MESSAGE) testutil.APIResponse {
	return testutil.APIResponse{Message: string(message)}
}

func errorBody(message users.API_MESSAGE) testutil.APIResponse {
	return testutil.APIResponse{Error: string(message)}
}

// Scenario setup and state assertions
func combineSetups(setups ...func(*mockUserState, *users.VerificationTokenStore)) func(*mockUserState, *users.VerificationTokenStore) {
	return func(state *mockUserState, tokens *users.VerificationTokenStore) {
		for _, setup := range setups {
			setup(state, tokens)
		}
	}
}

func storeUserSetup(user users.User) func(*mockUserState, *users.VerificationTokenStore) {
	return func(state *mockUserState, _ *users.VerificationTokenStore) { state.storeUser(user) }
}

func seedTokenSetup(token string) func(*mockUserState, *users.VerificationTokenStore) {
	return func(_ *mockUserState, tokens *users.VerificationTokenStore) {
		tokens.SetToken(testUserHandlerID, testOriginalCFHandle, token, time.Hour)
	}
}

func verificationValueSetup(value string) func(*mockUserState, *users.VerificationTokenStore) {
	return func(state *mockUserState, _ *users.VerificationTokenStore) { state.verificationValue = value }
}

func operationFailureSetup(operation userDependencyOperation, err error) func(*mockUserState, *users.VerificationTokenStore) {
	return func(state *mockUserState, _ *users.VerificationTokenStore) { state.operationErrors[operation] = err }
}

func clearUsersSetup(state *mockUserState, _ *users.VerificationTokenStore) {
	state.users = map[int64]users.User{}
}

func expectUserAndToken(expectedUser users.User, expectedToken string, expectedTokenFound bool) func(*testing.T, *mockUserState, *users.VerificationTokenStore) {
	return func(t *testing.T, state *mockUserState, tokens *users.VerificationTokenStore) {
		t.Helper()
		actualUser, found := state.users[expectedUser.ID]
		if !found || actualUser != expectedUser {
			t.Fatalf("stored user = %+v, %v; want %+v, true", actualUser, found, expectedUser)
		}
		actualToken, tokenFound := tokens.GetToken(expectedUser.ID, expectedUser.CFHandle)
		if actualToken != expectedToken || tokenFound != expectedTokenFound {
			t.Fatalf("stored token = %q, %v; want %q, %v", actualToken, tokenFound, expectedToken, expectedTokenFound)
		}
	}
}

// Fixtures
func newUserHandlerFixture() users.User {
	return users.User{
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
	findUserOperation               userDependencyOperation = "find user"
	updateCFHandleOperation         userDependencyOperation = "update CF handle"
	updateCFVerifiedHandleOperation userDependencyOperation = "update CF verification"
	getVerificationValueOperation   userDependencyOperation = "get verification value"
	generateTokenOperation          userDependencyOperation = "generate token"
)

type userDependencyCall struct {
	operation        userDependencyOperation
	userID           int64
	cfHandle         string
	cfVerifiedHandle string
	tokenLength      int
}

type mockUserState struct {
	users             map[int64]users.User
	verificationValue string
	operationErrors   map[userDependencyOperation]error
	calls             []userDependencyCall
	expectedContext   context.Context
	contextMismatch   bool
}

func newMockUserState() *mockUserState {
	state := &mockUserState{
		users:             map[int64]users.User{},
		verificationValue: testStoredVerificationToken,
		operationErrors:   map[userDependencyOperation]error{},
	}
	state.storeUser(newUserHandlerFixture())
	return state
}

type mockUserRepository struct{ *mockUserState }

func (repository mockUserRepository) FindByID(ctx context.Context, userID int64) (*users.User, error) {
	repository.contextMismatch = repository.contextMismatch || ctx != repository.expectedContext
	repository.record(userDependencyCall{operation: findUserOperation, userID: userID})
	if err := repository.operationErrors[findUserOperation]; err != nil {
		return nil, err
	}
	user, found := repository.users[userID]
	if !found {
		return nil, users.ErrUserNotFound
	}
	return &user, nil
}

func (repository mockUserRepository) UpdateCFHandle(ctx context.Context, user *users.User, cfHandle string, verifiedHandle string) error {
	repository.contextMismatch = repository.contextMismatch || ctx != repository.expectedContext
	repository.record(userDependencyCall{operation: updateCFHandleOperation, userID: user.ID, cfHandle: cfHandle, cfVerifiedHandle: verifiedHandle})
	if err := repository.operationErrors[updateCFHandleOperation]; err != nil {
		return err
	}
	storedUser, found := repository.users[user.ID]
	if !found || storedUser.CFHandle != user.CFHandle || storedUser.CFVerifiedHandle != user.CFVerifiedHandle {
		return users.ErrCFHandleChanged
	}
	storedUser.CFHandle = cfHandle
	storedUser.CFVerifiedHandle = verifiedHandle
	repository.storeUser(storedUser)
	*user = storedUser
	return nil
}

func (repository mockUserRepository) UpdateCFVerifiedHandle(ctx context.Context, user *users.User, verifiedHandle string) error {
	repository.contextMismatch = repository.contextMismatch || ctx != repository.expectedContext
	repository.record(userDependencyCall{operation: updateCFVerifiedHandleOperation, userID: user.ID, cfVerifiedHandle: verifiedHandle})
	if err := repository.operationErrors[updateCFVerifiedHandleOperation]; err != nil {
		return err
	}
	storedUser, found := repository.users[user.ID]
	if !found || storedUser.CFHandle != user.CFHandle || storedUser.CFVerifiedHandle != user.CFVerifiedHandle {
		return users.ErrCFHandleChanged
	}
	storedUser.CFVerifiedHandle = verifiedHandle
	repository.storeUser(storedUser)
	*user = storedUser
	return nil
}

func (state *mockUserState) record(call userDependencyCall) {
	state.calls = append(state.calls, call)
}

func (state *mockUserState) storeUser(user users.User) {
	state.users[user.ID] = user
}
