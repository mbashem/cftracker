package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"golang.org/x/oauth2"
)

const githubUserURL = "https://api.github.com/user"

var (
	ErrGitHubTokenExchange    = errors.New("github token exchange failed")
	ErrGitHubUserRequest      = errors.New("github user request failed")
	ErrGitHubRejectedResponse = errors.New("github rejected user request")
	ErrGitHubInvalidResponse  = errors.New("github returned an invalid user response")
)

type GitHubProvider interface {
	AuthorizationURL(state string) string
	Authenticate(context.Context, string) (*GitHubUser, error)
}

type GitHubClient struct {
	oauthConfig *oauth2.Config
	httpClient  *http.Client
	timeout     time.Duration
}

type GitHubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

func NewGitHubClient(oauthConfig *oauth2.Config, httpClient *http.Client, timeout time.Duration) *GitHubClient {
	return &GitHubClient{
		oauthConfig: oauthConfig,
		httpClient:  httpClient,
		timeout:     timeout,
	}
}

func (client *GitHubClient) AuthorizationURL(state string) string {
	return client.oauthConfig.AuthCodeURL(state)
}

func (client *GitHubClient) Authenticate(ctx context.Context, code string) (*GitHubUser, error) {
	providerContext, cancel := context.WithTimeout(ctx, client.timeout)
	defer cancel()

	providerContext = context.WithValue(providerContext, oauth2.HTTPClient, client.httpClient)
	token, err := client.oauthConfig.Exchange(providerContext, code)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrGitHubTokenExchange, err)
	}

	request, err := http.NewRequestWithContext(providerContext, http.MethodGet, githubUserURL, nil)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrGitHubUserRequest, err)
	}

	response, err := client.oauthConfig.Client(providerContext, token).Do(request)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrGitHubUserRequest, err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: status %d", ErrGitHubRejectedResponse, response.StatusCode)
	}

	var user GitHubUser
	if err := json.NewDecoder(response.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("%w: %w", ErrGitHubInvalidResponse, err)
	}

	return &user, nil
}
