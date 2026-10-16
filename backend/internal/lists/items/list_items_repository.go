package items

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/mbashem/cftracker/backend/internal/limits"
)

var ErrListNotFound = errors.New("list not found")

type ListItemRepository interface {
	Create(ctx context.Context, userId int64, item *ListItem) error
	Delete(ctx context.Context, userId int64, item *ListItem) error
	GetItems(ctx context.Context, userId int64, listId int64) ([]ListItem, error)
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
		INSERT INTO list_items (list_id, problem_id, position)
		SELECT id, $2, $3
		FROM lists
		WHERE id = $1 AND user_id = $4
		RETURNING list_id, created_at
	`
	if err := listQueryError(transaction.QueryRowContext(ctx,
		query,
		item.ListId,
		item.ProblemId,
		item.Position,
		userId,
	).Scan(&item.ListId, &item.CreatedAt)); err != nil {
		return err
	}
	return transaction.Commit()
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
		SELECT lists.id, list_items.problem_id, list_items.position, list_items.created_at
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
		var (
			ownedListId int64
			problemId   sql.NullString
			position    sql.NullInt64
			createdAt   sql.NullTime
		)
		if err := rows.Scan(&ownedListId, &problemId, &position, &createdAt); err != nil {
			return nil, err
		}
		listFound = true
		if !problemId.Valid {
			continue
		}

		item := ListItem{
			ListId:    ownedListId,
			ProblemId: problemId.String,
			Position:  int(position.Int64),
			CreatedAt: createdAt.Time,
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

func listQueryError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrListNotFound
	}
	return err
}
