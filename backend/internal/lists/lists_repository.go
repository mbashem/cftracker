package lists

import (
	"database/sql"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		db: db,
	}
}

// Create a new list
func (repository *Repository) Create(list *List) error {
	query := `INSERT INTO lists (user_id, name) VALUES ($1, $2) RETURNING id, created_at`
	err := repository.db.QueryRow(query, list.UserId, list.Name).Scan(&list.Id, &list.CreatedAt)
	return err
}

// Update list name
func (repository *Repository) UpdateName(list *List) error {
	query := `UPDATE lists SET name = $1 WHERE id = $2`
	_, err := repository.db.Exec(query, list.Name, list.Id)
	return err
}

// Delete a list by Id
func (repository *Repository) Delete(listId int64) error {
	query := `DELETE FROM lists WHERE id = $1`
	_, err := repository.db.Exec(query, listId)
	return err
}

// Get a list by Id
func (repository *Repository) GetById(listId int64) (*List, error) {
	list := &List{}
	query := `SELECT id, user_id, name, created_at FROM lists WHERE id = $1`
	err := repository.db.QueryRow(query, listId).Scan(&list.Id, &list.UserId, &list.Name, &list.CreatedAt)
	return list, err
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
	return lists, nil
}
