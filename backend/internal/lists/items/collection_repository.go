package items

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/lib/pq"
	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/limits"
)

type CollectionRepository interface {
	BulkAdd(context.Context, int64, int64, []ListItem, *string) (*CollectionResult, error)
	MoveItems(context.Context, int64, int64, Move) (*CollectionResult, error)
	BulkRemove(context.Context, int64, int64, []string) (*CollectionResult, error)
}

// withLockedListTransaction checks ownership and supplies the stored count while serializing changes.
func (repository *Repository) withLockedListTransaction(ctx context.Context, userID, listID int64, change func(context.Context, *sql.Tx, int) (*CollectionResult, error)) (*CollectionResult, error) {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	tx, err := repository.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var itemCount int
	if err := tx.QueryRowContext(ctx, `SELECT item_count FROM lists WHERE id=$1 AND user_id=$2 FOR UPDATE`, listID, userID).Scan(&itemCount); err != nil {
		return nil, listQueryError(err)
	}
	result, err := change(ctx, tx, itemCount)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return result, nil
}

// readOrder returns the whole list's final positions after rescaling.
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

// rescaleList redistributes all persisted items in the locked list using their current order.
// It reconciles the stored count from the same ranked rows and preserves unchanged timestamps.
// The modifying CTE runs even when the counter already matches.
func rescaleList(ctx context.Context, tx *sql.Tx, listID int64) error {
	_, err := tx.ExecContext(ctx, `WITH ranked AS (
		SELECT problem_id,row_number() OVER (ORDER BY position)*$2::bigint AS new_position
		FROM list_items WHERE list_id=$1
	), rescaled AS (
		UPDATE list_items AS item SET position=ranked.new_position,updated_at=CURRENT_TIMESTAMP
		FROM ranked WHERE item.list_id=$1 AND item.problem_id=ranked.problem_id
		AND item.position IS DISTINCT FROM ranked.new_position
		RETURNING item.problem_id
	)
	UPDATE lists SET item_count=actual.item_count
	FROM (SELECT count(*) AS item_count FROM ranked) AS actual
	WHERE lists.id=$1 AND lists.item_count IS DISTINCT FROM actual.item_count`, listID, configs.ListPositionGap)
	return err
}

// MoveItems assigns destination ranks in request order and updates the selection in one statement.
func (repository *Repository) MoveItems(ctx context.Context, userID, listID int64, move Move) (*CollectionResult, error) {
	return repository.withLockedListTransaction(ctx, userID, listID, func(ctx context.Context, tx *sql.Tx, _ int) (*CollectionResult, error) {
		left, right, err := moveBounds(ctx, tx, listID, move)
		if err != nil {
			return nil, err
		}
		result := &CollectionResult{}
		count := len(move.ProblemIDs)
		gap, needsRescale := insertionGap(left, right, count)
		if gap == 0 {
			if err := rescaleList(ctx, tx, listID); err != nil {
				return nil, err
			}
			result.Rebalanced = true
			left, right, err = moveBounds(ctx, tx, listID, move)
			if err != nil {
				return nil, err
			}
			gap, needsRescale = insertionGap(left, right, count)
			if gap == 0 {
				return nil, ErrInvalidOperation
			}
		}
		ranks := assignRanks(left, gap, count, right == nil)
		result.Order, result.Absent, err = updatePositions(ctx, tx, listID, move.ProblemIDs, ranks)
		if err != nil {
			return nil, err
		}
		if needsRescale && len(result.Order) > 0 {
			if err := rescaleList(ctx, tx, listID); err != nil {
				return nil, err
			}
			result.Rebalanced = true
		}
		if result.Rebalanced {
			result.Order, err = readOrder(ctx, tx, listID)
			return result, err
		}
		return result, nil
	})
}

// moveBounds finds the destination neighbors after excluding the selected items.
func moveBounds(ctx context.Context, tx *sql.Tx, listID int64, move Move) (int64, *int64, error) {
	var query string
	args := []any{listID, pq.Array(move.ProblemIDs)}
	switch {
	case move.Before != nil:
		query = `SELECT COALESCE((SELECT position FROM list_items
			WHERE list_id=$1 AND problem_id<>ALL($2::text[]) AND position<anchor.position
			ORDER BY position DESC LIMIT 1),0),anchor.position
			FROM list_items AS anchor WHERE anchor.list_id=$1 AND anchor.problem_id=$3`
		args = append(args, *move.Before)
	case move.After != nil:
		query = `SELECT anchor.position,(SELECT position FROM list_items
			WHERE list_id=$1 AND problem_id<>ALL($2::text[]) AND position>anchor.position
			ORDER BY position LIMIT 1)
			FROM list_items AS anchor WHERE anchor.list_id=$1 AND anchor.problem_id=$3`
		args = append(args, *move.After)
	default:
		query = `SELECT COALESCE((SELECT position FROM list_items
			WHERE list_id=$1 AND problem_id<>ALL($2::text[]) ORDER BY position DESC LIMIT 1),0),NULL::bigint`
	}
	var left int64
	var right sql.NullInt64
	if err := tx.QueryRowContext(ctx, query, args...).Scan(&left, &right); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil, ErrOrderConflict
		}
		return 0, nil, err
	}
	if !right.Valid {
		return left, nil, nil
	}
	return left, &right.Int64, nil
}

// updatePositions writes matched ranks and reports absent IDs in request order.
func updatePositions(ctx context.Context, tx *sql.Tx, listID int64, ids []string, ranks []int64) ([]OrderedItem, []string, error) {
	rows, err := tx.QueryContext(ctx, `UPDATE list_items AS item
		SET position=ranks.position,updated_at=CURRENT_TIMESTAMP
		FROM unnest($2::text[], $3::bigint[]) AS ranks(problem_id,position)
		WHERE item.list_id=$1 AND item.problem_id=ranks.problem_id
		RETURNING item.problem_id`, listID, pq.Array(ids), pq.Array(ranks))
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	updated := make(map[string]bool, len(ids))
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, nil, err
		}
		updated[id] = true
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	order := make([]OrderedItem, 0, len(updated))
	var absent []string
	for i, id := range ids {
		if updated[id] {
			order = append(order, OrderedItem{ProblemID: id, Position: ranks[i]})
		} else {
			absent = append(absent, id)
		}
	}
	return order, absent, nil
}

// BulkAdd inserts validated items without existing-ID queries and reports duplicate inputs separately.
// Other failures roll back successful inserts, rescaling, and counter changes together.
func (repository *Repository) BulkAdd(ctx context.Context, userID, listID int64, input []ListItem, before *string) (*CollectionResult, error) {
	return repository.withLockedListTransaction(ctx, userID, listID, func(ctx context.Context, tx *sql.Tx, itemCount int) (*CollectionResult, error) {
		if itemCount+len(input) > limits.ItemsPerList {
			return nil, limits.ErrItemQuota
		}
		left, right, err := insertionBounds(ctx, tx, listID, before)
		if err != nil {
			return nil, err
		}
		gap, needsRescale := insertionGap(left, right, len(input))
		rebalanced := false
		if gap == 0 {
			if err := rescaleList(ctx, tx, listID); err != nil {
				return nil, err
			}
			rebalanced = true
			left, right, err = insertionBounds(ctx, tx, listID, before)
			if err != nil {
				return nil, err
			}
			gap, needsRescale = insertionGap(left, right, len(input))
			if gap == 0 {
				return nil, ErrInvalidOperation
			}
		}
		added, duplicates, err := insertItems(ctx, tx, listID, input, assignRanks(left, gap, len(input), right == nil))
		if err != nil {
			return nil, err
		}
		if len(added) > 0 {
			if _, err := tx.ExecContext(ctx, `UPDATE lists SET item_count=item_count+$2 WHERE id=$1 AND user_id=$3`, listID, len(added), userID); err != nil {
				return nil, err
			}
		}
		if needsRescale && len(added) > 0 {
			if err := rescaleList(ctx, tx, listID); err != nil {
				return nil, err
			}
			rebalanced = true
		}
		result := &CollectionResult{Added: added, Duplicates: duplicates, Rebalanced: rebalanced}
		if rebalanced {
			result.Order, err = readOrder(ctx, tx, listID)
			if err != nil {
				return nil, err
			}
			positions := make(map[string]int64, len(result.Order))
			for _, item := range result.Order {
				positions[item.ProblemID] = item.Position
			}
			for index := range added {
				added[index].Position = positions[added[index].ProblemId]
			}
		} else {
			result.Order = make([]OrderedItem, len(added))
			for index, item := range added {
				result.Order[index] = OrderedItem{ProblemID: item.ProblemId, Position: item.Position}
			}
		}
		return result, nil
	})
}

// insertionBounds reads an anchor and its predecessor; nil uses zero and the first stored rank.
func insertionBounds(ctx context.Context, tx *sql.Tx, listID int64, before *string) (int64, *int64, error) {
	var query string
	var arguments []any
	if before == nil {
		query = `SELECT 0::bigint,(SELECT position FROM list_items
			WHERE list_id=$1 ORDER BY position LIMIT 1)`
		arguments = []any{listID}
	} else {
		query = `SELECT COALESCE((SELECT position FROM list_items
			WHERE list_id=$1 AND position<anchor.position ORDER BY position DESC LIMIT 1),0),anchor.position
			FROM list_items AS anchor WHERE anchor.list_id=$1 AND anchor.problem_id=$2`
		arguments = []any{listID, *before}
	}
	var left int64
	var right sql.NullInt64
	err := tx.QueryRowContext(ctx, query, arguments...).Scan(&left, &right)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil, ErrItemNotFound
	}
	if err != nil {
		return 0, nil, err
	}
	if !right.Valid {
		return left, nil, nil
	}
	return left, &right.Int64, nil
}

// insertItems inserts nonduplicate rows in one statement and reports each conflicting input ID.
// Assigned ranks identify input occurrences, including repeated IDs, without existing-item queries.
// Only the nondeferrable primary key handles conflicts; position uniqueness remains deferred.
func insertItems(ctx context.Context, tx *sql.Tx, listID int64, input []ListItem, ranks []int64) ([]ListItem, []string, error) {
	arguments := []any{listID}
	values := make([]string, len(input))
	for index, item := range input {
		n := len(arguments)
		values[index] = fmt.Sprintf("($1,$%d,$%d,$%d::practice_status,$%d::practice_help,$%d::timestamptz,$%d::integer,$%d::text)", n+1, n+2, n+3, n+4, n+5, n+6, n+7)
		arguments = append(arguments, item.ProblemId, ranks[index], item.Status, item.HelpUsed, item.SolvedOn, item.TimeSpent, item.Notes)
	}
	rows, err := tx.QueryContext(ctx, `INSERT INTO list_items(list_id,problem_id,position,status,help_used,solved_on,time_spent,notes) VALUES `+strings.Join(values, ",")+` ON CONFLICT ON CONSTRAINT list_items_pkey DO NOTHING RETURNING list_id, `+listItemColumns, arguments...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	inserted := make(map[int64]ListItem, len(input))
	for rows.Next() {
		item, _, err := scanListItem(rows)
		if err != nil {
			return nil, nil, err
		}
		inserted[item.Position] = item
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	added := make([]ListItem, 0, len(inserted))
	duplicates := []string{}
	for index, item := range input {
		if saved, exists := inserted[ranks[index]]; exists {
			added = append(added, saved)
		} else {
			duplicates = append(duplicates, item.ProblemId)
		}
	}
	return added, duplicates, nil
}

// BulkRemove deletes selected items by validated IDs and reports absent IDs.
// Surviving positions are preserved; missing or unowned lists are indistinguishable.
func (repository *Repository) BulkRemove(ctx context.Context, userID, listID int64, ids []string) (*CollectionResult, error) {
	return repository.withLockedListTransaction(ctx, userID, listID, func(ctx context.Context, tx *sql.Tx, _ int) (*CollectionResult, error) {
		rows, err := tx.QueryContext(ctx, `DELETE FROM list_items WHERE list_id=$1 AND problem_id=ANY($2::text[]) RETURNING problem_id`, listID, pq.Array(ids))
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		result := &CollectionResult{Order: []OrderedItem{}}
		removed := make(map[string]bool, len(ids))
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err != nil {
				return nil, err
			}
			removed[id] = true
		}
		if err := rows.Err(); err != nil {
			return nil, err
		}
		if err := rows.Close(); err != nil {
			return nil, err
		}
		if len(removed) > 0 {
			if _, err := tx.ExecContext(ctx, `UPDATE lists SET item_count=item_count-$2 WHERE id=$1 AND user_id=$3`, listID, len(removed), userID); err != nil {
				return nil, err
			}
		}
		for _, id := range ids {
			if removed[id] {
				result.Removed = append(result.Removed, id)
			} else {
				result.Absent = append(result.Absent, id)
			}
		}
		return result, nil
	})
}
