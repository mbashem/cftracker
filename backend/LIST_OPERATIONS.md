# List ordering and bulk operations

The backend assigns sparse `BIGINT` positions. The default gap is `2^30` (1,073,741,824). Positions remain positive and at most `2^53 - 1`, so existing JavaScript clients can compare returned JSON numbers exactly. An indexed, deferred unique constraint protects `(list_id, position)`; reads return canonical ascending position order.

List capacity and spacing policy live together in [`configs/lists.go`](configs/lists.go): `MaxItemsPerList`, `ListPositionGap`, and `ListMinimumGapFloor`. These are centralized code settings, not environment variables. `MinimumListPositionGap()` uses the larger of the configured floor and the next power of two strictly above the list capacity. The current 1,000-item capacity produces a 1,024 minimum gap; increasing capacity to 2,000 automatically raises it to 2,048. Keep the normal gap at least as large as the derived minimum and ensure a full rescaled list fits the position range; unit tests check these invariants. Migration 6 retains its original spacing as historical schema setup; later rescaling uses the current configuration.

Adding inserts the complete batch before one optional existing problem; omitting the anchor prepends. Deletion leaves gaps. A move uses the same rank allocator to place the selection between the destination neighbors. Any valid integer position can be used first, including spacing of one. If the resulting spacing is below the configured minimum (currently `2^10`), the write is followed by SQL rescaling of the whole list. Exhausted space is repaired before retrying the write. Rescaling preserves practice records and creation timestamps; only changed positions refresh `updated_at`.

Every list item/order writer locks the owned parent list inside a `READ COMMITTED` transaction and commits the entire operation. The shared transaction helper handles ownership, locking, commit, and rollback without reading item collections. Ordinary moves look up the destination bounds, skipping selected items when finding the adjacent neighbor. The backend assigns ranks in request order and updates the selection in one SQL statement. The update returns the matched IDs so the backend can report missing selections. The common rescaling method updates stored positions with SQL `ROW_NUMBER() OVER (ORDER BY position) × 2^30`, scoped by list ID; it does not rebuild an array in Go. Only rescaling loads the complete resulting order for the response. Concurrent moves execute sequentially against current database state; there is no revision or stale-edit rejection contract. Practice PATCH retains its independent field-update behavior.

## Move a selection

`POST /api/v1/lists/:listId/items/move`

```json
{"problem_ids":["1900A","1900B"],"before_problem_id":"1900F"}
```

Send one or more distinct `problem_ids` and at most one shared anchor, `before_problem_id` or `after_problem_id`. The selected items move together in the order given in `problem_ids`. Omit both anchors or pass null to move the group to the end. An anchor must belong to the same owned list and be outside the selection. The update refreshes the selected items’ timestamps. Missing selected IDs are reported in `absent_problem_ids`. Matched items still move, and missing IDs may leave gaps because ranks are assigned before the update. The backend uses the same rescaling rules as bulk addition: rescale before the update when the full request has no room, or after at least one item moves if spacing is too tight. A missing destination anchor returns `409`.

## Bulk addition

`POST /api/v1/lists/:listId/items`

```json
{"before_problem_id":"1900F","items":[{"problem_id":"1900A","status":"solved","time_spent":2100,"notes":"Invariant"},{"problem_id":"1900B"}]}
```

Records use the five optional [practice fields](PRACTICE_RECORDS.md). Position and other list item/timestamp properties are rejected. One optional `before_problem_id` applies to every new item, preserving their request order. Omit it or pass null to insert the batch at the beginning of the list. For a request that passes the quota check, the anchor is looked up exactly as supplied and must already exist in the owned list; a missing anchor, including an empty string, returns `404` without writing anything. Malformed JSON types return `400`. There is no after-anchor input. The backend does not query whether requested problems already exist. One bulk INSERT uses `ON CONFLICT ON CONSTRAINT list_items_pkey DO NOTHING`: duplicate problems are skipped individually, while other items are inserted. The `200` response reports duplicate input occurrences in `duplicate_problem_ids`; it does not silently discard them. This includes both existing problems and repeated IDs within the request after trimming. Stored practice data for duplicate problems is preserved. Other failures, including validation errors, quota overflow, and unexpected database errors, still roll the operation back. Import/export and CSV processing belong entirely to the frontend. Copy is not implemented.

The owned-list lock query supplies the stored `lists.item_count`. Before anchor lookup, rank allocation, rescaling, or insertion, the backend checks `item_count + len(input) <= ItemsPerList`, treating every input occurrence as a new item. If that projected count exceeds capacity, the complete request returns `409` without writes; no subset is processed, and duplicates do not reduce the projected count. A full list therefore rejects even a duplicate-only request. Once admitted, the batch uses one INSERT, reports duplicate occurrences, and increments the stored counter only by successfully inserted rows. The sender is responsible for avoiding unnecessary duplicate inputs. No count scan is needed; removal decrements the counter by rows returned from DELETE. Duplicate-only additions, absent removals, ordinary moves, and practice edits leave it unchanged unless rescaling reconciles drift. Every rescale verifies the counter using all ranked rows, including items whose position stays unchanged, and updates it only if the count differs. This reconciliation shares the rank calculation's row set rather than rescanning the item table. Failed operations roll back counter repair and item changes together. List deletion cascades to its items and removes the counter with the parent row. No trigger maintains this value, and it is not exposed in list API models.

After locking the list, one position query finds the anchor through `(list_id, problem_id)` and its immediate predecessor through `(list_id, position)` using `ORDER BY position DESC LIMIT 1`. Without an anchor, the lower bound is zero and an ascending index lookup reads only the first position as the upper bound; an empty list has no upper bound. The unique constraint from migration 6 supplies the B-tree position index; no additional index is needed. These lookups support logarithmic index seeks and do not count or aggregate list items. Database uniqueness enforcement detects and skips duplicate problems during insertion; there is no preliminary ID lookup. Normal additions perform work proportional to the incoming batch and its index lookups, rather than scanning the stored list for quota or rank calculation. Rescaling still processes the whole list when needed. An actual execution plan has not been measured by unit tests.

For `n` incoming items between positions `A` and `B`, the allocator chooses the maximum integer spacing `floor((B-A)/(n+1))`; bounded gaps are not rounded to powers of two or capped at the normal append gap. It then assigns `A+gap`, `A+2*gap`, and so on. This reserves spacing on both sides of the batch. Ranks are assigned to all input occurrences before insertion; a skipped duplicate can leave an unused rank, and successful records retain request order. An omitted/null anchor or an explicit first-item anchor uses zero as the lower bound and the first item's position as the upper bound. A gap of one is accepted in a bounded interval: insert the complete batch first, then rescale if its gap is below `2^10`. SQL then assigns evenly spaced ranks to every stored item, including the newly inserted batch. A maintained gap of 1,024 has 1,023 available positions, exceeding the 1,000-item request limit; normal bounded batches therefore fit before rescaling. A defensive fallback handles legacy/direct-SQL data with no available rank: rescale first, reread only the position bounds, and insert.

For an empty list, both the first item and the right bound are absent. The allocator then uses the configured gap `G`, assigning `G`, `2G`, and so on. Its unbounded allocation rule starts at the next multiple of `G` strictly above the left bound. Nonempty additions always have a right bound: either the explicit anchor or the first item. If the complete batch cannot fit, rescale before insertion; if it fits with spacing below the minimum, insert and then rescale. The single INSERT and any rescaling share the same transaction. Every rescale returns all problem IDs and final positions with `rebalanced: true`; new records in `added` also contain their final saved positions.

## Bulk removal

`POST /api/v1/lists/:listId/items/remove`

```json
{"problem_ids":["1900A","1900B"]}
```

Removes the selected list items and practice records atomically. `DELETE ... RETURNING problem_id` identifies removed IDs without loading surviving items. Missing IDs are reported as absent. Duplicate IDs are rejected. Surviving positions and timestamps stay unchanged; `order` is `[]`.

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

When `rebalanced` is true, `order` contains every problem ID and final position in the list. Otherwise it contains only newly added items for addition, the updated items' assigned positions for moves, and `[]` for removal or duplicate-only addition. Position entries are sorted by final position. Clients merge these positions into their existing list and apply the added/removed records; a partial `order` is not a replacement list snapshot. Ordinary addition reuses INSERT results, ordinary moves return only the selection, and removal performs no order read. Bulk addition additionally returns complete inserted records in `added` and duplicate occurrences in `duplicate_problem_ids` (in request order, including repeated occurrences; an ID may appear in both `added` and this array when an earlier occurrence was inserted); removal returns `removed_problem_ids` and `absent_problem_ids`, and moves also return `absent_problem_ids` for missing selections. Empty optional result arrays are omitted. The current frontend invalidates and refetches its list query after mutations; other tabs observe changes on refetch.

Bulk addition is the sole add API and repository method. Single additions send a one-item array. Requests that pass the full-input quota check skip and report existing or repeated problems individually in the `200` result; successful new items are retained. A projected quota overflow rejects the entire request with `409` before insertion. The old single-add PUT route and repository adapter are removed; deploy the updated frontend and backend together. Bulk removal is likewise the sole remove API and repository method: single removals send a one-ID array. The old single-item DELETE route and adapter are removed.

Each collection request must contain 1–1,000 entries and exactly one JSON object. Unknown fields and trailing JSON are rejected. Problem IDs are opaque keys; there is no judge-specific format validation. Addition trims IDs and requires 1–100 Unicode code points with no NUL or slash (`/`). Removal trims IDs and rejects empty or duplicate entries without format checks. Moves require distinct, nonempty problem IDs and a valid shared anchor; IDs and anchors are looked up exactly as supplied. Move request validation runs before locking, while item/anchor existence is checked against current database state under the lock. HTTP handlers validate request fields and normalize add/remove IDs and practice fields. Repositories take validated input and enforce ownership, quota, and ordering rules. The three collection endpoints share a [request body cap](USAGE_LIMITS.md#request-bodies). Authentication, existing write-rate limiting, 20 lists per account, and 1,000 items per list remain unchanged.

- `400`: invalid JSON, fields, repeated removal IDs, or invalid move shape.
- `401`: authentication required.
- `404`: missing or unowned list (indistinguishable).
- `409`: missing move anchor or quota exceeded.
- `413`: body cap exceeded.
- `429`: existing rate limit.
- `500`: unexpected repository error; no partial writes.

## Migration and verification

Migration 6 converts positions to `BIGINT`, redistributes existing rows in their previous `(position, created_at, problem_id)` order, and installs range/uniqueness constraints. Practice fields and timestamps are preserved. Rollback redistributes positions to contiguous zero-based integers before restoring `INTEGER`; old numeric positions are not recoverable. Named table rollback targets are unchanged.

Migration 7 adds a nonnegative, non-null `lists.item_count`, defaulting to zero, and backfills it from existing items without changing their data or timestamps. Existing oversized lists retain their full count so further additions remain blocked. Rollback removes only the counter. Direct SQL writers must maintain the counter in the same transaction as item additions/removals. Rescaling reconciles drift when it runs; ordinary writes assume the stored counter is correct, so drift can affect quota enforcement before the next rescale. See [usage limits](USAGE_LIMITS.md) for a drift check.

Apply through migration 7 during a coordinated backend update with previous item writers stopped: older binaries do not maintain the counter, and binaries predating sparse ordering can supply incompatible positions. Remote application and verification remain operator-run. Real database and migration tests require explicit authorization for disposable database setup and cleanup; unit/race checks and integration compilation alone do not prove SQL execution, rollback, or lock behavior.
