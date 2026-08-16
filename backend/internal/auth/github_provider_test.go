package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/mbashem/cftracker/backend/internal/testutil"
	"golang.org/x/oauth2"
)

const (
	testGitHubProviderTokenURL     = "https://github.test/login/oauth/access_token"
	testGitHubProviderRedirectURL  = "https://cftracker.test/auth/github/callback"
	testGitHubProviderClientID     = "test-client-id"
	testGitHubProviderClientSecret = "test-client-secret"
	testGitHubProviderAccessToken  = "test-access-token"
	testGitHubProviderEscapedState = "state +&?/="
)

var testGitHubProviderTransportFailure = errors.New("github transport unavailable")

type githubProviderResponseTestCase struct {
	name           string
	status         int
	body           string
	responseError  error
	expectedUser   *GitHubUser
	expectedErrors []error
}

// Authorization URL.

func TestGitHubClientAuthorizationURLEscapesState(t *testing.T) {
	client := NewGitHubClient(newGitHubProviderOAuthConfig(), &http.Client{}, time.Second)

	authorizationURL, err := url.Parse(client.AuthorizationURL(testGitHubProviderEscapedState))
	if err != nil {
		t.Fatalf("parse authorization URL: %v", err)
	}
	query := authorizationURL.Query()
	if authorizationURL.Scheme != "https" || authorizationURL.Host != "github.com" ||
		authorizationURL.Path != "/login/oauth/authorize" {
		t.Fatalf("authorization URL = %q", authorizationURL.String())
	}
	if query.Get("client_id") != testGitHubProviderClientID || query.Get("redirect_uri") != testGitHubProviderRedirectURL ||
		query.Get("response_type") != "code" || query.Get("scope") != "user:email" ||
		query.Get("state") != testGitHubProviderEscapedState {
		t.Fatalf("authorization query = %v", query)
	}
	if !strings.Contains(authorizationURL.RawQuery, "state="+url.QueryEscape(testGitHubProviderEscapedState)) {
		t.Fatalf("authorization raw query = %q, want escaped state", authorizationURL.RawQuery)
	}
}

// Authentication responses.

func TestGitHubClientAuthenticate(t *testing.T) {
	expectedUser := newGitHubUserFixture()
	encodedUser, err := json.Marshal(expectedUser)
	if err != nil {
		t.Fatalf("encode GitHub user fixture: %v", err)
	}
	testCases := []githubProviderResponseTestCase{
		{
			name: "successful response is decoded", status: http.StatusOK, body: string(encodedUser),
			expectedUser: &expectedUser,
		},
		{
			name: "rejected response returns its sentinel", status: http.StatusForbidden, body: `{}`,
			expectedErrors: []error{ErrGitHubRejectedResponse},
		},
		{
			name: "malformed response returns its sentinel", status: http.StatusOK, body: `{`,
			expectedErrors: []error{ErrGitHubInvalidResponse},
		},
		{
			name: "transport failure preserves both errors", responseError: testGitHubProviderTransportFailure,
			expectedErrors: []error{ErrGitHubUserRequest, testGitHubProviderTransportFailure},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			userRoundTrip := testutil.RoundTripFunc(func(request *http.Request) (*http.Response, error) {
				if testCase.responseError != nil {
					return nil, testCase.responseError
				}
				return testutil.NewJSONResponse(request, testCase.status, testCase.body), nil
			})
			client := NewGitHubClient(
				newGitHubProviderOAuthConfig(),
				newGitHubProviderHTTPClient(t, nil, userRoundTrip),
				time.Second,
			)
			user, err := client.Authenticate(context.Background(), testGitHubOAuthCode)

			assertGitHubProviderResult(t, user, err, testCase.expectedUser, testCase.expectedErrors)
		})
	}
}

func TestGitHubClientAuthenticateHandlesTokenExchangeFailure(t *testing.T) {
	tokenRoundTrip := testutil.RoundTripFunc(func(_ *http.Request) (*http.Response, error) {
		return nil, testGitHubProviderTransportFailure
	})
	client := NewGitHubClient(
		newGitHubProviderOAuthConfig(),
		newGitHubProviderHTTPClient(t, tokenRoundTrip, nil),
		time.Second,
	)

	user, err := client.Authenticate(context.Background(), testGitHubOAuthCode)

	assertGitHubProviderResult(t, user, err, nil, []error{ErrGitHubTokenExchange, testGitHubProviderTransportFailure})
}

// Context propagation.

func TestGitHubClientAuthenticateTimesOut(t *testing.T) {
	client := NewGitHubClient(
		newGitHubProviderOAuthConfig(),
		newGitHubProviderHTTPClient(t, testutil.RoundTripContextError, nil),
		0,
	)

	user, err := client.Authenticate(context.Background(), testGitHubOAuthCode)

	assertGitHubProviderResult(t, user, err, nil, []error{ErrGitHubTokenExchange, context.DeadlineExceeded})
}

func TestGitHubClientAuthenticatePropagatesCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	userRoundTrip := testutil.RoundTripFunc(func(request *http.Request) (*http.Response, error) {
		cancel()
		return testutil.RoundTripContextError(request)
	})
	client := NewGitHubClient(
		newGitHubProviderOAuthConfig(),
		newGitHubProviderHTTPClient(t, nil, userRoundTrip),
		time.Second,
	)

	user, err := client.Authenticate(ctx, testGitHubOAuthCode)

	assertGitHubProviderResult(t, user, err, nil, []error{ErrGitHubUserRequest, context.Canceled})
}

// Test setup and assertions.

func newGitHubProviderOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID: testGitHubProviderClientID, ClientSecret: testGitHubProviderClientSecret,
		RedirectURL: testGitHubProviderRedirectURL, Scopes: []string{"user:email"},
		Endpoint: oauth2.Endpoint{
			AuthURL: testGitHubAuthorization, TokenURL: testGitHubProviderTokenURL,
			AuthStyle: oauth2.AuthStyleInParams,
		},
	}
}

func newGitHubProviderHTTPClient(
	t *testing.T,
	tokenRoundTrip testutil.RoundTripFunc,
	userRoundTrip testutil.RoundTripFunc,
) *http.Client {
	t.Helper()
	return &http.Client{Transport: testutil.RoundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.String() {
		case testGitHubProviderTokenURL:
			if request.Method != http.MethodPost {
				t.Errorf("token request method = %s, want %s", request.Method, http.MethodPost)
			}
			if err := request.ParseForm(); err != nil {
				t.Errorf("parse token request: %v", err)
			} else if request.Form.Get("code") != testGitHubOAuthCode {
				t.Errorf("token request code = %q, want %q", request.Form.Get("code"), testGitHubOAuthCode)
			}
			if tokenRoundTrip != nil {
				return tokenRoundTrip(request)
			}
			body := fmt.Sprintf(`{"access_token":%q,"token_type":"bearer"}`, testGitHubProviderAccessToken)
			return testutil.NewJSONResponse(request, http.StatusOK, body), nil
		case githubUserURL:
			if request.Method != http.MethodGet {
				t.Errorf("user request method = %s, want %s", request.Method, http.MethodGet)
			}
			if authorization := request.Header.Get("Authorization"); authorization != "Bearer "+testGitHubProviderAccessToken {
				t.Errorf("user request authorization = %q", authorization)
			}
			if userRoundTrip == nil {
				return nil, errors.New("unexpected GitHub user request")
			}
			return userRoundTrip(request)
		default:
			return nil, fmt.Errorf("unexpected GitHub provider URL %q", request.URL.String())
		}
	})}
}

func assertGitHubProviderResult(
	t *testing.T,
	actualUser *GitHubUser,
	actualError error,
	expectedUser *GitHubUser,
	expectedErrors []error,
) {
	t.Helper()
	if expectedUser != nil {
		if actualError != nil {
			t.Fatalf("Authenticate() error = %v", actualError)
		}
		if actualUser == nil || *actualUser != *expectedUser {
			t.Fatalf("Authenticate() user = %+v, want %+v", actualUser, *expectedUser)
		}
		return
	}
	if actualUser != nil {
		t.Fatalf("Authenticate() user = %+v, want nil", actualUser)
	}
	for _, expectedError := range expectedErrors {
		if !errors.Is(actualError, expectedError) {
			t.Fatalf("Authenticate() error = %v, want errors.Is(..., %v)", actualError, expectedError)
		}
	}
}
