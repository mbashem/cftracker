package items

import (
	"context"
	"database/sql"
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

// withOrder serializes membership/order writers and publishes results only after commit.
func (repository *Repository) withOrder(ctx context.Context, userID, listID int64, change func(context.Context, *sql.Tx, []OrderedItem) (*CollectionResult, error)) (*CollectionResult, error) {
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
	rows, err := tx.QueryContext(ctx, `SELECT problem_id, position FROM list_items WHERE list_id=$1 ORDER BY position`, listID)
	if err != nil {
		return nil, err
	}
	order := []OrderedItem{}
	for rows.Next() {
		var item OrderedItem
		if err := rows.Scan(&item.ProblemID, &item.Position); err != nil {
			rows.Close()
			return nil, err
		}
		order = append(order, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	result, err := change(ctx, tx, order)
	if err != nil {
		return nil, err
	}
	// Only changed positions receive an UPDATE; deferred uniqueness permits swaps.
	old := make(map[string]int64, len(order))
	for _, item := range order {
		old[item.ProblemID] = item.Position
	}
	ids, positions := []string{}, []int64{}
	for _, item := range result.Order {
		if position, exists := old[item.ProblemID]; exists && position != item.Position {
			ids = append(ids, item.ProblemID)
			positions = append(positions, item.Position)
		}
	}
	if len(ids) > 0 {
		_, err = tx.ExecContext(ctx, `UPDATE list_items SET position=input.position, updated_at=CURRENT_TIMESTAMP
			FROM unnest($2::text[], $3::bigint[]) AS input(problem_id, position)
			WHERE list_items.list_id=$1 AND list_items.problem_id=input.problem_id`, listID, pq.Array(ids), pq.Array(positions))
		if err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return result, nil
}

func (repository *Repository) MoveItems(ctx context.Context, userID, listID int64, moves []Move) (*CollectionResult, error) {
	return repository.withOrder(ctx, userID, listID, func(ctx context.Context, tx *sql.Tx, order []OrderedItem) (*CollectionResult, error) {
		order, rebalanced, err := ApplyMoves(order, moves)
		return &CollectionResult{Order: order, Rebalanced: rebalanced}, err
	})
}

func (repository *Repository) BulkAdd(ctx context.Context, userID, listID int64, input []ListItem) (*CollectionResult, error) {
	if len(input) == 0 || len(input) > limits.ItemsPerList {
		return nil, ErrInvalidOperation
	}
	input = slices.Clone(input)
	seen := make(map[string]bool, len(input))
	for index := range input {
		id, err := NormalizeProblemID(input[index].ProblemId)
		if err != nil || seen[id] {
			return nil, ErrInvalidOperation
		}
		seen[id] = true
		input[index].ProblemId = id
		if err := input[index].Practice.Normalize(); err != nil {
			return nil, err
		}
	}
	return repository.withOrder(ctx, userID, listID, func(ctx context.Context, tx *sql.Tx, order []OrderedItem) (*CollectionResult, error) {
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
			if len(input) == 1 {
				item, _, err := scanListItem(tx.QueryRowContext(ctx, `SELECT list_id, `+listItemColumns+` FROM list_items WHERE list_id=$1 AND problem_id=$2`, listID, input[0].ProblemId))
				if err != nil {
					return nil, err
				}
				result.existing = &item
			}
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
		for _, item := range added {
			result.Added = append(result.Added, byID[item.ProblemId])
		}
		return result, nil
	})
}

func (repository *Repository) BulkRemove(ctx context.Context, userID, listID int64, ids []string) (*CollectionResult, error) {
	if len(ids) == 0 || len(ids) > limits.ItemsPerList {
		return nil, ErrInvalidOperation
	}
	ids = slices.Clone(ids)
	selected := make(map[string]bool, len(ids))
	for index, id := range ids {
		id, err := NormalizeProblemID(id)
		if err != nil || selected[id] {
			return nil, ErrInvalidOperation
		}
		ids[index] = id
		selected[id] = true
	}
	return repository.withOrder(ctx, userID, listID, func(ctx context.Context, tx *sql.Tx, order []OrderedItem) (*CollectionResult, error) {
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
		_, err := tx.ExecContext(ctx, `DELETE FROM list_items WHERE list_id=$1 AND problem_id=ANY($2::text[])`, listID, pq.Array(ids))
		return result, err
	})
}
