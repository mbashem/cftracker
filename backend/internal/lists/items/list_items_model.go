package items

import "time"

type ListItem struct {
	ListID    int64     `json:"list_id" validate:"required"`
	ProblemID string    `json:"problem_id" validate:"required"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
}
