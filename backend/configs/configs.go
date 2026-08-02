package configs

import (
	"errors"
	"fmt"
	"log"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type EnvKey string

const (
	GITHUB_CLIENT_ID     EnvKey = "GITHUB_CLIENT_ID"
	GITHUB_CLIENT_SECRET EnvKey = "GITHUB_CLIENT_SECRET"
	GITHUB_REDIRECT_URL  EnvKey = "GITHUB_REDIRECT_URL"
	DATABASE_URL         EnvKey = "DATABASE_URL"
	JWT_SECRET           EnvKey = "JWT_SECRET"
	CORS_ALLOWED_ORIGINS EnvKey = "CORS_ALLOWED_ORIGINS"
	PORT                 EnvKey = "PORT"
	EXTERNAL_API_TIMEOUT EnvKey = "EXTERNAL_API_TIMEOUT"
)

const (
	DefaultExternalAPITimeout = 10 * time.Second
	DefaultPort               = 8080
	MinimumJWTSecretLength    = 32
)

type Config struct {
	GitHubClientID     string
	GitHubClientSecret string
	GitHubRedirectURL  string
	DatabaseURL        string
	JWTSecret          string
	CORSAllowedOrigins []string
	Port               int
	ExternalAPITimeout time.Duration
}

func Load() (Config, error) {
	if err := loadLocalEnv(); err != nil {
		return Config{}, err
	}

	config := Config{
		GitHubClientID:     getEnv(GITHUB_CLIENT_ID),
		GitHubClientSecret: getEnv(GITHUB_CLIENT_SECRET),
		GitHubRedirectURL:  getEnv(GITHUB_REDIRECT_URL),
		DatabaseURL:        getEnv(DATABASE_URL),
		JWTSecret:          getEnv(JWT_SECRET),
	}

	var validationErrors []error
	requireValue(GITHUB_CLIENT_ID, config.GitHubClientID, &validationErrors)
	requireValue(GITHUB_CLIENT_SECRET, config.GitHubClientSecret, &validationErrors)
	requireValue(GITHUB_REDIRECT_URL, config.GitHubRedirectURL, &validationErrors)
	requireValue(DATABASE_URL, config.DatabaseURL, &validationErrors)
	requireValue(JWT_SECRET, config.JWTSecret, &validationErrors)

	if config.JWTSecret != "" && len([]byte(config.JWTSecret)) < MinimumJWTSecretLength {
		validationErrors = append(validationErrors, fmt.Errorf(
			"%s must be at least %d bytes",
			JWT_SECRET,
			MinimumJWTSecretLength,
		))
	}

	if config.GitHubRedirectURL != "" {
		if err := validateHTTPURL(GITHUB_REDIRECT_URL, config.GitHubRedirectURL); err != nil {
			validationErrors = append(validationErrors, err)
		}
	}

	config.CORSAllowedOrigins = parseAllowedOrigins(getEnv(CORS_ALLOWED_ORIGINS))

	var err error
	config.Port, err = parsePort(getEnv(PORT))
	if err != nil {
		validationErrors = append(validationErrors, err)
	}

	config.ExternalAPITimeout, err = parseExternalAPITimeout(getEnv(EXTERNAL_API_TIMEOUT))
	if err != nil {
		validationErrors = append(validationErrors, err)
	}

	return config, errors.Join(validationErrors...)
}

func loadLocalEnv() error {
	if _, err := os.Stat(".env"); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return fmt.Errorf("inspect .env: %w", err)
	}

	if err := godotenv.Load(); err != nil {
		return fmt.Errorf("load .env: %w", err)
	}
	return nil
}

func getEnv(key EnvKey) string {
	return strings.TrimSpace(os.Getenv(string(key)))
}

func requireValue(key EnvKey, value string, validationErrors *[]error) {
	if value == "" {
		*validationErrors = append(*validationErrors, fmt.Errorf("%s is required", key))
	}
}

func parseAllowedOrigins(value string) []string {
	origins := make([]string, 0)
	if value == "" {
		log.Printf("%s is empty; no browser origins will be allowed", CORS_ALLOWED_ORIGINS)
		log.Printf("Valid CORS origins: %v", origins)
		return origins
	}

	seen := make(map[string]struct{})
	for _, value := range strings.Split(value, ",") {
		origin := strings.TrimSuffix(strings.TrimSpace(value), "/")
		if origin == "" {
			log.Printf("%s contains an empty origin; skipping it", CORS_ALLOWED_ORIGINS)
			continue
		}
		if err := validateHTTPURL(CORS_ALLOWED_ORIGINS, origin); err != nil {
			log.Printf("Invalid CORS origin %q: %v; skipping it", origin, err)
			continue
		}

		parsedOrigin, _ := url.Parse(origin)
		if parsedOrigin.Path != "" || parsedOrigin.RawQuery != "" || parsedOrigin.Fragment != "" || parsedOrigin.User != nil {
			log.Printf("Invalid CORS origin %q: paths, queries, fragments, and credentials are not allowed; skipping it", origin)
			continue
		}
		if _, found := seen[origin]; found {
			log.Printf("Duplicate CORS origin %q; skipping it", origin)
			continue
		}
		seen[origin] = struct{}{}
		origins = append(origins, origin)
	}
	log.Printf("Valid CORS origins: %v", origins)
	return origins
}

func validateHTTPURL(key EnvKey, value string) error {
	parsedURL, err := url.Parse(value)
	if err != nil || parsedURL.Host == "" || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		return fmt.Errorf("%s must be a valid HTTP or HTTPS URL", key)
	}
	return nil
}

func parsePort(value string) (int, error) {
	if value == "" {
		return DefaultPort, nil
	}

	port, err := strconv.Atoi(value)
	if err != nil {
		return DefaultPort, fmt.Errorf("%s must be an integer", PORT)
	}
	return port, nil
}

func parseExternalAPITimeout(value string) (time.Duration, error) {
	if value == "" {
		return DefaultExternalAPITimeout, nil
	}

	timeout, err := time.ParseDuration(value)
	if err != nil {
		return DefaultExternalAPITimeout, fmt.Errorf("%s must be a valid duration: %w", EXTERNAL_API_TIMEOUT, err)
	}
	if timeout <= 0 {
		return DefaultExternalAPITimeout, fmt.Errorf("%s must be greater than zero", EXTERNAL_API_TIMEOUT)
	}

	return timeout, nil
}
