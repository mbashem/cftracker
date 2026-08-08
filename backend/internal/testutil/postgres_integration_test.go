//go:build integration

package testutil

import "testing"

func TestIntegrationDatabaseIsSafeAndMigrated(t *testing.T) {
	database := OpenTestDB(t)

	ResetTestDB(t, database)
}
