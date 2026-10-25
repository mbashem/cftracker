package app

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/auth"
	"github.com/mbashem/cftracker/backend/internal/health"
	"github.com/mbashem/cftracker/backend/internal/lists"
	"github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/ratelimit"
	"github.com/mbashem/cftracker/backend/internal/routes"
	"github.com/mbashem/cftracker/backend/internal/users"
)

func newDependencies(config configs.Config, database *sql.DB) (routes.Dependencies, error) {
	rateLimits, err := newRateLimits(config)
	if err != nil {
		return routes.Dependencies{}, fmt.Errorf("invalid rate limits: %w", err)
	}

	providerHTTPClient := &http.Client{Timeout: config.ExternalAPITimeout}
	githubProvider := auth.NewGitHubClient(
		auth.NewOAuthConfig(config.GitHubClientID, config.GitHubClientSecret, config.GitHubRedirectURL),
		providerHTTPClient,
		config.ExternalAPITimeout,
	)
	codeforcesProvider := users.NewCodeforcesClient(providerHTTPClient, config.ExternalAPITimeout)
	userRepository := users.NewRepository(database, config.DatabaseTimeout)

	return routes.Dependencies{
		Health: health.NewAPI(database),
		Auth:   auth.NewAuthHandler(githubProvider, userRepository),
		Users: users.NewAPI(userRepository, users.NewVerificationTokenStore(), codeforcesProvider,
			users.WithRateLimits(rateLimits)),
		Lists: lists.NewAPI(lists.NewRepository(database, config.DatabaseTimeout),
			items.NewRepository(database, config.DatabaseTimeout)),
		RateLimits: rateLimits,
	}, nil
}

func newRateLimits(config configs.Config) (*ratelimit.Service, error) {
	limitConfig := ratelimit.DefaultConfig()
	limitConfig.GeneralPerMinute = config.APIRatePerMinute
	limitConfig.WritePerMinute = config.WriteRatePerMinute
	limitConfig.AuthPerMinute = config.AuthRatePerMinute
	limitConfig.CodeforcesCooldown = config.CodeforcesCooldown
	return ratelimit.New(limitConfig)
}
