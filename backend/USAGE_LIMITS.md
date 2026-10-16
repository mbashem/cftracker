# Request, field, and storage limits

These controls complement the [rate limiter](RATE_LIMITING.md). Rate limits bound how frequently operations run; the controls here bound each request and application writes. Collection reads rely on stored data satisfying the write-time quotas.

| Resource | Limit | Enforcement | Failure response |
| --- | --- | --- | --- |
| Incoming request body | 16 KiB (16,384 bytes) | Central middleware before route handlers | `413` with `Request body exceeds 16 KiB` |
| List name | 1–100 Unicode characters after trimming whitespace | Creation/rename handlers and repository writes | `400`; HTTP input validation uses `Invalid format` |
| Lists per account | 20 | Transactional repository creation | `409` with `maximum of 20 lists per account reached` |
| Items per list | 1,000 | Transactional repository creation | `409` with `maximum of 1000 items per list reached` |

The constants and domain errors live in [`internal/limits/limits.go`](internal/limits/limits.go). These are code settings; they are not environment variables. Existing problem-ID validation (100 characters), nonnegative positions, and Codeforces-handle validation (255 characters) remain in their respective handlers.

## Request bodies

[`LimitRequestBody`](internal/middlewares/body_limit.go) is installed once by the central route registrar, before registering health, authentication, or protected API routes. It applies regardless of whether rate limiting is supplied. Ordinary health requests have no body and pass normally.

The middleware reads the bounded body through `http.MaxBytesReader` before any JSON decoder runs, then supplies the buffered bytes to the handler. It does not rely on `Content-Length`: oversized chunked bodies and excessive whitespace after an otherwise valid JSON value also receive `413`. Exactly 16,384 bytes is allowed. Other body-read failures return `400` without exposing transport details.

The cap limits bytes, not request duration or concurrent connections. Hosting proxy and HTTP server timeout protections remain separate deployment concerns.

For a body of `n` bytes and cap `B`, the middleware's read takes `O(min(n, B + 1))` CPU work and `O(min(n, B + 1))` buffer space, allowing for allocation overhead. With the fixed 16 KiB cap, oversized inputs have bounded work and memory. Network waiting time is separate from this computational complexity. The handler's subsequent JSON decoding makes another pass over the bounded buffer.

The wrappers preserve the request body's `io.ReadCloser` interface: `http.MaxBytesReader` enforces the byte cap; `io.ReadAll` produces a byte slice; `bytes.NewReader` reads that slice without copying it; `io.NopCloser` adds the `Close` method required by `Request.Body`. Creating the last two wrappers takes constant time and space.

## Names and quota concurrency

Names are trimmed before checking length. Unicode characters are counted as code points, not bytes or visual grapheme clusters. Both creation and renaming use the same normalization. Repository writes repeat validation so internal callers cannot bypass it.

List creation locks the account's `users` row with `FOR UPDATE`. Item creation locks the owned `lists` row. In each case, a separate bounded count query runs after the lock, followed by the insert and commit in the same transaction. Transactions explicitly use `READ COMMITTED`: the count sees inserts committed by requests that held the lock previously. All steps share the repository operation's existing request context and database timeout.

```mermaid
sequenceDiagram
    participant A as Request A
    participant B as Request B
    participant DB as PostgreSQL
    Note over A,DB: Account currently has 19 lists
    A->>DB: Begin transaction; lock user row
    B->>DB: Begin transaction; wait for same user row
    A->>DB: Count lists: 19
    A->>DB: Insert list 20; commit
    DB-->>B: Acquire user row lock
    B->>DB: Count lists: 20
    B->>DB: Roll back without inserting
    B-->>B: Return quota error; HTTP 409
```

Only creation is blocked by an exhausted quota. Deletion remains available and restores capacity. Renaming an existing list does not consume a slot. Another account has an independent list quota; each list has an independent item quota. Item ownership is checked before its quota, so another user's full list still appears as `404`.

These invariants cover application repository writes. Direct SQL/imports must respect the same rules or can create oversized data. No existing migration is edited, and no existing data is deleted automatically.

## Complete collection reads

The API returns full stored names and all matching collection records. List reads share one SELECT clause and append their static ownership filters and ordering. List collections are ordered by ID; item collections are ordered by position, creation time, and problem ID. Reads apply no `LEFT`, row `LIMIT`, or quota validation, and do not paginate or silently truncate data.

Collection sizes are bounded by the write-time quotas when all stored data satisfies those invariants. Existing data or direct SQL/imports can exceed them; reads then return the entire collection. This design does not independently bound read memory or response sizes for data written outside the enforced application paths. Inspect and correct existing data before deployment, and require importers to follow the same quotas.

Quota errors use `409` because the stored collection is at capacity. They do not use the rate limiter's `429`/`Retry-After`: waiting alone does not free storage capacity.

## Existing data and deployment

No schema migration is required. Deploy the application changes after inspecting existing data. The following read-only checks identify records requiring review:

```sql
SELECT user_id, COUNT(*) AS list_count
FROM lists GROUP BY user_id HAVING COUNT(*) > 20;

SELECT list_id, COUNT(*) AS item_count
FROM list_items GROUP BY list_id HAVING COUNT(*) > 1000;

SELECT id, user_id, char_length(name) AS name_length
FROM lists WHERE char_length(name) > 100;
```

If existing records exceed these bounds, reads still return them in full. New inserts are blocked while a collection is at or above quota, but deletion remains available; oversized names can be renamed by ID. Review and correct oversized existing data before deployment so read sizes satisfy the intended bounds. The API does not choose which existing data to discard.

## Verification

- [Body middleware tests](tests/unit/middlewares/body_limit_test.go) cover the exact cap, oversized bodies, unknown/false lengths, trailing whitespace, preserved JSON, missing bodies, and transport errors.
- [Central routing tests](tests/unit/routes/rate_limit_test.go) verify that both authentication and protected routes receive the body cap.
- [Name tests](tests/unit/limits/limits_test.go) cover trimming, Unicode boundaries, empty names, and invalid UTF-8.
- [Handler tests](tests/unit/lists/lists_handler_test.go) cover create/rename validation and stable quota responses without leaking wrapped internal errors.
- [PostgreSQL tests](tests/integration/lists/usage_limits_integration_test.go) cover concurrent final-slot inserts, independent quotas, ownership, deletion restoring capacity, and complete reads of existing collections and names.

Follow [TESTING.md](TESTING.md) for commands and disposable test-database requirements. The integration tests seed oversized records deliberately using SQL to verify that reads return stored data without enforcing write-time limits again. Application creation and rename paths enforce their respective invariants.
