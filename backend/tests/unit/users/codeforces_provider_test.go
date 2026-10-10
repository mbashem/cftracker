package users_test

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"testing"
	"time"

	"github.com/mbashem/cftracker/backend/internal/users"
	testutil "github.com/mbashem/cftracker/backend/tests/support"
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
			body:          fmt.Sprintf(`{"status":"OK","result":[{"handle":%q,"firstName":"verification-token"}]}`, testCodeforcesProviderHandle),
			expectedValue: testCodeforcesProviderVerificationValue,
		},
		{
			name: "rejected response returns its sentinel", status: http.StatusTooManyRequests, body: `{}`,
			expectedErrors: []error{users.ErrCodeforcesRejectedResponse},
		},
		{
			name: "malformed response returns its sentinel", status: http.StatusOK, body: `{`,
			expectedErrors: []error{users.ErrCodeforcesInvalidResponse},
		},
		{
			name: "empty result returns user not found", status: http.StatusOK, body: `{"status":"OK","result":[]}`,
			expectedErrors: []error{users.ErrCodeforcesUserNotFound},
		},
		{name: "historic alias cannot verify a different current handle", status: http.StatusOK, body: `{"status":"OK","result":[{"handle":"another","firstName":"verification-token"}]}`, expectedErrors: []error{users.ErrCodeforcesInvalidResponse}},
		{name: "missing handle is rejected", status: http.StatusOK, body: `{"status":"OK","result":[{"firstName":"verification-token"}]}`, expectedErrors: []error{users.ErrCodeforcesInvalidResponse}},
		{name: "multiple accounts are rejected", status: http.StatusOK, body: `{"status":"OK","result":[{"handle":"tourist"},{"handle":"Petr"}]}`, expectedErrors: []error{users.ErrCodeforcesInvalidResponse}},
		{name: "failed API status is rejected", status: http.StatusOK, body: `{"status":"FAILED","result":[]}`, expectedErrors: []error{users.ErrCodeforcesInvalidResponse}},
		{
			name: "transport failure preserves both errors", responseError: testCodeforcesProviderTransportFailure,
			expectedErrors: []error{users.ErrCodeforcesRequest, testCodeforcesProviderTransportFailure},
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
			client := users.NewCodeforcesClient(
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
			client := users.NewCodeforcesClient(
				newCodeforcesProviderHTTPClient(
					t, testCodeforcesProviderHandle, &requestObserved, testutil.RoundTripContextError,
				),
				testCase.timeout,
			)

			value, err := client.GetVerificationValue(ctx, testCodeforcesProviderHandle)

			assertCodeforcesProviderResult(
				t, value, err, "", []error{users.ErrCodeforcesRequest, testCase.expectedError},
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
		expectedRawQuery := "handles=" + url.QueryEscape(expectedHandle) + "&checkHistoricHandles=false"
		if request.Method != http.MethodGet || request.URL.Scheme != "https" || request.URL.Host != "codeforces.com" ||
			request.URL.Path != "/api/user.info" || request.URL.RawQuery != expectedRawQuery {
			t.Errorf("Codeforces request = %s %q", request.Method, request.URL.String())
		}
		if request.URL.Query().Get("handles") != expectedHandle || len(request.URL.Query()) != 2 {
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

func TestCodeforcesClientResolvesHistoricalHandle(t *testing.T) {
	for _, testCase := range []struct {
		name, body, expectedHandle string
		expectedError              error
	}{
		{name: "old handle resolves to renamed account", body: `{"status":"OK","result":[{"handle":"NewHandle"}]}`, expectedHandle: "NewHandle"},
		{name: "invalid response preserves error", body: `{`, expectedError: users.ErrCodeforcesInvalidResponse},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			client := users.NewCodeforcesClient(&http.Client{Transport: testutil.RoundTripFunc(func(request *http.Request) (*http.Response, error) {
				if request.URL.Query().Get("handles") != "OldHandle" || request.URL.Query().Get("checkHistoricHandles") != "true" {
					t.Fatalf("historical lookup query = %v", request.URL.Query())
				}
				return testutil.NewJSONResponse(request, http.StatusOK, testCase.body), nil
			})}, time.Second)
			handle, err := client.GetCurrentHandle(context.Background(), "OldHandle")
			if handle != testCase.expectedHandle || !errors.Is(err, testCase.expectedError) {
				t.Fatalf("GetCurrentHandle = %q, %v", handle, err)
			}
		})
	}
}
