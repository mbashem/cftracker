package items

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrListNotFound = errors.New("list not found")
var ErrItemNotFound = errors.New("item not found")

// ErrItemExists accompanies the saved item populated by Create; no data changed.
var ErrItemExists = errors.New("item already in list")

const listItemColumns = `list_items.problem_id, list_items.position, list_items.created_at,
	list_items.updated_at, list_items.status, list_items.help_used,
	to_char(list_items.solved_on, 'YYYY-MM-DD'), list_items.time_spent, list_items.notes`

type ListItemRepository interface {
	CollectionRepository
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
	result, err := repository.BulkAdd(ctx, userId, item.ListId, []ListItem{*item})
	if err != nil {
		return err
	}
	if len(result.Added) == 0 {
		*item = *result.existing
		return ErrItemExists
	}
	*item = result.Added[0]
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
	_, err := repository.BulkRemove(ctx, userId, item.ListId, []string{item.ProblemId})
	return err
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
	item.Position = position.Int64
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
