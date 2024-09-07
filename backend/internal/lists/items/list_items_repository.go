package items

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

// Get list items
func (repository *Repository) GetItems(listId int64) ([]ListItem, error) {
	return repository.GetListItems(listId)
}

// Add a problem to a list
func (repository *Repository) Create(item *ListItem) error {
	query := `INSERT INTO list_items (list_id, problem_id, position) VALUES ($1, $2, $3)`
	_, err := repository.db.Exec(query, item.ListId, item.ProblemId, item.Position)
	return err
}

// Delete a problem from a list
func (repository *Repository) Delete(item *ListItem) error {
	query := `DELETE FROM list_items WHERE list_id = $1 AND problem_id = $2`
	_, err := repository.db.Exec(query, item.ListId, item.ProblemId)
	return err
}

// Reorder problems in a list
func (repository *Repository) ReorderListItems(listId int64, newOrder []int64) error {
	for pos, itemId := range newOrder {
		query := `UPDATE list_items SET position = $1 WHERE problem_id = $2 AND list_id = $3`
		_, err := repository.db.Exec(query, pos, itemId, listId)
		if err != nil {
			return err
		}
	}
	return nil
}

// Get all problems in a list
func (repository *Repository) GetListItems(listId int64) ([]ListItem, error) {
	items := []ListItem{}
	query := `SELECT list_id, problem_id, position, created_at FROM list_items WHERE list_id = $1`
	rows, err := repository.db.Query(query, listId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var item ListItem
		if err := rows.Scan(&item.ListId, &item.ProblemId, &item.Position, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
