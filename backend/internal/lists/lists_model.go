package lists

import (
	"time"
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
