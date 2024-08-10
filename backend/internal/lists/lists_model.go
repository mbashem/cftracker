package lists

import (
	"time"

	"github.com/mbashem/cftracker/backend/internal/lists/items"
)

type List struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Name      string    `json:"name" validate:"required"`
	CreatedAt time.Time `json:"created_at"`
}

type ListWithItem struct {
	List
	Items []items.ListItem `json:"items"`
}
