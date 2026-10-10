//go:build integration

package testutil_test

import (
	"testing"

	testutil "github.com/mbashem/cftracker/backend/tests/support"
)

func TestIntegrationDatabaseIsSafeAndMigrated(t *testing.T) {
	database := testutil.OpenTestDB(t)

	testutil.ResetTestDB(t, database)
}
