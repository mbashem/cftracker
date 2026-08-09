package configs

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"
)

const (
	testGitHubClientID      = "github-client-id"
	testGitHubClientSecret  = "github-client-secret"
	testGitHubRedirectURL   = "http://localhost:8080/auth/github/callback"
	testDatabaseURL         = "postgres://postgres:postgrespw@localhost:5432/cftracker_test?sslmode=disable"
	testJWTSecret           = "test-jwt-secret-with-enough-bytes"
	testNonIntegerPort      = "not-a-port"
	testMalformedAPITimeout = "slow"

	testPortIntegerErrorText        = "PORT must be an integer"
	testAPITimeoutDurationErrorText = "EXTERNAL_API_TIMEOUT must be a valid duration"
	testAPITimeoutPositiveErrorText = "EXTERNAL_API_TIMEOUT must be greater than zero"

	testLogEmptyOrigin      = "contains an empty origin"
	testLogDuplicateOrigin  = "Duplicate CORS origin"
	testLogInvalidOrigin    = "Invalid CORS origin"
	testLogValidOrigins     = "Valid CORS origins"
	testLogEmptyCORSOrigins = "CORS_ALLOWED_ORIGINS is empty"
)

type configMockData struct {
	gitHubClientID     string
	gitHubClientSecret string
	gitHubRedirectURL  string
	databaseURL        string
	jwtSecret          string
	corsAllowedOrigins string
	port               string
	externalAPITimeout string
}

var (
	dotEnvConfigOverrides = configMockData{
		gitHubClientID:     "dotenv-client-id",
		gitHubClientSecret: "dotenv-client-secret",
		gitHubRedirectURL:  "http://dotenv.example.com/callback",
		databaseURL:        "postgres://dotenv",
		jwtSecret:          "dotenv-jwt-secret-with-enough-bytes",
		corsAllowedOrigins: "https://dotenv.example.com",
		port:               "9000",
		externalAPITimeout: "5s",
	}

	processEnvConfigOverrides = configMockData{
		gitHubClientID:     "process-client-id",
		corsAllowedOrigins: "https://process.example.com",
		port:               "9090",
		externalAPITimeout: "15s",
	}
)

func TestParsePort(t *testing.T) {
	testCases := []struct {
		name              string
		value             string
		expectedPort      int
		expectedErrorText string
	}{
		{
			name:         "empty value uses default port",
			expectedPort: DefaultPort,
		},
		{
			name:         "integer value uses configured port",
			value:        "9090",
			expectedPort: 9090,
		},
		{
			name:              "non-integer value returns default port and validation error",
			value:             testNonIntegerPort,
			expectedPort:      DefaultPort,
			expectedErrorText: testPortIntegerErrorText,
		},
		{
			name:         "out-of-range integer is deferred to server startup",
			value:        "70000",
			expectedPort: 70000,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			gotPort, err := parsePort(testCase.value)
			if gotPort != testCase.expectedPort {
				t.Fatalf("parsePort() port = %d, want %d", gotPort, testCase.expectedPort)
			}
			assertErrorText(t, err, testCase.expectedErrorText)
		})
	}
}

func TestParseExternalAPITimeout(t *testing.T) {
	testCases := []struct {
		name              string
		value             string
		expectedTimeout   time.Duration
		expectedErrorText string
	}{
		{
			name:            "empty value uses default timeout",
			expectedTimeout: DefaultExternalAPITimeout,
		},
		{
			name:            "seconds duration is parsed",
			value:           "5s",
			expectedTimeout: 5 * time.Second,
		},
		{
			name:            "minutes duration is parsed",
			value:           "1m",
			expectedTimeout: time.Minute,
		},
		{
			name:              "malformed duration returns default timeout and validation error",
			value:             testMalformedAPITimeout,
			expectedTimeout:   DefaultExternalAPITimeout,
			expectedErrorText: testAPITimeoutDurationErrorText,
		},
		{
			name:              "zero duration returns default timeout and validation error",
			value:             "0s",
			expectedTimeout:   DefaultExternalAPITimeout,
			expectedErrorText: testAPITimeoutPositiveErrorText,
		},
		{
			name:              "negative duration returns default timeout and validation error",
			value:             "-1s",
			expectedTimeout:   DefaultExternalAPITimeout,
			expectedErrorText: testAPITimeoutPositiveErrorText,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			gotTimeout, err := parseExternalAPITimeout(testCase.value)
			if gotTimeout != testCase.expectedTimeout {
				t.Fatalf("parseExternalAPITimeout() timeout = %s, want %s", gotTimeout, testCase.expectedTimeout)
			}
			assertErrorText(t, err, testCase.expectedErrorText)
		})
	}
}

func TestParseAllowedOrigins(t *testing.T) {
	var logBuffer bytes.Buffer
	restoreLogOutput := captureLogs(&logBuffer)
	defer restoreLogOutput()

	parsedOrigins := parseAllowedOrigins(strings.Join([]string{
		"",
		"http://localhost:3000",
		"http://localhost:3000/",
		"https://example.com/path",
		"ftp://example.com",
		"https://user@example.com",
		"https://app.example.com",
	}, ","))

	expectedOrigins := []string{
		"http://localhost:3000",
		"https://app.example.com",
	}
	if !slices.Equal(parsedOrigins, expectedOrigins) {
		t.Fatalf("parseAllowedOrigins() = %v, want %v", parsedOrigins, expectedOrigins)
	}

	logOutput := logBuffer.String()
	for _, expectedLogText := range []string{
		testLogEmptyOrigin,
		testLogDuplicateOrigin,
		testLogInvalidOrigin,
		testLogValidOrigins,
	} {
		if !strings.Contains(logOutput, expectedLogText) {
			t.Fatalf("parseAllowedOrigins() logs = %q, want text %q", logOutput, expectedLogText)
		}
	}
}

func TestParseAllowedOriginsEmptyValue(t *testing.T) {
	var logBuffer bytes.Buffer
	restoreLogOutput := captureLogs(&logBuffer)
	defer restoreLogOutput()

	parsedOrigins := parseAllowedOrigins("")
	if len(parsedOrigins) != 0 {
		t.Fatalf("parseAllowedOrigins() = %v, want empty slice", parsedOrigins)
	}
	if !strings.Contains(logBuffer.String(), testLogEmptyCORSOrigins) {
		t.Fatalf("parseAllowedOrigins() logs = %q, want empty origins log", logBuffer.String())
	}
}

func TestLoadUsesDefaults(t *testing.T) {
	mockData := newConfigMockData()

	t.Chdir(t.TempDir())
	setConfigEnv(t, mockData)

	config, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if config.Port != DefaultPort {
		t.Fatalf("Port = %d, want %d", config.Port, DefaultPort)
	}
	if config.ExternalAPITimeout != DefaultExternalAPITimeout {
		t.Fatalf("ExternalAPITimeout = %s, want %s", config.ExternalAPITimeout, DefaultExternalAPITimeout)
	}
	if len(config.CORSAllowedOrigins) != 0 {
		t.Fatalf("CORSAllowedOrigins = %v, want empty slice", config.CORSAllowedOrigins)
	}
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	testCases := []struct {
		name              string
		configureMockData func(*configMockData)
		expectedErrorText string
	}{
		{
			name: "empty GitHub client ID is rejected",
			configureMockData: func(mockData *configMockData) {
				mockData.gitHubClientID = ""
			},
			expectedErrorText: "GITHUB_CLIENT_ID is required",
		},
		{
			name: "empty GitHub client secret is rejected",
			configureMockData: func(mockData *configMockData) {
				mockData.gitHubClientSecret = ""
			},
			expectedErrorText: "GITHUB_CLIENT_SECRET is required",
		},
		{
			name: "empty GitHub redirect URL is rejected",
			configureMockData: func(mockData *configMockData) {
				mockData.gitHubRedirectURL = ""
			},
			expectedErrorText: "GITHUB_REDIRECT_URL is required",
		},
		{
			name: "empty database URL is rejected",
			configureMockData: func(mockData *configMockData) {
				mockData.databaseURL = ""
			},
			expectedErrorText: "DATABASE_URL is required",
		},
		{
			name: "empty JWT secret is rejected",
			configureMockData: func(mockData *configMockData) {
				mockData.jwtSecret = ""
			},
			expectedErrorText: "JWT_SECRET is required",
		},
		{
			name: "malformed GitHub redirect URL is rejected",
			configureMockData: func(mockData *configMockData) {
				mockData.gitHubRedirectURL = "not-a-url"
			},
			expectedErrorText: "GITHUB_REDIRECT_URL must be a valid HTTP or HTTPS URL",
		},
		{
			name: "JWT secret below minimum length is rejected",
			configureMockData: func(mockData *configMockData) {
				mockData.jwtSecret = "short"
			},
			expectedErrorText: fmt.Sprintf("JWT_SECRET must be at least %d bytes", MinimumJWTSecretLength),
		},
		{
			name: "non-integer port is rejected",
			configureMockData: func(mockData *configMockData) {
				mockData.port = testNonIntegerPort
			},
			expectedErrorText: testPortIntegerErrorText,
		},
		{
			name: "malformed external API timeout is rejected",
			configureMockData: func(mockData *configMockData) {
				mockData.externalAPITimeout = testMalformedAPITimeout
			},
			expectedErrorText: testAPITimeoutDurationErrorText,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			mockData := newConfigMockData()
			testCase.configureMockData(&mockData)

			t.Chdir(t.TempDir())
			setConfigEnv(t, mockData)

			_, err := Load()
			assertErrorText(t, err, testCase.expectedErrorText)
		})
	}
}

func TestConfigurationLoadersReturnDotEnvError(t *testing.T) {
	testCases := []struct {
		name              string
		loadConfiguration func() error
	}{
		{
			name: "Load returns unreadable .env error",
			loadConfiguration: func() error {
				_, err := Load()
				return err
			},
		},
		{
			name: "LoadDatabaseURL returns unreadable .env error",
			loadConfiguration: func() error {
				_, err := LoadDatabaseURL()
				return err
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Chdir(t.TempDir())
			if err := os.Mkdir(".env", 0700); err != nil {
				t.Fatalf("create invalid .env directory: %v", err)
			}

			err := testCase.loadConfiguration()
			assertErrorText(t, err, "load .env")
		})
	}
}

func TestLoadLocalEnvReturnsInspectionError(t *testing.T) {
	t.Chdir(t.TempDir())
	if err := os.Symlink(".env", ".env"); err != nil {
		t.Fatalf("create self-referencing .env symlink: %v", err)
	}

	err := loadLocalEnv()
	assertErrorText(t, err, "inspect .env")
}

func TestLoadUsesProcessEnvironmentBeforeDotEnv(t *testing.T) {
	dotEnvData := newConfigMockData(dotEnvConfigOverrides)
	processEnvData := newConfigMockData(processEnvConfigOverrides)
	expectedPort := mustParsePort(t, processEnvData.port)
	expectedExternalAPITimeout := mustParseDuration(t, processEnvData.externalAPITimeout)

	t.Chdir(t.TempDir())
	writeDotEnv(t, dotEnvData.envValues())
	setConfigEnv(t, processEnvData)

	config, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	configStringFields := []struct {
		fieldName string
		actual    string
		expected  string
	}{
		{fieldName: "GitHubClientID", actual: config.GitHubClientID, expected: processEnvData.gitHubClientID},
		{fieldName: "GitHubClientSecret", actual: config.GitHubClientSecret, expected: processEnvData.gitHubClientSecret},
		{fieldName: "GitHubRedirectURL", actual: config.GitHubRedirectURL, expected: processEnvData.gitHubRedirectURL},
		{fieldName: "DatabaseURL", actual: config.DatabaseURL, expected: processEnvData.databaseURL},
		{fieldName: "JWTSecret", actual: config.JWTSecret, expected: processEnvData.jwtSecret},
	}
	for _, configField := range configStringFields {
		if configField.actual != configField.expected {
			t.Errorf("%s = %q, want %q", configField.fieldName, configField.actual, configField.expected)
		}
	}
	if !slices.Equal(config.CORSAllowedOrigins, []string{processEnvData.corsAllowedOrigins}) {
		t.Fatalf("CORSAllowedOrigins = %v, want %s", config.CORSAllowedOrigins, processEnvData.corsAllowedOrigins)
	}
	if config.Port != expectedPort {
		t.Fatalf("Port = %d, want %s", config.Port, processEnvData.port)
	}
	if config.ExternalAPITimeout != expectedExternalAPITimeout {
		t.Fatalf("ExternalAPITimeout = %s, want %s", config.ExternalAPITimeout, processEnvData.externalAPITimeout)
	}
}

func TestLoadDatabaseURLFromDotEnv(t *testing.T) {
	mockData := newConfigMockData()

	t.Chdir(t.TempDir())
	restoreEnv := unsetEnv(t, string(DATABASE_URL))
	defer restoreEnv()
	writeDotEnv(t, map[string]string{
		string(DATABASE_URL): mockData.databaseURL,
	})

	databaseURL, err := LoadDatabaseURL()
	if err != nil {
		t.Fatalf("LoadDatabaseURL() error = %v", err)
	}
	if databaseURL != mockData.databaseURL {
		t.Fatalf("LoadDatabaseURL() = %q, want %q", databaseURL, mockData.databaseURL)
	}
}

func TestLoadTrimsEnvironmentValues(t *testing.T) {
	mockData := newConfigMockData(processEnvConfigOverrides)
	gitHubClientIDWithSpaces := "  " + mockData.gitHubClientID + "  "
	corsAllowedOriginsWithSpaces := "  " + mockData.corsAllowedOrigins + "  "

	t.Chdir(t.TempDir())
	setConfigEnv(t, mockData)
	t.Setenv(string(GITHUB_CLIENT_ID), gitHubClientIDWithSpaces)
	t.Setenv(string(CORS_ALLOWED_ORIGINS), corsAllowedOriginsWithSpaces)

	config, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if config.GitHubClientID != mockData.gitHubClientID {
		t.Fatalf("GitHubClientID = %q, want trimmed value", config.GitHubClientID)
	}
	if !slices.Equal(config.CORSAllowedOrigins, []string{mockData.corsAllowedOrigins}) {
		t.Fatalf("CORSAllowedOrigins = %v, want trimmed origin", config.CORSAllowedOrigins)
	}
}

func newConfigMockData(overrides ...configMockData) configMockData {
	mockData := configMockData{
		gitHubClientID:     testGitHubClientID,
		gitHubClientSecret: testGitHubClientSecret,
		gitHubRedirectURL:  testGitHubRedirectURL,
		databaseURL:        testDatabaseURL,
		jwtSecret:          testJWTSecret,
	}

	for _, override := range overrides {
		mockData.applyOverride(override)
	}

	return mockData
}

func (mockData *configMockData) applyOverride(override configMockData) {
	if override.gitHubClientID != "" {
		mockData.gitHubClientID = override.gitHubClientID
	}
	if override.gitHubClientSecret != "" {
		mockData.gitHubClientSecret = override.gitHubClientSecret
	}
	if override.gitHubRedirectURL != "" {
		mockData.gitHubRedirectURL = override.gitHubRedirectURL
	}
	if override.databaseURL != "" {
		mockData.databaseURL = override.databaseURL
	}
	if override.jwtSecret != "" {
		mockData.jwtSecret = override.jwtSecret
	}
	if override.corsAllowedOrigins != "" {
		mockData.corsAllowedOrigins = override.corsAllowedOrigins
	}
	if override.port != "" {
		mockData.port = override.port
	}
	if override.externalAPITimeout != "" {
		mockData.externalAPITimeout = override.externalAPITimeout
	}
}

func (mockData configMockData) envValues() map[string]string {
	return map[string]string{
		string(GITHUB_CLIENT_ID):     mockData.gitHubClientID,
		string(GITHUB_CLIENT_SECRET): mockData.gitHubClientSecret,
		string(GITHUB_REDIRECT_URL):  mockData.gitHubRedirectURL,
		string(DATABASE_URL):         mockData.databaseURL,
		string(JWT_SECRET):           mockData.jwtSecret,
		string(CORS_ALLOWED_ORIGINS): mockData.corsAllowedOrigins,
		string(PORT):                 mockData.port,
		string(EXTERNAL_API_TIMEOUT): mockData.externalAPITimeout,
	}
}

func setConfigEnv(t *testing.T, mockData configMockData) {
	t.Helper()

	for key, value := range mockData.envValues() {
		t.Setenv(key, value)
	}
}

func writeDotEnv(t *testing.T, values map[string]string) {
	t.Helper()

	var builder strings.Builder
	for key, value := range values {
		builder.WriteString(key)
		builder.WriteString("=")
		builder.WriteString(value)
		builder.WriteString("\n")
	}

	if err := os.WriteFile(filepath.Join(".", ".env"), []byte(builder.String()), 0600); err != nil {
		t.Fatalf("write .env: %v", err)
	}
}

func mustParsePort(t *testing.T, value string) int {
	t.Helper()

	port, err := strconv.Atoi(value)
	if err != nil {
		t.Fatalf("parse test port %q: %v", value, err)
	}
	return port
}

func mustParseDuration(t *testing.T, value string) time.Duration {
	t.Helper()

	duration, err := time.ParseDuration(value)
	if err != nil {
		t.Fatalf("parse test duration %q: %v", value, err)
	}
	return duration
}

func unsetEnv(t *testing.T, key string) func() {
	t.Helper()

	previousValue, hadPreviousValue := os.LookupEnv(key)
	if err := os.Unsetenv(key); err != nil {
		t.Fatalf("unset %s: %v", key, err)
	}

	return func() {
		if hadPreviousValue {
			if err := os.Setenv(key, previousValue); err != nil {
				t.Fatalf("restore %s: %v", key, err)
			}
			return
		}
		if err := os.Unsetenv(key); err != nil {
			t.Fatalf("restore unset %s: %v", key, err)
		}
	}
}

func captureLogs(buffer *bytes.Buffer) func() {
	previousWriter := log.Writer()
	log.SetOutput(buffer)

	return func() {
		log.SetOutput(previousWriter)
	}
}

func assertErrorText(t *testing.T, err error, expectedText string) {
	t.Helper()

	if expectedText == "" {
		if err != nil {
			t.Fatalf("error = %v, want nil", err)
		}
		return
	}
	if err == nil {
		t.Fatalf("error = nil, want text %q", expectedText)
	}
	if !strings.Contains(err.Error(), expectedText) {
		t.Fatalf("error = %v, want text %q", err, expectedText)
	}
}
