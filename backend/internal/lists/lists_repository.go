package lists

import (
	"database/sql"
	"errors"
)

var ErrListNotFound = errors.New("list not found")

type ListRepository interface {
	Create(userId int64, list *List) error
	UpdateName(userId int64, list *List) error
	Delete(userId int64, listId int64) error
	GetById(userId int64, listId int64) (*List, error)
	GetAllListByUserId(userId int64) ([]List, error)
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		db: db,
	}
}

// Create a new list
func (repository *Repository) Create(userId int64, list *List) error {
	query := `INSERT INTO lists (user_id, name) VALUES ($1, $2) RETURNING id, created_at`
	if err := repository.db.QueryRow(query, userId, list.Name).Scan(&list.Id, &list.CreatedAt); err != nil {
		return err
	}
	list.UserId = userId
	return nil
}

// Update list name
func (repository *Repository) UpdateName(userId int64, list *List) error {
	query := `UPDATE lists SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id`
	return listQueryError(repository.db.QueryRow(query, list.Name, list.Id, userId).Scan(&list.Id))
}

// Delete a list by Id
func (repository *Repository) Delete(userId int64, listId int64) error {
	query := `DELETE FROM lists WHERE id = $1 AND user_id = $2 RETURNING id`
	return listQueryError(repository.db.QueryRow(query, listId, userId).Scan(&listId))
}

// Get a list by Id
func (repository *Repository) GetById(userId int64, listId int64) (*List, error) {
	list := &List{}
	query := `SELECT id, user_id, name, created_at FROM lists WHERE id = $1 AND user_id = $2`
	err := repository.db.QueryRow(query, listId, userId).Scan(&list.Id, &list.UserId, &list.Name, &list.CreatedAt)
	if err != nil {
		return nil, listQueryError(err)
	}
	return list, nil
}

// Get all lists of a user
func (repository *Repository) GetAllListByUserId(userId int64) ([]List, error) {
	lists := []List{}
	query := `SELECT id, user_id, name, created_at FROM lists WHERE user_id = $1`
	rows, err := repository.db.Query(query, userId)
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
