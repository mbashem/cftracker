package lists

import (
	"time"

	"github.com/mbashem/cftracker/backend/internal/db"
)

type List struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type ListItem struct {
	ID        int64     `json:"id"`
	ListID    int64     `json:"list_id"`
	ProblemID int64     `json:"problem_id"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
}

// Create a new list
func (list *List) Create() error {
	query := `INSERT INTO lists (user_id, name) VALUES ($1, $2) RETURNING id, created_at`
	return db.DB.QueryRow(query, list.UserID, list.Name).Scan(&list.ID, &list.CreatedAt)
}

// Delete a list by ID
func deleteList(listID int64) error {
	query := `DELETE FROM lists WHERE id = $1`
	_, err := db.DB.Exec(query, listID)
	return err
}

// Add a problem to a list
func (item *ListItem) AddToList() error {
	query := `INSERT INTO list_items (list_id, problem_id, position) VALUES ($1, $2, $3) RETURNING id, created_at`
	return db.DB.QueryRow(query, item.ListID, item.ProblemID, item.Position).Scan(&item.ID, &item.CreatedAt)
}

// Reorder problems in a list
func reorderListItems(listID int64, newOrder []int64) error {
	for pos, itemID := range newOrder {
		query := `UPDATE list_items SET position = $1 WHERE id = $2 AND list_id = $3`
		_, err := db.DB.Exec(query, pos, itemID, listID)
		if err != nil {
			return err
		}
	}
	return nil
}
