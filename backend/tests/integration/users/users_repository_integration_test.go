//go:build integration

package users_test

import (
	"cmp"
	"errors"
	"slices"
	"testing"

	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/users"
	testutil "github.com/mbashem/cftracker/backend/tests/support"
)

const (
	integrationUserGitHubID       = int64(7001)
	integrationSecondUserGitHubID = int64(7002)
	uniqueViolationCode           = "23505"
)

func TestUserRepositoryIntegration(t *testing.T) {
	database := testutil.OpenTestDB(t)
	repository := users.NewRepository(database, configs.DefaultDatabaseTimeout)

	t.Run("save persists a user that can be found by both identifiers", func(t *testing.T) {
		testutil.ResetTestDB(t, database)
		user := integrationUserFixture(integrationUserGitHubID)

		if err := repository.Save(t.Context(), &user); err != nil {
			t.Fatalf("Save(): %v", err)
		}
		if user.ID == 0 {
			t.Fatal("Save() user ID = 0")
		}

		foundByID, err := repository.FindByID(t.Context(), user.ID)
		assertIntegrationUser(t, foundByID, err, user)
		foundByGitHubID, err := repository.FindByGitHubID(t.Context(), user.GithubID)
		assertIntegrationUser(t, foundByGitHubID, err, user)
	})

	t.Run("get all returns every stored user without relying on row order", func(t *testing.T) {
		testutil.ResetTestDB(t, database)
		firstUser := integrationUserFixture(integrationUserGitHubID)
		secondUser := integrationUserFixture(integrationSecondUserGitHubID)
		secondUser.GithubUserName = "second-user"
		for _, user := range []*users.User{&firstUser, &secondUser} {
			if err := repository.Save(t.Context(), user); err != nil {
				t.Fatalf("Save(%d): %v", user.GithubID, err)
			}
		}

		storedUsers, err := repository.GetAll(t.Context())
		if err != nil {
			t.Fatalf("GetAll(): %v", err)
		}
		assertIntegrationUsers(t, storedUsers, []users.User{firstUser, secondUser})
	})

	for _, testCase := range []struct {
		name           string
		verifiedHandle string
	}{
		{name: "save preserves a verified handle with different casing", verifiedHandle: "TOURIST"},
		{name: "save preserves an empty verified handle"},
		{name: "save preserves the proof for a different selected account", verifiedHandle: "Petr"},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			testutil.ResetTestDB(t, database)
			user := integrationUserFixture(integrationUserGitHubID)
			user.CFVerifiedHandle = testCase.verifiedHandle
			if err := repository.Save(t.Context(), &user); err != nil {
				t.Fatalf("Save(): %v", err)
			}
			if user.CFVerifiedHandle != testCase.verifiedHandle {
				t.Fatalf("saved verified handle = %q, want %q", user.CFVerifiedHandle, testCase.verifiedHandle)
			}
			stored, err := repository.FindByID(t.Context(), user.ID)
			assertIntegrationUser(t, stored, err, user)
		})
	}

	// Each update is exercised independently so its persisted fields are explicit.
	updateCases := []struct {
		name   string
		update func(repository *users.Repository, user *users.User) error
		want   func(user users.User) users.User
	}{
		{
			name: "GitHub profile update",
			update: func(repository *users.Repository, user *users.User) error {
				user.GithubUserName = "updated-user"
				user.Email = "updated@example.com"
				user.AvatarURL = "https://example.com/updated.png"
				return repository.Update(t.Context(), user)
			},
			want: func(user users.User) users.User {
				user.GithubUserName = "updated-user"
				user.Email = "updated@example.com"
				user.AvatarURL = "https://example.com/updated.png"
				return user
			},
		},
		{
			name: "Codeforces account switch retains the old proof and marks the selected account unverified",
			update: func(repository *users.Repository, user *users.User) error {
				return repository.UpdateCFHandle(t.Context(), user, "Petr", user.CFVerifiedHandle)
			},
			want: func(user users.User) users.User {
				user.CFHandle = "Petr"
				return user
			},
		},
		{
			name: "Codeforces verification update",
			update: func(repository *users.Repository, user *users.User) error {
				return repository.UpdateCFVerifiedHandle(t.Context(), user, "")
			},
			want: func(user users.User) users.User {
				user.CFVerifiedHandle = ""
				return user
			},
		},
		{
			name: "admin update",
			update: func(repository *users.Repository, user *users.User) error {
				return repository.UpdateAdmin(t.Context(), user, true)
			},
			want: func(user users.User) users.User {
				user.Admin = true
				return user
			},
		},
	}
	for _, testCase := range updateCases {
		t.Run(testCase.name, func(t *testing.T) {
			testutil.ResetTestDB(t, database)
			user := integrationUserFixture(integrationUserGitHubID)
			if err := repository.Save(t.Context(), &user); err != nil {
				t.Fatalf("Save(): %v", err)
			}
			expectedUser := testCase.want(user)

			if err := testCase.update(repository, &user); err != nil {
				t.Fatalf("update: %v", err)
			}
			if user != expectedUser {
				t.Fatalf("updated user = %+v, want %+v", user, expectedUser)
			}
			storedUser, err := repository.FindByID(t.Context(), user.ID)
			assertIntegrationUser(t, storedUser, err, expectedUser)
		})
	}

	t.Run("missing users return ErrUserNotFound from reads and updates", func(t *testing.T) {
		testutil.ResetTestDB(t, database)
		operations := []struct {
			name string
			run  func() error
		}{
			{name: "find by ID", run: func() error { _, err := repository.FindByID(t.Context(), 999999); return err }},
			{name: "find by GitHub ID", run: func() error { _, err := repository.FindByGitHubID(t.Context(), integrationUserGitHubID); return err }},
			{name: "update GitHub profile", run: func() error {
				user := users.User{ID: 999999}
				return repository.Update(t.Context(), &user)
			}},
			{name: "update Codeforces handle", run: func() error {
				user := users.User{ID: 999999}
				return repository.UpdateCFHandle(t.Context(), &user, "Petr", user.CFVerifiedHandle)
			}},
			{name: "update Codeforces verification", run: func() error {
				user := users.User{ID: 999999}
				return repository.UpdateCFVerifiedHandle(t.Context(), &user, user.CFHandle)
			}},
			{name: "update admin", run: func() error {
				user := users.User{ID: 999999}
				return repository.UpdateAdmin(t.Context(), &user, true)
			}},
		}
		for _, operation := range operations {
			t.Run(operation.name, func(t *testing.T) {
				expectedError := users.ErrUserNotFound
				if operation.name == "update Codeforces handle" || operation.name == "update Codeforces verification" {
					expectedError = users.ErrCFHandleChanged
				}
				if err := operation.run(); !errors.Is(err, expectedError) {
					t.Fatalf("error = %v, want %v", err, expectedError)
				}
			})
		}
	})

	// Read the account before another request changes it, then submit the old proof.
	for _, testCase := range []struct {
		name   string
		change func(*users.Repository, *users.User) error
	}{
		{name: "stale verification rejects a changed selected handle", change: func(repository *users.Repository, user *users.User) error {
			return repository.UpdateCFHandle(t.Context(), user, "Petr", user.CFVerifiedHandle)
		}},
		{name: "stale verification rejects a changed verified handle", change: func(repository *users.Repository, user *users.User) error {
			return repository.UpdateCFVerifiedHandle(t.Context(), user, "Petr")
		}},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			testutil.ResetTestDB(t, database)
			original := integrationUserFixture(integrationUserGitHubID)
			if err := repository.Save(t.Context(), &original); err != nil {
				t.Fatal(err)
			}
			concurrent := original
			if err := testCase.change(repository, &concurrent); err != nil {
				t.Fatal(err)
			}
			if err := repository.UpdateCFVerifiedHandle(t.Context(), &original, original.CFHandle); !errors.Is(err, users.ErrCFHandleChanged) {
				t.Fatalf("stale verification error = %v", err)
			}
			if err := repository.UpdateCFHandle(t.Context(), &original, "new-handle", "new-handle"); !errors.Is(err, users.ErrCFHandleChanged) {
				t.Fatalf("stale rename error = %v", err)
			}
			stored, err := repository.FindByID(t.Context(), original.ID)
			assertIntegrationUser(t, stored, err, concurrent)
		})
	}

	t.Run("rename updates both handles and preserves verification", func(t *testing.T) {
		testutil.ResetTestDB(t, database)
		user := integrationUserFixture(integrationUserGitHubID)
		if err := repository.Save(t.Context(), &user); err != nil {
			t.Fatal(err)
		}
		if err := repository.UpdateCFHandle(t.Context(), &user, "RenamedTourist", "RenamedTourist"); err != nil {
			t.Fatal(err)
		}
		stored, err := repository.FindByID(t.Context(), user.ID)
		assertIntegrationUser(t, stored, err, user)
		if !stored.IsCFVerified() {
			t.Fatal("rename lost verification")
		}
	})

	t.Run("verification status is derived from handles ignoring case", func(t *testing.T) {
		testutil.ResetTestDB(t, database)
		user := integrationUserFixture(integrationUserGitHubID)
		if err := repository.Save(t.Context(), &user); err != nil {
			t.Fatal(err)
		}
		if err := repository.UpdateCFHandle(t.Context(), &user, "TOURIST", user.CFVerifiedHandle); err != nil {
			t.Fatal(err)
		}
		stored, err := repository.FindByID(t.Context(), user.ID)
		assertIntegrationUser(t, stored, err, user)
		if !stored.IsCFVerified() {
			t.Fatal("case-only change lost verification")
		}
	})

	t.Run("GitHub IDs are unique", func(t *testing.T) {
		testutil.ResetTestDB(t, database)
		firstUser := integrationUserFixture(integrationUserGitHubID)
		secondUser := integrationUserFixture(integrationUserGitHubID)
		secondUser.GithubUserName = "duplicate-user"
		if err := repository.Save(t.Context(), &firstUser); err != nil {
			t.Fatalf("Save(first user): %v", err)
		}

		testutil.AssertPostgresErrorCode(t, repository.Save(t.Context(), &secondUser), uniqueViolationCode)
		storedUser, err := repository.FindByGitHubID(t.Context(), integrationUserGitHubID)
		assertIntegrationUser(t, storedUser, err, firstUser)
	})
}

func integrationUserFixture(githubID int64) users.User {
	return users.User{
		GithubID:         githubID,
		GithubUserName:   "integration-user",
		Email:            "integration@example.com",
		AvatarURL:        "https://example.com/avatar.png",
		CFHandle:         "tourist",
		CFVerifiedHandle: "tourist",
	}
}

func assertIntegrationUser(t *testing.T, actual *users.User, err error, expected users.User) {
	t.Helper()
	if err != nil {
		t.Fatalf("find user: %v", err)
	}
	if *actual != expected {
		t.Fatalf("user = %+v, want %+v", *actual, expected)
	}
}

func assertIntegrationUsers(t *testing.T, actual []users.User, expected []users.User) {
	t.Helper()
	actual = slices.Clone(actual)
	expected = slices.Clone(expected)
	slices.SortFunc(actual, func(left users.User, right users.User) int { return cmp.Compare(left.ID, right.ID) })
	slices.SortFunc(expected, func(left users.User, right users.User) int { return cmp.Compare(left.ID, right.ID) })
	if !slices.Equal(actual, expected) {
		t.Fatalf("users = %+v, want %+v", actual, expected)
	}
}
