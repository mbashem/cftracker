//go:build integration

package users_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
	"github.com/mbashem/cftracker/backend/internal/users"
	testutil "github.com/mbashem/cftracker/backend/tests/support"
)

func TestCodeforcesOwnershipWorkflowIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := testutil.OpenTestDB(t)
	repository := users.NewRepository(database, configs.DefaultDatabaseTimeout)
	const originalHandle = "tourist"
	const newHandle = "RenamedTourist"
	const token = "ownership-proof"

	for _, testCase := range []struct {
		name             string
		verifiedHandle   string
		method           string
		path             string
		body             string
		currentHandle    string
		providerError    error
		concurrentHandle string
		expectedStatus   int
		expectedHandle   string
		expectedVerified string
	}{
		{
			name: "ownership challenge stores the checked handle", method: http.MethodGet, path: "/verify-cftoken",
			expectedStatus: http.StatusOK, expectedHandle: originalHandle, expectedVerified: originalHandle,
		},
		{
			name: "old ownership proof cannot verify a concurrently selected account", method: http.MethodGet, path: "/verify-cftoken",
			concurrentHandle: newHandle, expectedStatus: http.StatusConflict, expectedHandle: newHandle,
		},
		{
			name: "historical lookup preserves ownership through a rename", verifiedHandle: originalHandle,
			method: http.MethodPut, path: "/cfhandle", body: `{"cf_handle":"RenamedTourist"}`,
			currentHandle: newHandle, expectedStatus: http.StatusOK, expectedHandle: newHandle, expectedVerified: newHandle,
		},
		{
			name: "different account keeps the old proof and requires verification", verifiedHandle: originalHandle,
			method: http.MethodPut, path: "/cfhandle", body: `{"cf_handle":"RenamedTourist"}`,
			currentHandle: originalHandle, expectedStatus: http.StatusOK, expectedHandle: newHandle, expectedVerified: originalHandle,
		},
		{
			name: "failed rename lookup leaves the verified connection unchanged", verifiedHandle: originalHandle,
			method: http.MethodPut, path: "/cfhandle", body: `{"cf_handle":"RenamedTourist"}`,
			providerError: users.ErrCodeforcesRequest, expectedStatus: http.StatusInternalServerError,
			expectedHandle: originalHandle, expectedVerified: originalHandle,
		},
		{
			name: "concurrent account switch rejects a resolved rename", verifiedHandle: originalHandle,
			method: http.MethodPut, path: "/cfhandle", body: `{"cf_handle":"RenamedTourist"}`,
			currentHandle: newHandle, concurrentHandle: "Petr", expectedStatus: http.StatusConflict,
			expectedHandle: "Petr", expectedVerified: originalHandle,
		},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			testutil.ResetTestDB(t, database)
			user := integrationUserFixture(integrationUserGitHubID)
			user.CFVerifiedHandle = testCase.verifiedHandle
			if err := repository.Save(t.Context(), &user); err != nil {
				t.Fatal(err)
			}
			provider := testutil.NewCodeforcesProviderMock(token)
			provider.CurrentHandle = testCase.currentHandle
			provider.CurrentHandleError = testCase.providerError
			if testCase.concurrentHandle != "" {
				changeHandle := func() {
					concurrent := user
					if err := repository.UpdateCFHandle(t.Context(), &concurrent, testCase.concurrentHandle, concurrent.CFVerifiedHandle); err != nil {
						t.Fatal(err)
					}
				}
				provider.BeforeVerification = changeHandle
				provider.BeforeHistoricLookup = changeHandle
			}
			tokens := users.NewVerificationTokenStore()
			tokens.SetToken(user.ID, originalHandle, token, time.Hour)
			api := users.NewAPI(repository, tokens, provider)
			router := gin.New()
			router.Use(func(context *gin.Context) {
				context.Set(middlewares.UserIdKey, user.ID)
				context.Next()
			})
			router.GET("/verify-cftoken", api.VerifyCFVerificationToken)
			router.PUT("/cfhandle", api.UpdateCFHandle)
			response := httptest.NewRecorder()
			request := httptest.NewRequest(testCase.method, testCase.path, strings.NewReader(testCase.body))
			request.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(response, request)
			if response.Code != testCase.expectedStatus {
				t.Fatalf("status = %d, want %d: %s", response.Code, testCase.expectedStatus, response.Body.String())
			}
			stored, err := repository.FindByID(t.Context(), user.ID)
			if err != nil {
				t.Fatal(err)
			}
			if stored.CFHandle != testCase.expectedHandle || stored.CFVerifiedHandle != testCase.expectedVerified {
				t.Fatalf("stored handles = %q, %q", stored.CFHandle, stored.CFVerifiedHandle)
			}
			expectedVerified := testCase.expectedVerified != "" && testCase.expectedHandle == testCase.expectedVerified
			if stored.IsCFVerified() != expectedVerified {
				t.Fatalf("IsCFVerified() = %v, want %v", stored.IsCFVerified(), expectedVerified)
			}
		})
	}
}
