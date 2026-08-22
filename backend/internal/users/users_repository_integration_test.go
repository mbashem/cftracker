//go:build integration

package users_test

import (
	"cmp"
	"errors"
	"slices"
	"testing"

	"github.com/mbashem/cftracker/backend/internal/testutil"
	"github.com/mbashem/cftracker/backend/internal/users"
)

const (
	integrationUserGitHubID       = int64(7001)
	integrationSecondUserGitHubID = int64(7002)
	uniqueViolationCode           = "23505"
)

func TestUserRepositoryIntegration(t *testing.T) {
	database := testutil.OpenTestDB(t)
	repository := users.NewRepository(database)

	t.Run("save persists a user that can be found by both identifiers", func(t *testing.T) {
		testutil.ResetTestDB(t, database)
		user := integrationUserFixture(integrationUserGitHubID)

		if err := repository.Save(&user); err != nil {
			t.Fatalf("Save(): %v", err)
		}
		if user.ID == 0 {
			t.Fatal("Save() user ID = 0")
		}

		foundByID, err := repository.FindByID(user.ID)
		assertIntegrationUser(t, foundByID, err, user)
		foundByGitHubID, err := repository.FindByGitHubID(user.GithubID)
		assertIntegrationUser(t, foundByGitHubID, err, user)
	})

	t.Run("get all returns every stored user without relying on row order", func(t *testing.T) {
		testutil.ResetTestDB(t, database)
		firstUser := integrationUserFixture(integrationUserGitHubID)
		secondUser := integrationUserFixture(integrationSecondUserGitHubID)
		secondUser.GithubUserName = "second-user"
		for _, user := range []*users.User{&firstUser, &secondUser} {
			if err := repository.Save(user); err != nil {
				t.Fatalf("Save(%d): %v", user.GithubID, err)
			}
		}

		storedUsers, err := repository.GetAll()
		if err != nil {
			t.Fatalf("GetAll(): %v", err)
		}
		assertIntegrationUsers(t, storedUsers, []users.User{firstUser, secondUser})
	})

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
				return repository.Update(user)
			},
			want: func(user users.User) users.User {
				user.GithubUserName = "updated-user"
				user.Email = "updated@example.com"
				user.AvatarURL = "https://example.com/updated.png"
				return user
			},
		},
		{
			name: "Codeforces handle update clears verification",
			update: func(repository *users.Repository, user *users.User) error {
				return repository.UpdateCFHandle(user, "Petr")
			},
			want: func(user users.User) users.User {
				user.CFHandle = "Petr"
				user.CFVerified = false
				return user
			},
		},
		{
			name: "Codeforces verification update",
			update: func(repository *users.Repository, user *users.User) error {
				return repository.UpdateCFVerified(user, false)
			},
			want: func(user users.User) users.User {
				user.CFVerified = false
				return user
			},
		},
		{
			name: "admin update",
			update: func(repository *users.Repository, user *users.User) error {
				return repository.UpdateAdmin(user, true)
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
			if err := repository.Save(&user); err != nil {
				t.Fatalf("Save(): %v", err)
			}
			expectedUser := testCase.want(user)

			if err := testCase.update(repository, &user); err != nil {
				t.Fatalf("update: %v", err)
			}
			if user != expectedUser {
				t.Fatalf("updated user = %+v, want %+v", user, expectedUser)
			}
			storedUser, err := repository.FindByID(user.ID)
			assertIntegrationUser(t, storedUser, err, expectedUser)
		})
	}

	t.Run("missing users return ErrUserNotFound from reads and updates", func(t *testing.T) {
		testutil.ResetTestDB(t, database)
		operations := []struct {
			name string
			run  func() error
		}{
			{name: "find by ID", run: func() error { _, err := repository.FindByID(999999); return err }},
			{name: "find by GitHub ID", run: func() error { _, err := repository.FindByGitHubID(integrationUserGitHubID); return err }},
			{name: "update GitHub profile", run: func() error {
				user := users.User{ID: 999999}
				return repository.Update(&user)
			}},
			{name: "update Codeforces handle", run: func() error {
				user := users.User{ID: 999999}
				return repository.UpdateCFHandle(&user, "Petr")
			}},
			{name: "update Codeforces verification", run: func() error {
				user := users.User{ID: 999999}
				return repository.UpdateCFVerified(&user, true)
			}},
			{name: "update admin", run: func() error {
				user := users.User{ID: 999999}
				return repository.UpdateAdmin(&user, true)
			}},
		}
		for _, operation := range operations {
			t.Run(operation.name, func(t *testing.T) {
				if err := operation.run(); !errors.Is(err, users.ErrUserNotFound) {
					t.Fatalf("error = %v, want %v", err, users.ErrUserNotFound)
				}
			})
		}
	})

	t.Run("GitHub IDs are unique", func(t *testing.T) {
		testutil.ResetTestDB(t, database)
		firstUser := integrationUserFixture(integrationUserGitHubID)
		secondUser := integrationUserFixture(integrationUserGitHubID)
		secondUser.GithubUserName = "duplicate-user"
		if err := repository.Save(&firstUser); err != nil {
			t.Fatalf("Save(first user): %v", err)
		}

		testutil.AssertPostgresErrorCode(t, repository.Save(&secondUser), uniqueViolationCode)
		storedUser, err := repository.FindByGitHubID(integrationUserGitHubID)
		assertIntegrationUser(t, storedUser, err, firstUser)
	})
}

func integrationUserFixture(githubID int64) users.User {
	return users.User{
		GithubID:       githubID,
		GithubUserName: "integration-user",
		Email:          "integration@example.com",
		AvatarURL:      "https://example.com/avatar.png",
		CFHandle:       "tourist",
		CFVerified:     true,
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
