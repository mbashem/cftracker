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
	err := repository.db.QueryRow(query, list.UserID, list.Name).Scan(&list.ID, &list.CreatedAt)
	return err
}

// Update list name
func (repository *Repository) UpdateName(list *List) error {
	query := `UPDATE lists SET name = $1 WHERE id = $2`
	_, err := repository.db.Exec(query, list.Name, list.ID)
	return err
}

// Delete a list by ID
func (repository *Repository) Delete(listID int64) error {
	query := `DELETE FROM lists WHERE id = $1`
	_, err := repository.db.Exec(query, listID)
	return err
}

// Get a list by ID
func (repository *Repository) GetByID(listID int64) (*List, error) {
	list := &List{}
	query := `SELECT id, user_id, name, created_at FROM lists WHERE id = $1`
	err := repository.db.QueryRow(query, listID).Scan(&list.ID, &list.UserID, &list.Name, &list.CreatedAt)
	return list, err
}

// Get all lists of a user
func (repository *Repository) GetAllListByUserID(userID int64) ([]List, error) {
	lists := []List{}
	query := `SELECT id, user_id, name, created_at FROM lists WHERE user_id = $1`
	rows, err := repository.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var list List
		if err := rows.Scan(&list.ID, &list.UserID, &list.Name, &list.CreatedAt); err != nil {
			return nil, err
		}
		lists = append(lists, list)
	}
	return lists, nil
}
