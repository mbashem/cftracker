//go:build integration

package routes_test

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/lib/pq"
	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/lists"
	"github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/users"
	testutil "github.com/mbashem/cftracker/backend/tests/support"
)

const (
	testDatabaseOperationTimeout = 50 * time.Millisecond
	testDatabaseWaitLimit        = 3 * time.Second
	testDatabaseLockPollInterval = 5 * time.Millisecond
	testPostgresQueryCanceled    = "57014"
)

type databaseContextFixture struct {
	user users.User
	list lists.List
	item items.ListItem
}

type databaseContextOperation struct {
	name string
	run  func(context.Context) error
}

func TestRepositoryDatabaseContextsIntegration(t *testing.T) {
	database := testutil.OpenTestDB(t)
	testutil.ResetTestDB(t, database)
	fixture := newDatabaseContextFixture(t, database)

	t.Run("canceled request prevents every repository operation", func(t *testing.T) {
		for _, operation := range databaseContextOperations(database, fixture, configs.DefaultDatabaseTimeout) {
			t.Run(operation.name, func(t *testing.T) {
				ctx, cancel := context.WithCancel(t.Context())
				cancel()
				if err := operation.run(ctx); !errors.Is(err, context.Canceled) {
					t.Fatalf("operation error = %v, want context.Canceled", err)
				}
			})
		}
	})

	t.Run("timeout bounds waiting for an exhausted pool", func(t *testing.T) {
		database.SetMaxOpenConns(1)
		connection, err := database.Conn(t.Context())
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() {
			connection.Close()
			database.SetMaxOpenConns(10)
		})
		for _, operation := range databaseContextOperations(database, fixture, testDatabaseOperationTimeout) {
			t.Run(operation.name, func(t *testing.T) {
				err := awaitDatabaseOperation(t, func() error { return operation.run(t.Context()) })
				if !errors.Is(err, context.DeadlineExceeded) {
					t.Fatalf("operation error = %v, want context.DeadlineExceeded", err)
				}
			})
		}
	})

	for _, mode := range []struct {
		name           string
		timeout        time.Duration
		cancelInFlight bool
	}{
		{name: "operation timeout interrupts locked queries", timeout: testDatabaseOperationTimeout},
		{name: "request cancellation interrupts locked queries", timeout: configs.DefaultDatabaseTimeout, cancelInFlight: true},
	} {
		t.Run(mode.name, func(t *testing.T) {
			for _, operation := range databaseContextOperations(database, fixture, mode.timeout) {
				t.Run(operation.name, func(t *testing.T) {
					lockDatabaseTables(t, database)
					ctx, cancel := context.WithCancel(t.Context())
					defer cancel()
					err := awaitDatabaseOperation(t, func() error {
						return operation.run(ctx)
					}, func() {
						if mode.cancelInFlight {
							waitForDatabaseLock(t, database)
							cancel()
						}
					})
					assertDatabaseCancellation(t, err)
				})
			}
		})
	}

	// Canceled writes and the reorder transaction must leave persisted state intact.
	stored, err := users.NewRepository(database, configs.DefaultDatabaseTimeout).FindByID(t.Context(), fixture.user.ID)
	if err != nil || *stored != fixture.user {
		t.Fatalf("user after canceled operations = %+v, error = %v", stored, err)
	}
	storedList, err := lists.NewRepository(database, configs.DefaultDatabaseTimeout).GetById(t.Context(), fixture.user.ID, fixture.list.Id)
	if err != nil || *storedList != fixture.list {
		t.Fatalf("list after canceled operations = %+v, error = %v", storedList, err)
	}
	storedItems, err := items.NewRepository(database, configs.DefaultDatabaseTimeout).GetItems(t.Context(), fixture.user.ID, fixture.list.Id)
	if err != nil || len(storedItems) != 1 || storedItems[0] != fixture.item {
		t.Fatalf("items after canceled operations = %+v, error = %v", storedItems, err)
	}
}

func databaseContextOperations(database *sql.DB, fixture databaseContextFixture, timeout time.Duration) []databaseContextOperation {
	userRepository := users.NewRepository(database, timeout)
	listRepository := lists.NewRepository(database, timeout)
	itemRepository := items.NewRepository(database, timeout)
	return []databaseContextOperation{
		{name: "user save", run: func(ctx context.Context) error {
			user := fixture.user
			user.GithubID++
			return userRepository.Save(ctx, &user)
		}},
		{name: "user profile update", run: func(ctx context.Context) error {
			user := fixture.user
			user.GithubUserName = "changed-name"
			return userRepository.Update(ctx, &user)
		}},
		{name: "selected handle update", run: func(ctx context.Context) error {
			user := fixture.user
			return userRepository.UpdateCFHandle(ctx, &user, "different-handle", user.CFVerifiedHandle)
		}},
		{name: "verified handle update", run: func(ctx context.Context) error {
			user := fixture.user
			return userRepository.UpdateCFVerifiedHandle(ctx, &user, user.CFHandle)
		}},
		{name: "admin update", run: func(ctx context.Context) error {
			user := fixture.user
			return userRepository.UpdateAdmin(ctx, &user, true)
		}},
		{name: "user find by ID", run: func(ctx context.Context) error {
			_, err := userRepository.FindByID(ctx, fixture.user.ID)
			return err
		}},
		{name: "user find by GitHub ID", run: func(ctx context.Context) error {
			_, err := userRepository.FindByGitHubID(ctx, fixture.user.GithubID)
			return err
		}},
		{name: "all users", run: func(ctx context.Context) error {
			_, err := userRepository.GetAll(ctx)
			return err
		}},
		{name: "list create", run: func(ctx context.Context) error {
			list := lists.List{Name: "new-list"}
			return listRepository.Create(ctx, fixture.user.ID, &list)
		}},
		{name: "list rename", run: func(ctx context.Context) error {
			list := fixture.list
			list.Name = "changed-list"
			return listRepository.UpdateName(ctx, fixture.user.ID, &list)
		}},
		{name: "list delete", run: func(ctx context.Context) error {
			return listRepository.Delete(ctx, fixture.user.ID, fixture.list.Id)
		}},
		{name: "list read", run: func(ctx context.Context) error {
			_, err := listRepository.GetById(ctx, fixture.user.ID, fixture.list.Id)
			return err
		}},
		{name: "all owned lists", run: func(ctx context.Context) error {
			_, err := listRepository.GetAllListByUserId(ctx, fixture.user.ID)
			return err
		}},
		{name: "item create", run: func(ctx context.Context) error {
			item := fixture.item
			item.ProblemId = "1900B"
			return itemRepository.Create(ctx, fixture.user.ID, &item)
		}},
		{name: "item delete", run: func(ctx context.Context) error {
			item := fixture.item
			return itemRepository.Delete(ctx, fixture.user.ID, &item)
		}},
		{name: "item read", run: func(ctx context.Context) error {
			_, err := itemRepository.GetItems(ctx, fixture.user.ID, fixture.list.Id)
			return err
		}},
		{name: "item read implementation", run: func(ctx context.Context) error {
			_, err := itemRepository.GetListItems(ctx, fixture.user.ID, fixture.list.Id)
			return err
		}},
		{name: "item reorder transaction", run: func(ctx context.Context) error {
			return itemRepository.ReorderListItems(ctx, fixture.user.ID, fixture.list.Id, []string{fixture.item.ProblemId})
		}},
	}
}

func newDatabaseContextFixture(t *testing.T, database *sql.DB) databaseContextFixture {
	t.Helper()
	fixture := databaseContextFixture{
		user: users.User{GithubID: 12001, GithubUserName: "context-owner", Email: "owner@example.test", CFHandle: "tourist"},
		list: lists.List{Name: "context-list"},
		item: items.ListItem{ProblemId: "1900A", Position: 2},
	}
	if err := users.NewRepository(database, configs.DefaultDatabaseTimeout).Save(t.Context(), &fixture.user); err != nil {
		t.Fatal(err)
	}
	if err := lists.NewRepository(database, configs.DefaultDatabaseTimeout).Create(t.Context(), fixture.user.ID, &fixture.list); err != nil {
		t.Fatal(err)
	}
	fixture.item.ListId = fixture.list.Id
	if err := items.NewRepository(database, configs.DefaultDatabaseTimeout).Create(t.Context(), fixture.user.ID, &fixture.item); err != nil {
		t.Fatal(err)
	}
	return fixture
}

func lockDatabaseTables(t *testing.T, database *sql.DB) {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), testDatabaseWaitLimit)
	transaction, err := database.BeginTx(ctx, nil)
	if err != nil {
		cancel()
		t.Fatal(err)
	}
	t.Cleanup(func() {
		transaction.Rollback()
		cancel()
	})
	if _, err := transaction.ExecContext(ctx, "LOCK TABLE users, lists, list_items IN ACCESS EXCLUSIVE MODE"); err != nil {
		t.Fatal(err)
	}
}

func waitForDatabaseLock(t *testing.T, database *sql.DB) {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), testDatabaseWaitLimit)
	defer cancel()
	ticker := time.NewTicker(testDatabaseLockPollInterval)
	defer ticker.Stop()
	for {
		var blocked bool
		err := database.QueryRowContext(ctx, `SELECT EXISTS (
			SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'
		)`).Scan(&blocked)
		if err != nil {
			t.Fatalf("waiting for database lock: %v", err)
		}
		if blocked {
			return
		}
		select {
		case <-ctx.Done():
			t.Fatal("repository query did not wait on the database lock")
		case <-ticker.C:
		}
	}
}

func awaitDatabaseOperation(t *testing.T, operation func() error, afterStart ...func()) error {
	t.Helper()
	result := make(chan error, 1)
	go func() { result <- operation() }()
	for _, callback := range afterStart {
		callback()
	}
	select {
	case err := <-result:
		return err
	case <-time.After(testDatabaseWaitLimit):
		t.Fatal("database operation did not stop within the test deadline")
		return nil
	}
}

func assertDatabaseCancellation(t *testing.T, err error) {
	t.Helper()
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return
	}
	var postgresError *pq.Error
	if !errors.As(err, &postgresError) || string(postgresError.Code) != testPostgresQueryCanceled {
		t.Fatalf("operation error = %v, want context cancellation or PostgreSQL query cancellation", err)
	}
}
