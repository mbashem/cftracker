//go:build integration

package items_test

import (
	"database/sql"
	"errors"
	"slices"
	"strings"
	"testing"

	"github.com/mbashem/cftracker/backend/internal/lists"
	listitems "github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/testutil"
	"github.com/mbashem/cftracker/backend/internal/users"
)

const (
	integrationItemOwnerGitHubID   = int64(9001)
	integrationItemOtherGitHubID   = int64(9002)
	integrationMissingItemListID   = int64(999999)
	integrationItemUniqueViolation = "23505"
)

type listItemIntegrationState struct {
	database       *sql.DB
	repository     *listitems.Repository
	listRepository *lists.Repository
	ownerID        int64
	otherUserID    int64
	ownerListID    int64
	otherListID    int64
}

func TestListItemRepositoryIntegration(t *testing.T) {
	database := testutil.OpenTestDB(t)

	t.Run("create read and delete persist exact item values", func(t *testing.T) {
		state := newListItemIntegrationState(t, database)
		firstItem := createIntegrationListItem(t, state.repository, state.ownerID, state.ownerListID, "1845A", 4)
		secondItem := createIntegrationListItem(t, state.repository, state.ownerID, state.ownerListID, "1845B", 0)

		storedItems, err := state.repository.GetItems(state.ownerID, state.ownerListID)
		if err != nil {
			t.Fatalf("GetItems(): %v", err)
		}
		assertIntegrationListItems(t, storedItems, []listitems.ListItem{firstItem, secondItem})

		if err := state.repository.Delete(state.ownerID, &firstItem); err != nil {
			t.Fatalf("Delete(): %v", err)
		}
		storedItems, err = state.repository.GetItems(state.ownerID, state.ownerListID)
		if err != nil {
			t.Fatalf("GetItems() after Delete(): %v", err)
		}
		assertIntegrationListItems(t, storedItems, []listitems.ListItem{secondItem})
	})

	t.Run("duplicate problems are rejected only within the same list", func(t *testing.T) {
		state := newListItemIntegrationState(t, database)
		firstItem := createIntegrationListItem(t, state.repository, state.ownerID, state.ownerListID, "1845A", 0)
		duplicateItem := listitems.ListItem{ListId: state.ownerListID, ProblemId: firstItem.ProblemId, Position: 1}

		testutil.AssertPostgresErrorCode(t, state.repository.Create(state.ownerID, &duplicateItem), integrationItemUniqueViolation)
		createIntegrationListItem(t, state.repository, state.otherUserID, state.otherListID, firstItem.ProblemId, 0)
	})

	t.Run("owned empty lists return a non-nil empty slice", func(t *testing.T) {
		state := newListItemIntegrationState(t, database)

		storedItems, err := state.repository.GetItems(state.ownerID, state.ownerListID)
		if err != nil {
			t.Fatalf("GetItems(): %v", err)
		}
		if storedItems == nil || len(storedItems) != 0 {
			t.Fatalf("items = %+v, want non-nil empty slice", storedItems)
		}
	})

	t.Run("deleting an absent item from an owned list is idempotent", func(t *testing.T) {
		state := newListItemIntegrationState(t, database)
		item := createIntegrationListItem(t, state.repository, state.ownerID, state.ownerListID, "1845A", 0)

		for deletion := 1; deletion <= 2; deletion++ {
			if err := state.repository.Delete(state.ownerID, &item); err != nil {
				t.Fatalf("Delete() call %d: %v", deletion, err)
			}
		}
		storedItems, err := state.repository.GetItems(state.ownerID, state.ownerListID)
		if err != nil {
			t.Fatalf("GetItems(): %v", err)
		}
		assertIntegrationListItems(t, storedItems, nil)
	})

	t.Run("foreign ownership blocks every read and mutation", func(t *testing.T) {
		state := newListItemIntegrationState(t, database)
		firstItem := createIntegrationListItem(t, state.repository, state.ownerID, state.ownerListID, "1845A", 3)
		secondItem := createIntegrationListItem(t, state.repository, state.ownerID, state.ownerListID, "1845B", 7)
		expectedItems := []listitems.ListItem{firstItem, secondItem}

		foreignItem := listitems.ListItem{ListId: state.ownerListID, ProblemId: "1845C", Position: 9}
		if err := state.repository.Create(state.otherUserID, &foreignItem); !errors.Is(err, listitems.ErrListNotFound) {
			t.Fatalf("Create(foreign list) error = %v, want %v", err, listitems.ErrListNotFound)
		}
		if _, err := state.repository.GetItems(state.otherUserID, state.ownerListID); !errors.Is(err, listitems.ErrListNotFound) {
			t.Fatalf("GetItems(foreign list) error = %v, want %v", err, listitems.ErrListNotFound)
		}
		if err := state.repository.Delete(state.otherUserID, &firstItem); !errors.Is(err, listitems.ErrListNotFound) {
			t.Fatalf("Delete(foreign list) error = %v, want %v", err, listitems.ErrListNotFound)
		}
		if err := state.repository.ReorderListItems(
			state.otherUserID,
			state.ownerListID,
			[]string{secondItem.ProblemId, firstItem.ProblemId},
		); !errors.Is(err, listitems.ErrListNotFound) {
			t.Fatalf("ReorderListItems(foreign list) error = %v, want %v", err, listitems.ErrListNotFound)
		}

		storedItems, err := state.repository.GetItems(state.ownerID, state.ownerListID)
		if err != nil {
			t.Fatalf("owner GetItems(): %v", err)
		}
		assertIntegrationListItems(t, storedItems, expectedItems)
	})

	t.Run("missing lists return ErrListNotFound from every operation", func(t *testing.T) {
		state := newListItemIntegrationState(t, database)
		operations := []struct {
			name string
			run  func() error
		}{
			{name: "create", run: func() error {
				item := listitems.ListItem{ListId: integrationMissingItemListID, ProblemId: "1845A"}
				return state.repository.Create(state.ownerID, &item)
			}},
			{name: "read", run: func() error {
				_, err := state.repository.GetItems(state.ownerID, integrationMissingItemListID)
				return err
			}},
			{name: "delete", run: func() error {
				item := listitems.ListItem{ListId: integrationMissingItemListID, ProblemId: "1845A"}
				return state.repository.Delete(state.ownerID, &item)
			}},
			{name: "reorder", run: func() error {
				return state.repository.ReorderListItems(state.ownerID, integrationMissingItemListID, []string{"1845A"})
			}},
		}
		for _, operation := range operations {
			t.Run(operation.name, func(t *testing.T) {
				if err := operation.run(); !errors.Is(err, listitems.ErrListNotFound) {
					t.Fatalf("error = %v, want %v", err, listitems.ErrListNotFound)
				}
			})
		}
	})

	t.Run("reorder updates positions for an owned list", func(t *testing.T) {
		state := newListItemIntegrationState(t, database)
		firstItem := createIntegrationListItem(t, state.repository, state.ownerID, state.ownerListID, "1845A", 8)
		secondItem := createIntegrationListItem(t, state.repository, state.ownerID, state.ownerListID, "1845B", 9)
		thirdItem := createIntegrationListItem(t, state.repository, state.ownerID, state.ownerListID, "1845C", 10)

		if err := state.repository.ReorderListItems(state.ownerID, state.ownerListID, []string{
			thirdItem.ProblemId,
			firstItem.ProblemId,
			secondItem.ProblemId,
		}); err != nil {
			t.Fatalf("ReorderListItems(): %v", err)
		}
		firstItem.Position = 1
		secondItem.Position = 2
		thirdItem.Position = 0

		storedItems, err := state.repository.GetItems(state.ownerID, state.ownerListID)
		if err != nil {
			t.Fatalf("GetItems(): %v", err)
		}
		assertIntegrationListItems(t, storedItems, []listitems.ListItem{firstItem, secondItem, thirdItem})
	})

	t.Run("deleting a list cascades to its items", func(t *testing.T) {
		state := newListItemIntegrationState(t, database)
		createIntegrationListItem(t, state.repository, state.ownerID, state.ownerListID, "1845A", 0)

		if err := state.listRepository.Delete(state.ownerID, state.ownerListID); err != nil {
			t.Fatalf("ListRepository.Delete(): %v", err)
		}
		var itemCount int
		if err := state.database.QueryRow(
			`SELECT COUNT(*) FROM list_items WHERE list_id = $1`,
			state.ownerListID,
		).Scan(&itemCount); err != nil {
			t.Fatalf("count cascaded list items: %v", err)
		}
		if itemCount != 0 {
			t.Fatalf("items after list deletion = %d, want 0", itemCount)
		}
		if _, err := state.repository.GetItems(state.ownerID, state.ownerListID); !errors.Is(err, listitems.ErrListNotFound) {
			t.Fatalf("GetItems() after list deletion error = %v, want %v", err, listitems.ErrListNotFound)
		}
	})
}

func newListItemIntegrationState(t *testing.T, database *sql.DB) listItemIntegrationState {
	t.Helper()
	testutil.ResetTestDB(t, database)
	userRepository := users.NewRepository(database)
	listRepository := lists.NewRepository(database)
	ownerID := createIntegrationItemUser(t, userRepository, integrationItemOwnerGitHubID)
	otherUserID := createIntegrationItemUser(t, userRepository, integrationItemOtherGitHubID)
	return listItemIntegrationState{
		database:       database,
		repository:     listitems.NewRepository(database),
		listRepository: listRepository,
		ownerID:        ownerID,
		otherUserID:    otherUserID,
		ownerListID:    createIntegrationItemList(t, listRepository, ownerID, "Owner list"),
		otherListID:    createIntegrationItemList(t, listRepository, otherUserID, "Other list"),
	}
}

func createIntegrationItemUser(t *testing.T, repository *users.Repository, githubID int64) int64 {
	t.Helper()
	user := users.User{GithubID: githubID, GithubUserName: "integration-user"}
	if err := repository.Save(&user); err != nil {
		t.Fatalf("UserRepository.Save(%d): %v", githubID, err)
	}
	return user.ID
}

func createIntegrationItemList(t *testing.T, repository *lists.Repository, userID int64, name string) int64 {
	t.Helper()
	list := lists.List{Name: name}
	if err := repository.Create(userID, &list); err != nil {
		t.Fatalf("ListRepository.Create(%q): %v", name, err)
	}
	return list.Id
}

func createIntegrationListItem(
	t *testing.T,
	repository *listitems.Repository,
	userID int64,
	listID int64,
	problemID string,
	position int,
) listitems.ListItem {
	t.Helper()
	item := listitems.ListItem{ListId: listID, ProblemId: problemID, Position: position}
	if err := repository.Create(userID, &item); err != nil {
		t.Fatalf("Create(%q): %v", problemID, err)
	}
	if item.ListId != listID || item.CreatedAt.IsZero() {
		t.Fatalf("created item = %+v, want list %d and populated creation time", item, listID)
	}
	return item
}

func assertIntegrationListItems(t *testing.T, actual []listitems.ListItem, expected []listitems.ListItem) {
	t.Helper()
	actual = slices.Clone(actual)
	expected = slices.Clone(expected)
	sortItems := func(items []listitems.ListItem) {
		slices.SortFunc(items, func(left listitems.ListItem, right listitems.ListItem) int {
			return strings.Compare(left.ProblemId, right.ProblemId)
		})
	}
	sortItems(actual)
	sortItems(expected)
	if !slices.Equal(actual, expected) {
		t.Fatalf("items = %+v, want %+v", actual, expected)
	}
}
