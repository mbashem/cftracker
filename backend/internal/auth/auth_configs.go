package auth

import (
	"github.com/mbashem/cftracker/backend/configs"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

func NewOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     configs.GetEnv(configs.GITHUB_CLIENT_ID),
		ClientSecret: configs.GetEnv(configs.GITHUB_CLIENT_SECRET),
		RedirectURL:  configs.GetEnv(configs.GITHUB_REDIRECT_URL),
		Scopes:       []string{"user:email"},
		Endpoint:     github.Endpoint,
	}
}
