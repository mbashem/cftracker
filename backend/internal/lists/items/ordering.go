package items

import (
	"errors"
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

// Move identifies an item and an optional relative anchor; no anchor means append.
type Move struct {
	ProblemID string  `json:"problem_id"`
	Before    *string `json:"before_problem_id,omitempty"`
	After     *string `json:"after_problem_id,omitempty"`
}

// OrderedItem pairs a stable problem key with its sparse rank, not an array index.
type OrderedItem struct {
	ProblemID string `json:"problem_id"`
	Position  int64  `json:"position"`
}

// CollectionResult returns committed mutation details and the complete lightweight list order.
type CollectionResult struct {
	Rebalanced bool          `json:"rebalanced"`
	Order      []OrderedItem `json:"order"`
	Added      []ListItem    `json:"added,omitempty"`
	Skipped    []string      `json:"skipped_problem_ids,omitempty"`
	Removed    []string      `json:"removed_problem_ids,omitempty"`
	Absent     []string      `json:"absent_problem_ids,omitempty"`
}

// ValidateProblemID checks a canonical opaque key; provider-specific parsing belongs to the frontend.
func ValidateProblemID(id string) error {
	if id == "" || id != strings.TrimSpace(id) || !utf8.ValidString(id) || strings.ContainsRune(id, 0) || utf8.RuneCountInString(id) > 100 {
		return ErrInvalidOperation
	}
	return nil
}

// ValidateMoves rejects malformed batches before list locking or position calculation.
func ValidateMoves(moves []Move) error {
	if len(moves) == 0 || len(moves) > limits.ItemsPerList {
		return ErrInvalidOperation
	}
	for _, move := range moves {
		if err := ValidateProblemID(move.ProblemID); err != nil {
			return err
		}
		if move.Before != nil && move.After != nil {
			return ErrInvalidOperation
		}
		for _, anchor := range []*string{move.Before, move.After} {
			if anchor != nil {
				if err := ValidateProblemID(*anchor); err != nil {
					return err
				}
				if *anchor == move.ProblemID {
					return ErrInvalidOperation
				}
			}
		}
	}
	return nil
}

// PositionBetween calculates a sparse destination and signals when its gaps need redistribution.
// A missing right neighbor is represented by MaxPosition.
func PositionBetween(left, right int64) (int64, bool) {
	position := left + (right-left)/2
	if right == MaxPosition && left <= MaxPosition-PositionGap {
		position = left + PositionGap
	}
	return position, position-left < MinimumPositionGap || right-position < MinimumPositionGap
}

// rebalanceOrder assigns evenly spaced positions to every item in its current slice order.
func rebalanceOrder(order []OrderedItem) {
	for index := range order {
		order[index].Position = int64(index+1) * PositionGap
	}
}
