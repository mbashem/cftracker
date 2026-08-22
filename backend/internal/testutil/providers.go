package testutil

import (
	"context"
	"fmt"
	"net/url"
)

type GitHubProviderMock[User any] struct {
	AuthorizationBaseURL string
	UsersByCode          map[string]User
	AuthenticationError  error
	AuthorizationStates  []string
	AuthenticationCodes  []string
}

func NewGitHubProviderMock[User any](authorizationBaseURL string, usersByCode map[string]User) *GitHubProviderMock[User] {
	return &GitHubProviderMock[User]{
		AuthorizationBaseURL: authorizationBaseURL,
		UsersByCode:          usersByCode,
	}
}

func (provider *GitHubProviderMock[User]) AuthorizationURL(state string) string {
	provider.AuthorizationStates = append(provider.AuthorizationStates, state)
	authorizationURL, err := url.Parse(provider.AuthorizationBaseURL)
	if err != nil {
		panic(fmt.Sprintf("parse mock GitHub authorization URL: %v", err))
	}
	query := authorizationURL.Query()
	query.Set("state", state)
	authorizationURL.RawQuery = query.Encode()
	return authorizationURL.String()
}

func (provider *GitHubProviderMock[User]) Authenticate(ctx context.Context, code string) (*User, error) {
	provider.AuthenticationCodes = append(provider.AuthenticationCodes, code)
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if provider.AuthenticationError != nil {
		return nil, provider.AuthenticationError
	}
	user, found := provider.UsersByCode[code]
	if !found {
		return nil, fmt.Errorf("mock GitHub user for authorization code %q is not configured", code)
	}
	return &user, nil
}

type CodeforcesProviderMock struct {
	VerificationValue   string
	VerificationError   error
	VerificationHandles []string
}

func NewCodeforcesProviderMock(verificationValue string) *CodeforcesProviderMock {
	return &CodeforcesProviderMock{VerificationValue: verificationValue}
}

func (provider *CodeforcesProviderMock) GetVerificationValue(ctx context.Context, cfHandle string) (string, error) {
	provider.VerificationHandles = append(provider.VerificationHandles, cfHandle)
	if err := ctx.Err(); err != nil {
		return "", err
	}
	return provider.VerificationValue, provider.VerificationError
}
