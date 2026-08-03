package items

import "time"

type ListItem struct {
	ListId    int64     `json:"list_id"`
	ProblemId string    `json:"problem_id"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
}
