package auth

import (
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

func NewOAuthConfig(clientID string, clientSecret string, redirectURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"user:email"},
		Endpoint:     github.Endpoint,
	}
}
