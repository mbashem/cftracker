package items

import (
	"errors"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/mbashem/cftracker/backend/internal/limits"
)

const PositionGap int64 = 1 << 30
const MinimumPositionGap int64 = 1 << 10

// Keep JSON numbers exact for existing JavaScript clients, despite BIGINT storage.
const MaxPosition int64 = 1<<53 - 1

var ErrInvalidOperation = errors.New("invalid list operation")
var ErrOrderConflict = errors.New("move item or anchor no longer exists")

type Move struct {
	ProblemID string  `json:"problem_id"`
	Before    *string `json:"before_problem_id,omitempty"`
	After     *string `json:"after_problem_id,omitempty"`
}

type OrderedItem struct {
	ProblemID string `json:"problem_id"`
	Position  int64  `json:"position"`
}

type CollectionResult struct {
	existing   *ListItem
	Rebalanced bool          `json:"rebalanced"`
	Order      []OrderedItem `json:"order"`
	Added      []ListItem    `json:"added,omitempty"`
	Skipped    []string      `json:"skipped_problem_ids,omitempty"`
	Removed    []string      `json:"removed_problem_ids,omitempty"`
	Absent     []string      `json:"absent_problem_ids,omitempty"`
}

func NormalizeProblemID(id string) (string, error) {
	id = strings.TrimSpace(id)
	if id == "" || !utf8.ValidString(id) || strings.ContainsRune(id, 0) || utf8.RuneCountInString(id) > 100 {
		return "", ErrInvalidOperation
	}
	return id, nil
}

// ApplyMoves calculates against the current order without modifying the caller's slice.
// Empty anchors mean append; before and after are mutually exclusive.
func ApplyMoves(order []OrderedItem, moves []Move) ([]OrderedItem, bool, error) {
	if len(moves) == 0 || len(moves) > limits.ItemsPerList {
		return nil, false, ErrInvalidOperation
	}
	order = slices.Clone(order)
	rebalanced := false
	for _, move := range moves {
		id, err := NormalizeProblemID(move.ProblemID)
		if err != nil || move.Before != nil && move.After != nil {
			return nil, false, ErrInvalidOperation
		}
		anchor := ""
		if move.Before != nil {
			anchor = *move.Before
		}
		if move.After != nil {
			anchor = *move.After
		}
		if move.Before != nil || move.After != nil {
			anchor, err = NormalizeProblemID(anchor)
			if err != nil || anchor == id {
				return nil, false, ErrInvalidOperation
			}
		}
		from := slices.IndexFunc(order, func(item OrderedItem) bool { return item.ProblemID == id })
		if from < 0 {
			return nil, false, ErrOrderConflict
		}
		item := order[from]
		remaining := slices.Delete(slices.Clone(order), from, from+1)
		to := len(remaining)
		if anchor != "" {
			to = slices.IndexFunc(remaining, func(item OrderedItem) bool { return item.ProblemID == anchor })
			if to < 0 {
				return nil, false, ErrOrderConflict
			}
			if move.After != nil {
				to++
			}
		}
		if from == to {
			continue
		}
		left := int64(0)
		if to > 0 {
			left = remaining[to-1].Position
		}
		right := MaxPosition
		if to < len(remaining) {
			right = remaining[to].Position
		}
		if to == len(remaining) && left <= MaxPosition-PositionGap {
			item.Position = left + PositionGap
		} else {
			item.Position = left + (right-left)/2
		}
		order = slices.Insert(remaining, to, item)
		if item.Position-left < MinimumPositionGap || right-item.Position < MinimumPositionGap {
			rebalanceOrder(order)
			rebalanced = true
		}
	}
	return order, rebalanced, nil
}

func rebalanceOrder(order []OrderedItem) {
	for index := range order {
		order[index].Position = int64(index+1) * PositionGap
	}
}
