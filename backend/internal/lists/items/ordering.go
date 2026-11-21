package items

import (
	"errors"

	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/limits"
)

// Keep JSON numbers exact for existing JavaScript clients, despite BIGINT storage.
const maxPosition int64 = 1<<53 - 1

var ErrInvalidOperation = errors.New("invalid list operation")
var ErrOrderConflict = errors.New("move anchor no longer exists")

// Move selects items to place together at one destination, or at the end if unanchored.
type Move struct {
	ProblemIDs []string `json:"problem_ids"`
	Before     *string  `json:"before_problem_id,omitempty"`
	After      *string  `json:"after_problem_id,omitempty"`
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

// Validate rejects empty or repeated IDs, multiple anchors, and anchors inside the selection.
func (move Move) Validate() error {
	if len(move.ProblemIDs) == 0 || len(move.ProblemIDs) > limits.ItemsPerList || move.Before != nil && move.After != nil {
		return ErrInvalidOperation
	}
	anchor := move.Before
	if move.After != nil {
		anchor = move.After
	}
	seen := make(map[string]bool, len(move.ProblemIDs))
	for _, id := range move.ProblemIDs {
		if id == "" || seen[id] || anchor != nil && id == *anchor {
			return ErrInvalidOperation
		}
		seen[id] = true
	}
	return nil
}

// insertionGap maximizes bounded spacing; append reserves aligned multiples of the configured gap.
// Zero means rescale before insertion; a positive tight gap means insert first, then rescale.
func insertionGap(left int64, right *int64, count int) (int64, bool) {
	if count < 1 || count > limits.ItemsPerList || left < 0 || left > maxPosition {
		return 0, true
	}
	var gap int64
	if right == nil {
		gap = configs.ListPositionGap
		base := left - left%gap
		if int64(count) > (maxPosition-base)/gap {
			return 0, true
		}
		first, last := base+gap, base+int64(count)*gap
		return gap, first-left < configs.MinimumListPositionGap() || maxPosition-last < gap
	} else {
		if *right <= left || *right > maxPosition {
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

// assignRanks applies a validated positive gap; append alignment starts at the next multiple above left.
func assignRanks(left, gap int64, count int, alignToGap bool) []int64 {
	if alignToGap {
		left -= left % gap
	}
	ranks := make([]int64, count)
	for index := range ranks {
		ranks[index] = left + int64(index+1)*gap
	}
	return ranks
}
