package configs_test

import (
	"testing"
	"time"

	"github.com/mbashem/cftracker/backend/configs"
)

func TestLoadDatabaseTimeout(t *testing.T) {
	for _, testCase := range []struct {
		name          string
		value         string
		wantTimeout   time.Duration
		wantErrorText string
	}{
		{name: "unset timeout defaults to five seconds", wantTimeout: configs.DefaultDatabaseTimeout},
		{name: "configured timeout is used", value: "250ms", wantTimeout: 250 * time.Millisecond},
		{name: "malformed timeout prevents startup", value: "slow", wantErrorText: "DATABASE_TIMEOUT must be a valid duration"},
		{name: "zero timeout prevents startup", value: "0s", wantErrorText: "DATABASE_TIMEOUT must be greater than zero"},
		{name: "negative timeout prevents startup", value: "-1s", wantErrorText: "DATABASE_TIMEOUT must be greater than zero"},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			t.Chdir(t.TempDir())
			mockData := newConfigMockData()
			mockData.databaseTimeout = testCase.value
			setConfigEnv(t, mockData)
			config, err := configs.Load()
			assertErrorText(t, err, testCase.wantErrorText)
			if err == nil && config.DatabaseTimeout != testCase.wantTimeout {
				t.Fatalf("DatabaseTimeout = %s, want %s", config.DatabaseTimeout, testCase.wantTimeout)
			}
		})
	}
}
