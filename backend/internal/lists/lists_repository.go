package lists

import (
	"context"
	"database/sql"
	"errors"
	"time"
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
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `INSERT INTO lists (user_id, name) VALUES ($1, $2) RETURNING id, created_at`
	if err := repository.db.QueryRowContext(ctx, query, userId, list.Name).Scan(&list.Id, &list.CreatedAt); err != nil {
		return err
	}
	list.UserId = userId
	return nil
}

// Update list name
func (repository *Repository) UpdateName(ctx context.Context, userId int64, list *List) error {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `UPDATE lists SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id`
	return listQueryError(repository.db.QueryRowContext(ctx, query, list.Name, list.Id, userId).Scan(&list.Id))
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
	query := `SELECT id, user_id, name, created_at FROM lists WHERE id = $1 AND user_id = $2`
	err := repository.db.QueryRowContext(ctx, query, listId, userId).Scan(&list.Id, &list.UserId, &list.Name, &list.CreatedAt)
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
	query := `SELECT id, user_id, name, created_at FROM lists WHERE user_id = $1`
	rows, err := repository.db.QueryContext(ctx, query, userId)
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

func listQueryError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrListNotFound
	}
	return err
}
