package configs

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type EnvKeys string

const (
	GITHUB_CLIENT_ID     EnvKeys = "GITHUB_CLIENT_ID"
	GITHUB_CLIENT_SECRET EnvKeys = "GITHUB_CLIENT_SECRET"
	GITHUB_REDIRECT_URL  EnvKeys = "GITHUB_REDIRECT_URL"
	DATABASE_URL         EnvKeys = "DATABASE_URL"
	JWT_SECRET           EnvKeys = "JWT_SECRET"
	EXTERNAL_API_TIMEOUT EnvKeys = "EXTERNAL_API_TIMEOUT"
)

const DefaultExternalAPITimeout = 10 * time.Second

func LoadEnv() error {
	return godotenv.Load()
}

func GetEnv(key EnvKeys) string {
	return os.Getenv(string(key))
}

func GetExternalAPITimeout() (time.Duration, error) {
	value := strings.TrimSpace(GetEnv(EXTERNAL_API_TIMEOUT))
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
