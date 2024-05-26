package configs

import (
	"os"

	"github.com/joho/godotenv"
)

type EnvKeys string

const (
	GITHUB_CLIENT_ID     EnvKeys = "GITHUB_CLIENT_ID"
	GITHUB_CLIENT_SECRET EnvKeys = "GITHUB_CLIENT_SECRET"
	GITHUB_REDIRECT_URL  EnvKeys = "GITHUB_REDIRECT_URL"
	DATABASE_URL         EnvKeys = "DATABASE_URL"
	JWT_SECRET           EnvKeys = "JWT_SECRET"
)

func LoadEnv() error {
	return godotenv.Load()
}

func GetEnv(key EnvKeys) string {
	return os.Getenv(string(key))
}
