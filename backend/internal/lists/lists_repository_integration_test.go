//go:build integration

package lists_test

import (
	"cmp"
	"database/sql"
	"errors"
	"slices"
	"testing"

	"github.com/mbashem/cftracker/backend/internal/lists"
	"github.com/mbashem/cftracker/backend/internal/testutil"
	"github.com/mbashem/cftracker/backend/internal/users"
)

const (
	integrationListOwnerGitHubID = int64(8001)
	integrationListOtherGitHubID = int64(8002)
	integrationListEmptyGitHubID = int64(8003)
	integrationMissingListID     = int64(999999)
	integrationUniqueViolation   = "23505"
)

func TestListRepositoryIntegration(t *testing.T) {
	database := testutil.OpenTestDB(t)
	repository := lists.NewRepository(database)

	t.Run("create read update and delete preserve the owner", func(t *testing.T) {
		ownerID, _ := resetListIntegrationState(t, database)
		list := createIntegrationList(t, repository, ownerID, "Contest preparation")

		storedList, err := repository.GetById(ownerID, list.Id)
		assertIntegrationList(t, storedList, err, list)

		list.Name = "Updated preparation"
		if err := repository.UpdateName(ownerID, &list); err != nil {
			t.Fatalf("UpdateName(): %v", err)
		}
		storedList, err = repository.GetById(ownerID, list.Id)
		assertIntegrationList(t, storedList, err, list)

		if err := repository.Delete(ownerID, list.Id); err != nil {
			t.Fatalf("Delete(): %v", err)
		}
		if _, err := repository.GetById(ownerID, list.Id); !errors.Is(err, lists.ErrListNotFound) {
			t.Fatalf("GetById() after Delete() error = %v, want %v", err, lists.ErrListNotFound)
		}
	})

	t.Run("get all returns only the requested user's lists without relying on row order", func(t *testing.T) {
		ownerID, otherUserID := resetListIntegrationState(t, database)
		emptyUserID := createIntegrationListUser(t, users.NewRepository(database), integrationListEmptyGitHubID)
		firstList := createIntegrationList(t, repository, ownerID, "First")
		secondList := createIntegrationList(t, repository, ownerID, "Second")
		otherList := createIntegrationList(t, repository, otherUserID, "Other")

		ownerLists, err := repository.GetAllListByUserId(ownerID)
		if err != nil {
			t.Fatalf("GetAllListByUserId(owner): %v", err)
		}
		assertIntegrationLists(t, ownerLists, []lists.List{firstList, secondList})

		otherLists, err := repository.GetAllListByUserId(otherUserID)
		if err != nil {
			t.Fatalf("GetAllListByUserId(other user): %v", err)
		}
		assertIntegrationLists(t, otherLists, []lists.List{otherList})

		emptyLists, err := repository.GetAllListByUserId(emptyUserID)
		if err != nil {
			t.Fatalf("GetAllListByUserId(empty user): %v", err)
		}
		if emptyLists == nil || len(emptyLists) != 0 {
			t.Fatalf("empty user's lists = %+v, want non-nil empty slice", emptyLists)
		}
	})

	t.Run("list names are unique per owner", func(t *testing.T) {
		ownerID, otherUserID := resetListIntegrationState(t, database)
		firstList := createIntegrationList(t, repository, ownerID, "Shared name")
		duplicateList := lists.List{Name: firstList.Name}

		testutil.AssertPostgresErrorCode(t, repository.Create(ownerID, &duplicateList), integrationUniqueViolation)
		createIntegrationList(t, repository, otherUserID, firstList.Name)
	})

	t.Run("every operation isolates lists owned by another user", func(t *testing.T) {
		ownerID, otherUserID := resetListIntegrationState(t, database)

		forgedOwner := lists.List{UserId: otherUserID, Name: "Explicit owner wins"}
		if err := repository.Create(ownerID, &forgedOwner); err != nil {
			t.Fatalf("Create(): %v", err)
		}
		if forgedOwner.UserId != ownerID {
			t.Fatalf("Create() user ID = %d, want %d", forgedOwner.UserId, ownerID)
		}
		if _, err := repository.GetById(otherUserID, forgedOwner.Id); !errors.Is(err, lists.ErrListNotFound) {
			t.Fatalf("other user's GetById(created list) error = %v, want %v", err, lists.ErrListNotFound)
		}

		otherList := createIntegrationList(t, repository, otherUserID, "Private list")
		if _, err := repository.GetById(ownerID, otherList.Id); !errors.Is(err, lists.ErrListNotFound) {
			t.Fatalf("GetById(foreign list) error = %v, want %v", err, lists.ErrListNotFound)
		}

		foreignUpdate := lists.List{Id: otherList.Id, Name: "Hijacked"}
		if err := repository.UpdateName(ownerID, &foreignUpdate); !errors.Is(err, lists.ErrListNotFound) {
			t.Fatalf("UpdateName(foreign list) error = %v, want %v", err, lists.ErrListNotFound)
		}
		storedOtherList, err := repository.GetById(otherUserID, otherList.Id)
		assertIntegrationList(t, storedOtherList, err, otherList)

		if err := repository.Delete(ownerID, otherList.Id); !errors.Is(err, lists.ErrListNotFound) {
			t.Fatalf("Delete(foreign list) error = %v, want %v", err, lists.ErrListNotFound)
		}
		storedOtherList, err = repository.GetById(otherUserID, otherList.Id)
		assertIntegrationList(t, storedOtherList, err, otherList)

		ownerLists, err := repository.GetAllListByUserId(ownerID)
		if err != nil {
			t.Fatalf("GetAllListByUserId(owner): %v", err)
		}
		assertIntegrationLists(t, ownerLists, []lists.List{forgedOwner})
		otherLists, err := repository.GetAllListByUserId(otherUserID)
		if err != nil {
			t.Fatalf("GetAllListByUserId(other user): %v", err)
		}
		assertIntegrationLists(t, otherLists, []lists.List{otherList})
	})

	t.Run("missing lists return ErrListNotFound", func(t *testing.T) {
		ownerID, _ := resetListIntegrationState(t, database)
		operations := []struct {
			name string
			run  func() error
		}{
			{name: "read", run: func() error { _, err := repository.GetById(ownerID, integrationMissingListID); return err }},
			{name: "update", run: func() error {
				list := lists.List{Id: integrationMissingListID, Name: "Missing"}
				return repository.UpdateName(ownerID, &list)
			}},
			{name: "delete", run: func() error { return repository.Delete(ownerID, integrationMissingListID) }},
		}
		for _, operation := range operations {
			t.Run(operation.name, func(t *testing.T) {
				if err := operation.run(); !errors.Is(err, lists.ErrListNotFound) {
					t.Fatalf("error = %v, want %v", err, lists.ErrListNotFound)
				}
			})
		}
	})
}

func resetListIntegrationState(t *testing.T, database *sql.DB) (int64, int64) {
	t.Helper()
	testutil.ResetTestDB(t, database)
	repository := users.NewRepository(database)
	ownerID := createIntegrationListUser(t, repository, integrationListOwnerGitHubID)
	otherUserID := createIntegrationListUser(t, repository, integrationListOtherGitHubID)
	return ownerID, otherUserID
}

func createIntegrationListUser(t *testing.T, repository *users.Repository, githubID int64) int64 {
	t.Helper()
	user := users.User{GithubID: githubID, GithubUserName: "integration-user"}
	if err := repository.Save(&user); err != nil {
		t.Fatalf("UserRepository.Save(%d): %v", githubID, err)
	}
	return user.ID
}

func createIntegrationList(t *testing.T, repository *lists.Repository, userID int64, name string) lists.List {
	t.Helper()
	list := lists.List{Name: name}
	if err := repository.Create(userID, &list); err != nil {
		t.Fatalf("Create(%q): %v", name, err)
	}
	if list.Id == 0 || list.UserId != userID || list.CreatedAt.IsZero() {
		t.Fatalf("created list = %+v, want populated ID, owner %d, and creation time", list, userID)
	}
	return list
}

func assertIntegrationList(t *testing.T, actual *lists.List, err error, expected lists.List) {
	t.Helper()
	if err != nil {
		t.Fatalf("GetById(): %v", err)
	}
	if *actual != expected {
		t.Fatalf("list = %+v, want %+v", *actual, expected)
	}
}

func assertIntegrationLists(t *testing.T, actual []lists.List, expected []lists.List) {
	t.Helper()
	actual = slices.Clone(actual)
	expected = slices.Clone(expected)
	slices.SortFunc(actual, func(left lists.List, right lists.List) int { return cmp.Compare(left.Id, right.Id) })
	slices.SortFunc(expected, func(left lists.List, right lists.List) int { return cmp.Compare(left.Id, right.Id) })
	if !slices.Equal(actual, expected) {
		t.Fatalf("lists = %+v, want %+v", actual, expected)
	}
}
