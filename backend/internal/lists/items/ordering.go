package items

import (
	"errors"

	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/limits"
)

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

// CollectionResult returns affected positions, or the whole list's positions when Rebalanced is true.
type CollectionResult struct {
	Rebalanced bool          `json:"rebalanced"`
	Order      []OrderedItem `json:"order"`
	Added      []ListItem    `json:"added,omitempty"`
	Duplicates []string      `json:"duplicate_problem_ids,omitempty"`
	Removed    []string      `json:"removed_problem_ids,omitempty"`
	Absent     []string      `json:"absent_problem_ids,omitempty"`
}

// ValidateMoves rejects malformed batches before list locking or position calculation.
func ValidateMoves(moves []Move) error {
	if len(moves) == 0 || len(moves) > limits.ItemsPerList {
		return ErrInvalidOperation
	}
	for _, move := range moves {
		if move.ProblemID == "" || move.Before != nil && move.After != nil {
			return ErrInvalidOperation
		}
		for _, anchor := range []*string{move.Before, move.After} {
			if anchor != nil && *anchor == move.ProblemID {
				return ErrInvalidOperation
			}
		}
	}
	return nil
}

// PositionBetween calculates a sparse destination and signals when its gaps need redistribution.
// A missing right neighbor is represented by MaxPosition.
func PositionBetween(left, right int64) (int64, bool) {
	minimumGap := configs.MinimumListPositionGap()
	position := left + (right-left)/2
	if right == MaxPosition && left <= MaxPosition-configs.ListPositionGap {
		position = left + configs.ListPositionGap
	}
	return position, position-left < minimumGap || right-position < minimumGap
}

// InsertionGap maximizes bounded spacing; append reserves aligned multiples of the configured gap.
// Zero means rescale before insertion; a positive tight gap means insert first, then rescale.
func InsertionGap(left int64, right *int64, count int) (int64, bool) {
	if count < 1 || count > limits.ItemsPerList || left < 0 || left > MaxPosition {
		return 0, true
	}
	var gap int64
	if right == nil {
		gap = configs.ListPositionGap
		base := left - left%gap
		if int64(count) > (MaxPosition-base)/gap {
			return 0, true
		}
		first, last := base+gap, base+int64(count)*gap
		return gap, first-left < configs.MinimumListPositionGap() || MaxPosition-last < gap
	} else {
		if *right <= left || *right > MaxPosition {
			return 0, true
		}
		gap = (*right - left) / int64(count+1)
	}
	if gap < 1 {
		return 0, true
	}
	minimumGap := configs.MinimumListPositionGap()
	return gap, gap < minimumGap
}

// AssignRanks applies a validated positive gap; append alignment starts at the next multiple above left.
func AssignRanks(left, gap int64, count int, alignToGap bool) []int64 {
	if alignToGap {
		left -= left % gap
	}
	ranks := make([]int64, count)
	for index := range ranks {
		ranks[index] = left + int64(index+1)*gap
	}
	return ranks
}
