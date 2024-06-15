package lists

import (
	"time"

	"github.com/mbashem/cftracker/backend/internal/db"
)

type List struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Name      string    `json:"name" validate:"required"`
	CreatedAt time.Time `json:"created_at"`
}

type ListItem struct {
	ListID    int64     `json:"list_id" validate:"required"`
	ProblemID string    `json:"problem_id" validate:"required"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
}

type ListWithItem struct {
	List
	Items []ListItem `json:"items"`
}

// Create a new list
func (list *List) create() error {
	query := `INSERT INTO lists (user_id, name) VALUES ($1, $2) RETURNING id, created_at`
	return db.DB.QueryRow(query, list.UserID, list.Name).Scan(&list.ID, &list.CreatedAt)
}

// Update list name
func (list *List) updateName() error {
	query := `UPDATE lists SET name = $1 WHERE id = $2`
	_, err := db.DB.Exec(query, list.Name, list.ID)
	return err
}

// Delete a list by ID
func (list *List) delete() error {
	query := `DELETE FROM lists WHERE id = $1`
	_, err := db.DB.Exec(query, list.ID)
	return err
}

// get list items
func (list *List) getItems() ([]ListItem, error) {
	return getListItems(list.ID)
}

// Add a problem to a list
func (item *ListItem) AddToList() error {
	query := `INSERT INTO list_items (list_id, problem_id, position) VALUES ($1, $2, $3)`
	_, err := db.DB.Exec(query, item.ListID, item.ProblemID, item.Position)
	return err
}

// Delete a problem from a list
func (item *ListItem) deleteFromList() error {
	query := `DELETE FROM list_items WHERE list_id = $1, problem_id = $2`
	_, err := db.DB.Exec(query, item.ListID, item.ProblemID)
	return err
}

// get list object of a item
func (item *ListItem) getList() (*List, error) {
	return getListByID(item.ListID)
}

// Reorder problems in a list
// func reorderListItems(listID int64, newOrder []int64) error {
// 	for pos, itemID := range newOrder {
// 		query := `UPDATE list_items SET position = $1 WHERE problem_id = $2 AND list_id = $3`
// 		_, err := db.DB.Exec(query, pos, itemID, listID)
// 		if err != nil {
// 			return err
// 		}
// 	}
// 	return nil
// }

// Get a list by ID
func getListByID(listID int64) (*List, error) {
	list := &List{}
	query := `SELECT id, user_id, name, created_at FROM lists WHERE id = $1`
	err := db.DB.QueryRow(query, listID).Scan(&list.ID, &list.UserID, &list.Name, &list.CreatedAt)
	return list, err
}

// Get all lists of a user
func getAllListByUserID(userID int64) ([]List, error) {
	lists := []List{}
	query := `SELECT id, user_id, name, created_at FROM lists WHERE user_id = $1`
	rows, err := db.DB.Query(query, userID)
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

// Get all problems in a list
func getListItems(listID int64) ([]ListItem, error) {
	items := []ListItem{}
	query := `SELECT list_id, problem_id, position, created_at FROM list_items WHERE list_id = $1`
	rows, err := db.DB.Query(query, listID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var item ListItem
		if err := rows.Scan(&item.ListID, &item.ProblemID, &item.Position, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
