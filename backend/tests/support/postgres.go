//go:build integration

package testutil

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/lib/pq"
)

const (
	testDatabaseURLKey = "TEST_DATABASE_URL"
	databaseURLKey     = "DATABASE_URL"
	expectedVersion    = 4
	queryTimeout       = 5 * time.Second
)

func OpenTestDB(t *testing.T) *sql.DB {
	t.Helper()

	databaseURL := strings.TrimSpace(os.Getenv(testDatabaseURLKey))
	if databaseURL == "" {
		t.Fatalf("%s is required for integration tests", testDatabaseURLKey)
	}

	if configuredURL := strings.TrimSpace(os.Getenv(databaseURLKey)); configuredURL != "" && databaseURL == configuredURL {
		t.Fatalf("%s must not match %s", testDatabaseURLKey, databaseURLKey)
	}

	database, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	if err := database.PingContext(ctx); err != nil {
		database.Close()
		t.Fatalf("connect to test database: %v", err)
	}

	ensureSafeTestDatabase(t, database)
	ensureMigrationVersion(t, database)

	t.Cleanup(func() {
		if err := database.Close(); err != nil {
			t.Errorf("close test database: %v", err)
		}
	})

	return database
}

func ResetTestDB(t *testing.T, database *sql.DB) {
	t.Helper()

	ensureSafeTestDatabase(t, database)

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	if _, err := database.ExecContext(ctx, `TRUNCATE list_items, lists, users RESTART IDENTITY CASCADE`); err != nil {
		t.Fatalf("reset test database: %v", err)
	}
}

func AssertPostgresErrorCode(t *testing.T, err error, expectedCode string) {
	t.Helper()

	var postgresError *pq.Error
	if !errors.As(err, &postgresError) {
		t.Fatalf("error = %v, want PostgreSQL error code %s", err, expectedCode)
	}
	if string(postgresError.Code) != expectedCode {
		t.Fatalf("PostgreSQL error code = %s, want %s", postgresError.Code, expectedCode)
	}
}

func ensureSafeTestDatabase(t *testing.T, database *sql.DB) {
	t.Helper()

	databaseName := currentDatabaseName(t, database)
	if !strings.HasSuffix(databaseName, "_test") && !strings.HasSuffix(databaseName, "_integration") {
		t.Fatalf("refusing to use database %q; integration test databases must end in _test or _integration", databaseName)
	}
}

func ensureMigrationVersion(t *testing.T, database *sql.DB) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	var version int
	var dirty bool
	err := database.QueryRowContext(ctx, `SELECT version, dirty FROM public.schema_migrations LIMIT 1`).Scan(&version, &dirty)
	if err != nil {
		t.Fatalf("read migration version: %v", err)
	}

	if version != expectedVersion || dirty {
		t.Fatalf("test database must be migrated to version %d with dirty=false; got version=%d dirty=%t", expectedVersion, version, dirty)
	}
}

func currentDatabaseName(t *testing.T, database *sql.DB) string {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	var databaseName string
	if err := database.QueryRowContext(ctx, `SELECT current_database()`).Scan(&databaseName); err != nil {
		t.Fatalf("read current database name: %v", err)
	}
	if databaseName == "" {
		t.Fatal("current database name is empty")
	}

	return databaseName
}
