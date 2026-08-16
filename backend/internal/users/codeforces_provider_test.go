package users

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"testing"
	"time"

	"github.com/mbashem/cftracker/backend/internal/testutil"
)

const (
	testCodeforcesProviderHandle            = "tourist +&?/="
	testCodeforcesProviderVerificationValue = "verification-token"
)

var testCodeforcesProviderTransportFailure = errors.New("codeforces transport unavailable")

type codeforcesProviderResponseTestCase struct {
	name           string
	status         int
	body           string
	responseError  error
	expectedValue  string
	expectedErrors []error
}

// Provider responses.

func TestCodeforcesClientGetVerificationValue(t *testing.T) {
	testCases := []codeforcesProviderResponseTestCase{
		{
			name: "escaped handle response is decoded", status: http.StatusOK,
			body:          `{"status":"OK","result":[{"firstName":"verification-token"}]}`,
			expectedValue: testCodeforcesProviderVerificationValue,
		},
		{
			name: "rejected response returns its sentinel", status: http.StatusTooManyRequests, body: `{}`,
			expectedErrors: []error{ErrCodeforcesRejectedResponse},
		},
		{
			name: "malformed response returns its sentinel", status: http.StatusOK, body: `{`,
			expectedErrors: []error{ErrCodeforcesInvalidResponse},
		},
		{
			name: "empty result returns user not found", status: http.StatusOK, body: `{"status":"OK","result":[]}`,
			expectedErrors: []error{ErrCodeforcesUserNotFound},
		},
		{
			name: "transport failure preserves both errors", responseError: testCodeforcesProviderTransportFailure,
			expectedErrors: []error{ErrCodeforcesRequest, testCodeforcesProviderTransportFailure},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			requestObserved := false
			providerRoundTrip := testutil.RoundTripFunc(func(request *http.Request) (*http.Response, error) {
				if testCase.responseError != nil {
					return nil, testCase.responseError
				}
				return testutil.NewJSONResponse(request, testCase.status, testCase.body), nil
			})
			client := NewCodeforcesClient(
				newCodeforcesProviderHTTPClient(t, testCodeforcesProviderHandle, &requestObserved, providerRoundTrip),
				time.Second,
			)
			value, err := client.GetVerificationValue(context.Background(), testCodeforcesProviderHandle)

			assertCodeforcesProviderResult(t, value, err, testCase.expectedValue, testCase.expectedErrors)
			if !requestObserved {
				t.Fatal("HTTP request was not observed")
			}
		})
	}
}

// Context propagation.

func TestCodeforcesClientGetVerificationValueContextFailures(t *testing.T) {
	testCases := []struct {
		name          string
		timeout       time.Duration
		cancelContext bool
		expectedError error
	}{
		{name: "provider timeout is preserved", timeout: 0, expectedError: context.DeadlineExceeded},
		{name: "request cancellation is preserved", timeout: time.Second, cancelContext: true, expectedError: context.Canceled},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			if testCase.cancelContext {
				cancel()
			}
			requestObserved := false
			client := NewCodeforcesClient(
				newCodeforcesProviderHTTPClient(
					t, testCodeforcesProviderHandle, &requestObserved, testutil.RoundTripContextError,
				),
				testCase.timeout,
			)

			value, err := client.GetVerificationValue(ctx, testCodeforcesProviderHandle)

			assertCodeforcesProviderResult(
				t, value, err, "", []error{ErrCodeforcesRequest, testCase.expectedError},
			)
		})
	}
}

// Test setup and assertions.

func newCodeforcesProviderHTTPClient(
	t *testing.T,
	expectedHandle string,
	requestObserved *bool,
	providerRoundTrip testutil.RoundTripFunc,
) *http.Client {
	t.Helper()
	return &http.Client{Transport: testutil.RoundTripFunc(func(request *http.Request) (*http.Response, error) {
		*requestObserved = true
		expectedRawQuery := "handles=" + url.QueryEscape(expectedHandle)
		if request.Method != http.MethodGet || request.URL.Scheme != "https" || request.URL.Host != "codeforces.com" ||
			request.URL.Path != "/api/user.info" || request.URL.RawQuery != expectedRawQuery {
			t.Errorf("Codeforces request = %s %q", request.Method, request.URL.String())
		}
		if request.URL.Query().Get("handles") != expectedHandle || len(request.URL.Query()) != 1 {
			t.Errorf("Codeforces request query = %v", request.URL.Query())
		}
		if contentType := request.Header.Get("Content-Type"); contentType != "application/json" {
			t.Errorf("Codeforces request Content-Type = %q", contentType)
		}
		return providerRoundTrip(request)
	})}
}

func assertCodeforcesProviderResult(
	t *testing.T,
	actualValue string,
	actualError error,
	expectedValue string,
	expectedErrors []error,
) {
	t.Helper()
	if len(expectedErrors) == 0 {
		if actualError != nil {
			t.Fatalf("GetVerificationValue() error = %v", actualError)
		}
		if actualValue != expectedValue {
			t.Fatalf("GetVerificationValue() = %q, want %q", actualValue, expectedValue)
		}
		return
	}
	if actualValue != "" {
		t.Fatalf("GetVerificationValue() = %q, want empty", actualValue)
	}
	for _, expectedError := range expectedErrors {
		if !errors.Is(actualError, expectedError) {
			t.Fatalf("GetVerificationValue() error = %v, want errors.Is(..., %v)", actualError, expectedError)
		}
	}
}
