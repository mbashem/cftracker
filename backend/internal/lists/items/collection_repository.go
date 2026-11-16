package items

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/lib/pq"
	"github.com/mbashem/cftracker/backend/internal/limits"
)

type CollectionRepository interface {
	BulkAdd(context.Context, int64, int64, []ListItem) (*CollectionResult, error)
	MoveItems(context.Context, int64, int64, []Move) (*CollectionResult, error)
	BulkRemove(context.Context, int64, int64, []string) (*CollectionResult, error)
}

// withList serializes item/order changes on the owned list and returns its committed order.
func (repository *Repository) withList(ctx context.Context, userID, listID int64, change func(context.Context, *sql.Tx) (*CollectionResult, error)) (*CollectionResult, error) {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	tx, err := repository.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var ownedID int64
	if err := tx.QueryRowContext(ctx, `SELECT id FROM lists WHERE id=$1 AND user_id=$2 FOR UPDATE`, listID, userID).Scan(&ownedID); err != nil {
		return nil, listQueryError(err)
	}
	result, err := change(ctx, tx)
	if err != nil {
		return nil, err
	}
	result.Order, err = readOrder(ctx, tx, listID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return result, nil
}

// readOrder loads the complete lightweight order for response reconciliation or redistribution.
func readOrder(ctx context.Context, tx *sql.Tx, listID int64) ([]OrderedItem, error) {
	rows, err := tx.QueryContext(ctx, `SELECT problem_id,position FROM list_items WHERE list_id=$1 ORDER BY position`, listID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	order := []OrderedItem{}
	for rows.Next() {
		var item OrderedItem
		if err := rows.Scan(&item.ProblemID, &item.Position); err != nil {
			return nil, err
		}
		order = append(order, item)
	}
	return order, rows.Err()
}

// writePositions persists ranks by stable problem ID; unchanged rows retain their timestamps.
func writePositions(ctx context.Context, tx *sql.Tx, listID int64, order []OrderedItem) error {
	ids, positions := []string{}, []int64{}
	for _, item := range order {
		ids = append(ids, item.ProblemID)
		positions = append(positions, item.Position)
	}
	_, err := tx.ExecContext(ctx, `UPDATE list_items SET position=input.position,updated_at=CURRENT_TIMESTAMP
 FROM unnest($2::text[],$3::bigint[]) AS input(problem_id,position)
 WHERE list_items.list_id=$1 AND list_items.problem_id=input.problem_id
 AND list_items.position IS DISTINCT FROM input.position`, listID, pq.Array(ids), pq.Array(positions))
	return err
}

// MoveItems validates first, then calculates each move from its current database neighbors.
// Only a crowded destination rebuilds the complete order; the batch commits or rolls back together.
func (repository *Repository) MoveItems(ctx context.Context, userID, listID int64, moves []Move) (*CollectionResult, error) {
	if err := ValidateMoves(moves); err != nil {
		return nil, err
	}
	return repository.withList(ctx, userID, listID, func(ctx context.Context, tx *sql.Tx) (*CollectionResult, error) {
		result := &CollectionResult{}
		for _, move := range moves {
			var current int64
			if err := tx.QueryRowContext(ctx, `SELECT position FROM list_items WHERE list_id=$1 AND problem_id=$2`, listID, move.ProblemID).Scan(&current); err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					return nil, ErrOrderConflict
				}
				return nil, err
			}
			left, right := int64(0), MaxPosition
			anchor := move.Before
			if move.After != nil {
				anchor = move.After
			}
			if anchor != nil {
				var rank int64
				if err := tx.QueryRowContext(ctx, `SELECT position FROM list_items WHERE list_id=$1 AND problem_id=$2`, listID, *anchor).Scan(&rank); err != nil {
					if errors.Is(err, sql.ErrNoRows) {
						return nil, ErrOrderConflict
					}
					return nil, err
				}
				if move.Before != nil {
					right = rank
					if err := tx.QueryRowContext(ctx, `SELECT COALESCE(max(position),0) FROM list_items WHERE list_id=$1 AND problem_id<>$2 AND position<$3`, listID, move.ProblemID, rank).Scan(&left); err != nil {
						return nil, err
					}
				} else {
					left = rank
					if err := tx.QueryRowContext(ctx, `SELECT COALESCE(min(position),$4::bigint) FROM list_items WHERE list_id=$1 AND problem_id<>$2 AND position>$3`, listID, move.ProblemID, rank, MaxPosition).Scan(&right); err != nil {
						return nil, err
					}
				}
			} else {
				if err := tx.QueryRowContext(ctx, `SELECT COALESCE(max(position),0) FROM list_items WHERE list_id=$1 AND problem_id<>$2`, listID, move.ProblemID).Scan(&left); err != nil {
					return nil, err
				}
			}
			if current > left && current < right {
				continue
			}
			position, rebalance := PositionBetween(left, right)
			changed := []OrderedItem{{ProblemID: move.ProblemID, Position: position}}
			if rebalance {
				order, err := readOrder(ctx, tx, listID)
				if err != nil {
					return nil, err
				}
				changed = make([]OrderedItem, 0, len(order))
				for _, item := range order {
					if item.ProblemID == move.ProblemID {
						continue
					}
					if move.Before != nil && item.ProblemID == *move.Before {
						changed = append(changed, OrderedItem{ProblemID: move.ProblemID})
					}
					changed = append(changed, item)
					if move.After != nil && item.ProblemID == *move.After {
						changed = append(changed, OrderedItem{ProblemID: move.ProblemID})
					}
				}
				if anchor == nil {
					changed = append(changed, OrderedItem{ProblemID: move.ProblemID})
				}
				rebalanceOrder(changed)
				result.Rebalanced = true
			}
			if err := writePositions(ctx, tx, listID, changed); err != nil {
				return nil, err
			}
		}
		return result, nil
	})
}

// BulkAdd validates the batch and appends new list items in input order under the list lock.
// Existing records are preserved; duplicate input IDs, invalid fields, or excess capacity fail atomically.
func (repository *Repository) BulkAdd(ctx context.Context, userID, listID int64, input []ListItem) (*CollectionResult, error) {
	if len(input) == 0 || len(input) > limits.ItemsPerList {
		return nil, ErrInvalidOperation
	}
	input = slices.Clone(input)
	seen := make(map[string]bool, len(input))
	for index := range input {
		id := strings.TrimSpace(input[index].ProblemId)
		if err := ValidateProblemID(id); err != nil || seen[id] {
			return nil, ErrInvalidOperation
		}
		seen[id] = true
		input[index].ProblemId = id
		if err := input[index].Practice.Normalize(); err != nil {
			return nil, err
		}
	}
	return repository.withList(ctx, userID, listID, func(ctx context.Context, tx *sql.Tx) (*CollectionResult, error) {
		order, err := readOrder(ctx, tx, listID)
		if err != nil {
			return nil, err
		}
		result := &CollectionResult{Order: slices.Clone(order)}
		existing := make(map[string]bool, len(order))
		for _, item := range order {
			existing[item.ProblemID] = true
		}
		added := []ListItem{}
		for _, item := range input {
			if existing[item.ProblemId] {
				result.Skipped = append(result.Skipped, item.ProblemId)
				continue
			}
			added = append(added, item)
			result.Order = append(result.Order, OrderedItem{ProblemID: item.ProblemId})
		}
		if len(added) == 0 {
			return result, nil
		}
		if len(result.Order) > limits.ItemsPerList {
			return nil, limits.ErrItemQuota
		}
		last := int64(0)
		if len(order) > 0 {
			last = order[len(order)-1].Position
		}
		if last > MaxPosition-int64(len(added))*PositionGap-MinimumPositionGap {
			rebalanceOrder(result.Order)
			result.Rebalanced = true
		} else {
			for index := len(order); index < len(result.Order); index++ {
				last += PositionGap
				result.Order[index].Position = last
			}
		}
		arguments := []any{listID}
		values := []string{}
		for index := range added {
			added[index].ListId = listID
			added[index].Position = result.Order[len(order)+index].Position
			item := added[index]
			n := len(arguments)
			values = append(values, fmt.Sprintf("($1,$%d,$%d,$%d::practice_status,$%d::practice_help,$%d::date,$%d::integer,$%d::text)", n+1, n+2, n+3, n+4, n+5, n+6, n+7))
			arguments = append(arguments, item.ProblemId, item.Position, item.Status, item.HelpUsed, item.SolvedOn, item.TimeSpent, item.Notes)
		}
		rows, err := tx.QueryContext(ctx, `INSERT INTO list_items(list_id,problem_id,position,status,help_used,solved_on,time_spent,notes) VALUES `+strings.Join(values, ",")+` RETURNING list_id, `+listItemColumns, arguments...)
		if err != nil {
			return nil, err
		}
		byID := make(map[string]ListItem, len(added))
		for rows.Next() {
			item, _, err := scanListItem(rows)
			if err != nil {
				rows.Close()
				return nil, err
			}
			byID[item.ProblemId] = item
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return nil, err
		}
		if result.Rebalanced {
			if err := writePositions(ctx, tx, listID, result.Order[:len(order)]); err != nil {
				return nil, err
			}
		}
		for _, item := range added {
			result.Added = append(result.Added, byID[item.ProblemId])
		}
		return result, nil
	})
}

// BulkRemove deletes selected list items and practice summaries atomically, reporting absent IDs.
// Surviving positions are preserved; missing or unowned lists are indistinguishable.
func (repository *Repository) BulkRemove(ctx context.Context, userID, listID int64, ids []string) (*CollectionResult, error) {
	if len(ids) == 0 || len(ids) > limits.ItemsPerList {
		return nil, ErrInvalidOperation
	}
	ids = slices.Clone(ids)
	selected := make(map[string]bool, len(ids))
	for index, id := range ids {
		id = strings.TrimSpace(id)
		if err := ValidateProblemID(id); err != nil || selected[id] {
			return nil, ErrInvalidOperation
		}
		ids[index] = id
		selected[id] = true
	}
	return repository.withList(ctx, userID, listID, func(ctx context.Context, tx *sql.Tx) (*CollectionResult, error) {
		order, err := readOrder(ctx, tx, listID)
		if err != nil {
			return nil, err
		}
		result := &CollectionResult{Order: []OrderedItem{}}
		present := make(map[string]bool, len(order))
		for _, item := range order {
			present[item.ProblemID] = true
			if !selected[item.ProblemID] {
				result.Order = append(result.Order, item)
			}
		}
		for _, id := range ids {
			if present[id] {
				result.Removed = append(result.Removed, id)
			} else {
				result.Absent = append(result.Absent, id)
			}
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM list_items WHERE list_id=$1 AND problem_id=ANY($2::text[])`, listID, pq.Array(ids))
		return result, err
	})
}
