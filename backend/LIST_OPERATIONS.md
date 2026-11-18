# List ordering and bulk operations

The backend assigns sparse `BIGINT` positions. The default gap is `2^30` (1,073,741,824). Positions remain positive and at most `2^53 - 1`, so existing JavaScript clients can compare returned JSON numbers exactly. An indexed, deferred unique constraint protects `(list_id, position)`; reads return canonical ascending position order.

Adding appends. Deletion leaves gaps. A move uses the midpoint between its current destination neighbors; append uses the default gap. Before a move would leave either neighboring gap below `2^10`, the backend redistributes the final order using the default gap. Append also rebalances before reaching the safe numeric ceiling. Rebalancing preserves practice records and creation timestamps; only changed positions refresh `updated_at`.

Every list item/order writer locks the owned parent list inside a `READ COMMITTED` transaction, and commits the entire operation. Ordinary moves query the moved item, anchor, and adjacent rank using database positions. The full order is rebuilt only for redistribution and loaded after mutation for response reconciliation. Concurrent moves execute sequentially against current database state; there is no revision or stale-edit rejection contract. Practice PATCH retains its independent field-update behavior.

## Atomic move batches

`POST /api/v1/lists/:listId/items/move`

```json
{"moves":[{"problem_id":"1900A","before_problem_id":"1900F"},{"problem_id":"1900B","after_problem_id":"1900A"}]}
```

Moves execute in request order. Each entry specifies the moved problem and at most one anchor. Omit both anchors (or supply null) to append. A non-null anchor must exist in the same owned list and differ from the moved item. Repeated moves of the same item are allowed and execute sequentially. Already-satisfied moves leave positions and timestamps unchanged. Any invalid move rolls the entire batch back.

## Bulk addition

`POST /api/v1/lists/:listId/items`

```json
{"items":[{"problem_id":"1900A","status":"solved","time_spent":2100,"notes":"Invariant"},{"problem_id":"1900B"}]}
```

Records use the five optional [practice fields](PRACTICE_RECORDS.md). Position and other list item/timestamp properties are rejected. New records append in input order. Existing records are skipped without changing practice, timestamps, or position, including at quota. Duplicate IDs within a request are rejected after trimming. Every supplied record is validated, including skipped records. Capacity is checked against genuinely new list items; an over-capacity batch writes nothing. Import/export and CSV processing belong entirely to the frontend. Copy is not implemented.

## Bulk removal

`POST /api/v1/lists/:listId/items/remove`

```json
{"problem_ids":["1900A","1900B"]}
```

Removes the selected list items and practice records atomically. Missing IDs are reported as absent. Duplicate IDs are rejected. Surviving positions and timestamps stay unchanged.

## Responses and limits

All three endpoints return `200` after commit, including no-ops:

```json
{
  "rebalanced": true,
  "order": [{"problem_id":"1900B","position":1073741824}],
  "removed_problem_ids": ["1900A"],
  "absent_problem_ids": ["missing"]
}
```

`order` always contains the complete resulting lightweight order and positions, including when no rebalance occurred. The frontend should reconcile its local order from this result. `rebalanced` indicates whether positions were redistributed during the operation. Bulk addition additionally returns complete new records in `added` and IDs in `skipped_problem_ids`; removal returns `removed_problem_ids` and `absent_problem_ids`. Empty optional result arrays are omitted. Other tabs observe changes on refetch.

Bulk addition is the sole add API and repository method. Single additions send a one-item array. Existing items return `200` as skipped IDs. The old single-add PUT route and repository adapter are removed; deploy the updated frontend and backend together. Bulk removal is likewise the sole remove API and repository method: single removals send a one-ID array. The old single-item DELETE route and adapter are removed.

Each collection request must contain 1–1,000 entries and exactly one JSON object. Unknown fields and trailing JSON are rejected. Add/remove IDs are trimmed; move IDs and anchors must already have no surrounding whitespace. All IDs are valid Unicode without NUL and contain 1–100 code points. Move request validation runs before locking, while item/anchor existence is checked against current database state under the lock. Practice validation is repeated in repository writes. The three collection endpoints allow 8 MiB bodies; other endpoints retain 16 KiB. Authentication, existing write-rate limiting, 20 lists per account, and 1,000 items per list remain unchanged.

- `400`: invalid JSON, fields, duplicate input IDs, or invalid move shape.
- `401`: authentication required.
- `404`: missing or unowned list (indistinguishable).
- `409`: missing move item/anchor or quota exceeded.
- `413`: body cap exceeded.
- `429`: existing rate limit.
- `500`: unexpected repository error; no partial writes.

## Migration and verification

Migration 6 converts positions to `BIGINT`, redistributes existing rows in their previous `(position, created_at, problem_id)` order, and installs range/uniqueness constraints. Practice fields and timestamps are preserved. Rollback redistributes positions to contiguous zero-based integers before restoring `INTEGER`; old numeric positions are not recoverable. Named table rollback targets are unchanged.

Apply during a coordinated backend update: the old binary can supply positions incompatible with the new constraints. Remote application and verification remain operator-run. Real database and migration tests require explicit authorization for disposable database setup and cleanup; unit/race checks and integration compilation alone do not prove SQL execution, rollback, or lock behavior.
