package lists

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/mbashem/cftracker/backend/internal/limits"
)

var ErrListNotFound = errors.New("list not found")

type ListRepository interface {
	Create(ctx context.Context, userId int64, list *List) error
	UpdateName(ctx context.Context, userId int64, list *List) error
	Delete(ctx context.Context, userId int64, listId int64) error
	GetById(ctx context.Context, userId int64, listId int64) (*List, error)
	GetAllListByUserId(ctx context.Context, userId int64) ([]List, error)
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

// Create a new list
func (repository *Repository) Create(ctx context.Context, userId int64, list *List) error {
	name, err := limits.NormalizeListName(list.Name)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	transaction, err := repository.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer transaction.Rollback()
	// Serialize list creation for this account. Count in a separate statement so
	// READ COMMITTED sees any insert committed while this lock was being acquired.
	var ownerID int64
	if err := transaction.QueryRowContext(ctx, `SELECT id FROM users WHERE id = $1 FOR UPDATE`, userId).Scan(&ownerID); err != nil {
		return listQueryError(err)
	}
	var count int
	if err := transaction.QueryRowContext(ctx, `SELECT COUNT(*) FROM (
		SELECT 1 FROM lists WHERE user_id = $1 LIMIT $2
	) AS owned_lists`, userId, limits.ListsPerUser).Scan(&count); err != nil {
		return err
	}
	if count >= limits.ListsPerUser {
		return limits.ErrListQuota
	}
	query := `INSERT INTO lists (user_id, name) VALUES ($1, $2) RETURNING id, created_at`
	if err := transaction.QueryRowContext(ctx, query, userId, name).Scan(&list.Id, &list.CreatedAt); err != nil {
		return err
	}
	if err := transaction.Commit(); err != nil {
		return err
	}
	list.Name = name
	list.UserId = userId
	return nil
}

// Update list name
func (repository *Repository) UpdateName(ctx context.Context, userId int64, list *List) error {
	name, err := limits.NormalizeListName(list.Name)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `UPDATE lists SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id`
	if err := listQueryError(repository.db.QueryRowContext(ctx, query, name, list.Id, userId).Scan(&list.Id)); err != nil {
		return err
	}
	list.Name = name
	return nil
}

// Delete a list by Id
func (repository *Repository) Delete(ctx context.Context, userId int64, listId int64) error {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `DELETE FROM lists WHERE id = $1 AND user_id = $2 RETURNING id`
	return listQueryError(repository.db.QueryRowContext(ctx, query, listId, userId).Scan(&listId))
}

// Get a list by Id
func (repository *Repository) GetById(ctx context.Context, userId int64, listId int64) (*List, error) {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	list := &List{}
	query, arguments := buildListSelectQuery(userId, &listId)
	err := repository.db.QueryRowContext(ctx, query, arguments...).Scan(&list.Id, &list.UserId, &list.Name, &list.CreatedAt)
	if err != nil {
		return nil, listQueryError(err)
	}
	return list, nil
}

// Get all lists of a user
func (repository *Repository) GetAllListByUserId(ctx context.Context, userId int64) ([]List, error) {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	lists := []List{}
	query, arguments := buildListSelectQuery(userId, nil)
	rows, err := repository.db.QueryContext(ctx, query, arguments...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var list List
		if err := rows.Scan(&list.Id, &list.UserId, &list.Name, &list.CreatedAt); err != nil {
			return nil, err
		}
		lists = append(lists, list)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return lists, nil
}

// A nil listId selects all owned lists; any supplied ID remains an exact filter.
func buildListSelectQuery(userId int64, listId *int64) (string, []any) {
	query := `SELECT id, user_id, name, created_at FROM lists WHERE user_id = $1`
	arguments := []any{userId}
	if listId != nil {
		query += ` AND id = $2`
		arguments = append(arguments, *listId)
	} else {
		query += ` ORDER BY id`
	}
	return query, arguments
}

func listQueryError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrListNotFound
	}
	return err
}
