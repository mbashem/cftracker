package items

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/mbashem/cftracker/backend/internal/limits"
)

var ErrListNotFound = errors.New("list not found")
var ErrItemNotFound = errors.New("item not found")

// ErrItemExists accompanies the saved item populated by Create; no data changed.
var ErrItemExists = errors.New("item already in list")

const listItemColumns = `list_items.problem_id, list_items.position, list_items.created_at,
	list_items.updated_at, list_items.status, list_items.help_used,
	to_char(list_items.solved_on, 'YYYY-MM-DD'), list_items.time_spent, list_items.notes`

type ListItemRepository interface {
	Create(ctx context.Context, userId int64, item *ListItem) error
	Delete(ctx context.Context, userId int64, item *ListItem) error
	GetItems(ctx context.Context, userId int64, listId int64) ([]ListItem, error)
	Update(ctx context.Context, userId int64, listId int64, problemId string, patch ItemPatch) (*ListItem, error)
}

type Repository struct {
	db      *sql.DB
	timeout time.Duration
}

func NewRepository(db *sql.DB, timeout time.Duration) *Repository {
	return &Repository{
		db:      db,
		timeout: timeout,
	}
}

// Get list items
func (repository *Repository) GetItems(ctx context.Context, userId int64, listId int64) ([]ListItem, error) {
	return repository.GetListItems(ctx, userId, listId)
}

// Add a problem to a list
func (repository *Repository) Create(ctx context.Context, userId int64, item *ListItem) error {
	if err := item.Practice.Normalize(); err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	transaction, err := repository.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer transaction.Rollback()
	// Lock the owned parent before counting to serialize concurrent item inserts.
	var ownedListID int64
	if err := transaction.QueryRowContext(ctx, `SELECT id FROM lists WHERE id = $1 AND user_id = $2 FOR UPDATE`, item.ListId, userId).Scan(&ownedListID); err != nil {
		return listQueryError(err)
	}
	stored, _, err := scanListItem(transaction.QueryRowContext(ctx,
		`SELECT list_id, `+listItemColumns+` FROM list_items WHERE list_id = $1 AND problem_id = $2`, ownedListID, item.ProblemId))
	if err == nil {
		*item = stored
		return ErrItemExists
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	var count int
	if err := transaction.QueryRowContext(ctx, `SELECT COUNT(*) FROM (
		SELECT 1 FROM list_items WHERE list_id = $1 LIMIT $2
	) AS stored_items`, ownedListID, limits.ItemsPerList).Scan(&count); err != nil {
		return err
	}
	if count >= limits.ItemsPerList {
		return limits.ErrItemQuota
	}
	query := `
		INSERT INTO list_items (list_id, problem_id, position, status, help_used, solved_on, time_spent, notes)
		SELECT id, $2, $3, $5::practice_status, $6::practice_help, $7::date, $8::integer, $9::text
		FROM lists
		WHERE id = $1 AND user_id = $4
		RETURNING list_id, ` + listItemColumns
	created, _, err := scanListItem(transaction.QueryRowContext(ctx,
		query,
		item.ListId,
		item.ProblemId,
		item.Position,
		userId,
		item.Status, item.HelpUsed, item.SolvedOn, item.TimeSpent, item.Notes,
	))
	if err != nil {
		return listQueryError(err)
	}
	if err := transaction.Commit(); err != nil {
		return err
	}
	*item = created
	return nil
}

// Update changes only supplied item fields, including explicit nulls.
func (repository *Repository) Update(ctx context.Context, userId int64, listId int64, problemId string, patch ItemPatch) (*ListItem, error) {
	if err := patch.Normalize(); err != nil {
		return nil, err
	}
	if patch.Empty() {
		return nil, ErrInvalidPractice
	}
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	arguments := []any{listId, userId, problemId}
	assignments := []string{"updated_at = CURRENT_TIMESTAMP"}
	// Column names and types come only from this fixed allowlist, never request keys.
	for _, field := range []struct {
		set          bool
		column, kind string
		value        any
	}{
		{patch.Status.Set, "status", "practice_status", patch.Status.Value},
		{patch.HelpUsed.Set, "help_used", "practice_help", patch.HelpUsed.Value},
		{patch.SolvedOn.Set, "solved_on", "date", patch.SolvedOn.Value},
		{patch.TimeSpent.Set, "time_spent", "integer", patch.TimeSpent.Value},
		{patch.Notes.Set, "notes", "text", patch.Notes.Value},
	} {
		if !field.set {
			continue
		}
		arguments = append(arguments, field.value)
		assignments = append(assignments, fmt.Sprintf("%s = $%d::%s", field.column, len(arguments), field.kind))
	}
	query := `UPDATE list_items SET ` + strings.Join(assignments, ", ") + `
		FROM lists WHERE list_items.list_id = lists.id
		AND lists.id = $1 AND lists.user_id = $2 AND list_items.problem_id = $3
		RETURNING list_items.list_id, ` + listItemColumns
	item, _, err := scanListItem(repository.db.QueryRowContext(ctx, query, arguments...))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrItemNotFound
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

// Delete a problem from a list
func (repository *Repository) Delete(ctx context.Context, userId int64, item *ListItem) error {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `
		DELETE FROM list_items
		USING lists
		WHERE list_items.list_id = lists.id
			AND lists.id = $1
			AND lists.user_id = $2
			AND list_items.problem_id = $3
	`

	result, err := repository.db.ExecContext(ctx, query, item.ListId, userId, item.ProblemId)
	if err != nil {
		return err
	}
	rowsDeleted, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsDeleted > 0 {
		return nil
	}

	var listId int64
	query = `SELECT id FROM lists WHERE id = $1 AND user_id = $2`
	if err := repository.db.QueryRowContext(ctx, query, item.ListId, userId).Scan(&listId); err != nil {
		return listQueryError(err)
	}
	if listId != item.ListId {
		return ErrListNotFound
	}
	return nil
}

// Reorder problems in a list
func (repository *Repository) ReorderListItems(ctx context.Context, userId int64, listId int64, newOrder []string) error {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	transaction, err := repository.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer transaction.Rollback()

	var ownedListId int64
	ownershipQuery := `SELECT id FROM lists WHERE id = $1 AND user_id = $2 FOR UPDATE`
	if err := transaction.QueryRowContext(ctx, ownershipQuery, listId, userId).Scan(&ownedListId); err != nil {
		return listQueryError(err)
	}

	for pos, itemId := range newOrder {
		query := `UPDATE list_items SET position = $1 WHERE problem_id = $2 AND list_id = $3`
		_, err := transaction.ExecContext(ctx, query, pos, itemId, ownedListId)
		if err != nil {
			return err
		}
	}
	return transaction.Commit()
}

// Get all problems in a list
func (repository *Repository) GetListItems(ctx context.Context, userId int64, listId int64) ([]ListItem, error) {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	items := []ListItem{}
	query := `
		SELECT lists.id, ` + listItemColumns + `
		FROM lists
		LEFT JOIN list_items ON list_items.list_id = lists.id
		WHERE lists.id = $1 AND lists.user_id = $2
		ORDER BY list_items.position, list_items.created_at, list_items.problem_id
	`
	rows, err := repository.db.QueryContext(ctx, query, listId, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	listFound := false
	for rows.Next() {
		item, present, err := scanListItem(rows)
		if err != nil {
			return nil, err
		}
		listFound = true
		if !present {
			continue
		}

		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if !listFound {
		return nil, ErrListNotFound
	}
	return items, nil
}

func scanListItem(scanner interface{ Scan(...any) error }) (ListItem, bool, error) {
	var item ListItem
	var problemId sql.NullString
	var position sql.NullInt64
	var createdAt, updatedAt sql.NullTime
	err := scanner.Scan(&item.ListId, &problemId, &position, &createdAt, &updatedAt,
		&item.Status, &item.HelpUsed, &item.SolvedOn, &item.TimeSpent, &item.Notes)
	item.ProblemId = problemId.String
	item.Position = int(position.Int64)
	item.CreatedAt = createdAt.Time
	item.UpdatedAt = updatedAt.Time
	return item, problemId.Valid, err
}

func listQueryError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrListNotFound
	}
	return err
}
