package middlewares_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
	"github.com/mbashem/cftracker/backend/internal/utils"
)

const (
	testAuthenticationSecret          = "authentication-test-secret-with-enough-bytes"
	testDifferentAuthenticationSecret = "different-authentication-secret-with-enough-bytes"
	testProtectedEndpointPath         = "/protected"
	testBearerAuthorizationPrefix     = "Bearer "
	testErrorResponseKey              = "error"
	testUnauthorizedMessage           = "Unauthorized"
	testAuthenticatedUserID           = int64(42)
)

type protectedEndpointResponse struct {
	UserID int64 `json:"userId"`
}

func TestAuthenticate(t *testing.T) {
	validToken := signAuthenticationTestToken(
		t,
		testAuthenticationSecret,
		testAuthenticatedUserID,
		time.Now().Add(time.Hour),
	)
	tokenWithDifferentSignature := signAuthenticationTestToken(
		t,
		testDifferentAuthenticationSecret,
		testAuthenticatedUserID,
		time.Now().Add(time.Hour),
	)
	expiredToken := signAuthenticationTestToken(
		t,
		testAuthenticationSecret,
		testAuthenticatedUserID,
		time.Now().Add(-time.Hour),
	)
	tokenWithStringUserID := signAuthenticationTestToken(
		t,
		testAuthenticationSecret,
		"42",
		time.Now().Add(time.Hour),
	)

	testCases := []struct {
		name                  string
		authorizationHeader   string
		expectedStatus        int
		expectedEndpointCall  bool
		expectedContextUserID int64
	}{
		{
			name:           "missing authorization header is rejected",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:                "basic authorization scheme is rejected",
			authorizationHeader: "Basic " + validToken,
			expectedStatus:      http.StatusUnauthorized,
		},
		{
			name:                "bearer scheme without token is rejected",
			authorizationHeader: testBearerAuthorizationPrefix,
			expectedStatus:      http.StatusUnauthorized,
		},
		{
			name:                "malformed bearer token is rejected",
			authorizationHeader: testBearerAuthorizationPrefix + "not-a-valid-jwt",
			expectedStatus:      http.StatusUnauthorized,
		},
		{
			name:                "token signed with different secret is rejected",
			authorizationHeader: testBearerAuthorizationPrefix + tokenWithDifferentSignature,
			expectedStatus:      http.StatusUnauthorized,
		},
		{
			name:                "expired bearer token is rejected",
			authorizationHeader: testBearerAuthorizationPrefix + expiredToken,
			expectedStatus:      http.StatusUnauthorized,
		},
		{
			name:                "signed token with string userId is rejected",
			authorizationHeader: testBearerAuthorizationPrefix + tokenWithStringUserID,
			expectedStatus:      http.StatusUnauthorized,
		},
		{
			name:                  "valid bearer token reaches endpoint with exact userId",
			authorizationHeader:   testBearerAuthorizationPrefix + validToken,
			expectedStatus:        http.StatusOK,
			expectedEndpointCall:  true,
			expectedContextUserID: testAuthenticatedUserID,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			utils.Init(testAuthenticationSecret)

			endpointCalled := false
			router := newAuthenticationTestRouter(&endpointCalled)
			request := httptest.NewRequest(http.MethodGet, testProtectedEndpointPath, nil)
			if testCase.authorizationHeader != "" {
				request.Header.Set("Authorization", testCase.authorizationHeader)
			}
			responseRecorder := httptest.NewRecorder()

			router.ServeHTTP(responseRecorder, request)

			if responseRecorder.Code != testCase.expectedStatus {
				t.Fatalf("response status = %d, want %d", responseRecorder.Code, testCase.expectedStatus)
			}
			if endpointCalled != testCase.expectedEndpointCall {
				t.Fatalf("endpoint called = %t, want %t", endpointCalled, testCase.expectedEndpointCall)
			}

			if testCase.expectedEndpointCall {
				assertProtectedEndpointResponse(t, responseRecorder, testCase.expectedContextUserID)
				return
			}
			assertUnauthorizedResponse(t, responseRecorder)
		})
	}
}

func newAuthenticationTestRouter(endpointCalled *bool) *gin.Engine {
	router := gin.New()
	router.Use(middlewares.Authenticate)
	router.GET(testProtectedEndpointPath, func(context *gin.Context) {
		*endpointCalled = true

		contextUserID, exists := context.Get(middlewares.UserIdKey)
		if !exists {
			context.JSON(http.StatusInternalServerError, gin.H{testErrorResponseKey: "context userId is missing"})
			return
		}
		userID, isInt64 := contextUserID.(int64)
		if !isInt64 {
			context.JSON(http.StatusInternalServerError, gin.H{testErrorResponseKey: "context userId is not int64"})
			return
		}

		context.JSON(http.StatusOK, protectedEndpointResponse{UserID: userID})
	})
	return router
}

func signAuthenticationTestToken(t *testing.T, secret string, userID any, expiresAt time.Time) string {
	t.Helper()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userID,
		"exp":    expiresAt.Unix(),
	})
	signedToken, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("SignedString() error = %v", err)
	}
	return signedToken
}

func assertProtectedEndpointResponse(t *testing.T, responseRecorder *httptest.ResponseRecorder, expectedUserID int64) {
	t.Helper()

	var response protectedEndpointResponse
	if err := json.Unmarshal(responseRecorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode protected endpoint response: %v", err)
	}
	if response.UserID != expectedUserID {
		t.Fatalf("response userId = %d, want %d", response.UserID, expectedUserID)
	}
}

func assertUnauthorizedResponse(t *testing.T, responseRecorder *httptest.ResponseRecorder) {
	t.Helper()

	var response map[string]string
	if err := json.Unmarshal(responseRecorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode unauthorized response: %v", err)
	}
	if len(response) != 1 || response[testErrorResponseKey] != testUnauthorizedMessage {
		t.Fatalf("unauthorized response = %v, want error %q", response, testUnauthorizedMessage)
	}
}
