# List-item practice records

Each `(list_id, problem_id)` has one editable practice summary stored directly on `list_items`. The same problem can have independent summaries in different lists. There is no session history or timer. Removing an item deletes its summary; deleting a list cascades to its items and summaries.

The backend validates and stores supplied data. It does not fetch Codeforces submissions, initialize status, infer details, or synchronize practice records. The frontend supplies any initial status it derives from available Codeforces data. Unavailable provider data must not be treated as evidence of no submissions.

## Fields

All five practice fields are nullable and appear explicitly in item responses, alongside the existing membership fields and the newly exposed `updated_at`.

| Field | Accepted values |
| --- | --- |
| `status` | `not_started`, `attempted`, `in_progress`, `solved`, or `null` |
| `help_used` | `none`, `test_case`, `hint`, `editorial`, `solution`, or `null` |
| `solved_on` | Calendar date exactly `YYYY-MM-DD`, years 0001–9999, or `null` |
| `time_spent` | Active seconds as a JSON integer from 0 through 2,147,483,647, or `null` |
| `notes` | Plain text, at most 512 Unicode code points, or `null` |

Status and help are PostgreSQL enums with matching Go types. Values are case-sensitive. Null status means uninitialized, distinct from `not_started`. Null help means not recorded, distinct from `none`. Help is a single summary value in the order None → Test Case → Hint → Editorial → Solution: record the highest level used. Explicit edits may correct it downward or clear it.

All details are independent of status: notes and help can be recorded before solving, and solved items need no date, time, or help. Reopening preserves all omitted details. A solved status never supplies a historical solve date automatically. Future dates are accepted. Zero seconds records zero active time; it does not mean missing. Text whitespace and line breaks are preserved; the empty string is normalized to null. Invalid UTF-8, NUL text, invalid dates, fractional/negative time, and unknown enum values are rejected.

## Add an item

`PUT /api/v1/lists/:listId/item` requires authentication and the existing `problem_id` and `position` fields. Practice fields are optional, so current frontend payloads remain valid and leave the summary uninitialized.

```json
{
  "problem_id": "1900A",
  "position": 0,
  "status": "solved",
  "help_used": "hint",
  "solved_on": "2026-11-09",
  "time_spent": 2100,
  "notes": "Check the invariant first."
}
```

A new membership returns `201`:

```json
{
  "message": "Successfully added item to list",
  "item": {
    "list_id": 12,
    "problem_id": "1900A",
    "position": 0,
    "created_at": "2026-11-09T10:00:00Z",
    "updated_at": "2026-11-09T10:00:00Z",
    "status": "solved",
    "help_used": "hint",
    "solved_on": "2026-11-09",
    "time_spent": 2100,
    "notes": "Check the invariant first."
  }
}
```

A valid duplicate request returns `409 {"error":"Item already in list"}`. It changes no values, position, or timestamps, including when the list is full. Requests are validated before duplicate lookup. New membership inserts retain the existing transactional parent lock and 1,000-item quota.

## Update an item

`PATCH /api/v1/lists/:listId/item/:itemId` is the general item-update endpoint. Its currently editable fields are the five practice fields above; future editable fields can extend the same contract. `itemId` is the URL-encoded problem ID. Omitted fields retain their saved values; explicit `null` clears any practice field, including status. Empty notes also clear notes. This endpoint has no initialization mode or conditional status-write behavior.

```json
{
  "status": "in_progress",
  "notes": null
}
```

This reopens the item and clears notes while retaining its help, solve date, and active time. Success returns `200 {"message":"Item updated","item":...}` with the complete saved item. The update sets `updated_at = CURRENT_TIMESTAMP` in the same SQL statement; even unchanged supplied values refresh the timestamp. `created_at` is preserved. No item timestamp trigger is installed. Existing ordering behavior is unchanged; the internal reorder operation does not update this timestamp.

Empty patches, unknown properties, membership/order/timestamp fields, and trailing JSON are rejected. Validation considers only fields marked as supplied. A successful update uses one ownership-scoped SQL statement built from a fixed allowlist: omitted fields have no assignment or value parameter. Values are bound through positional PostgreSQL parameters. There is no revision token or optimistic concurrency contract.

## Reads, errors, and limits

`GET /api/v1/lists/:listId` retains its `message`, `list`, and `items` envelope and returns complete practice fields for every item. Empty lists remain `[]`. Items remain ordered by position, creation time, and problem ID.

- `400 {"error":"Invalid format"}`: invalid JSON, field types, or PATCH shape.
- `400 {"error":"invalid practice fields"}`: invalid enum/date/time/text values. Repository writes repeat validation; database constraints also enforce valid stored values.
- `401`: authentication required.
- `404 {"error":"Item does not exist"}`: PATCH targets a missing item, missing list, or another user's item. These are intentionally indistinguishable. Other list operations retain their existing `List does not exist` response.
- `409`: duplicate item or existing quota responses for new memberships.
- `500 {"error":"Failed to update item"}`: unexpected update failure; SQL details stay in server logs.

Existing list-name, account/list quotas, 16 KiB body cap, authentication, and write-rate limits remain in force. No Codeforces ownership verification is needed to use lists.

## Migration and verification

Migration `000005_add_list_item_practice` adds nullable columns without backfilling statuses or rewriting existing timestamps. Apply migrations before deploying the new backend. Legacy clients can keep adding and reading items; their response converters ignore the additive fields.

Rolling back version 5 permanently removes practice data and its enum types but preserves memberships, positions, and timestamps. The named `list_items` rollback target remains version 3 and still removes the table. See [migration flow](MIGRATION_FLOW.md).

Unit tests cover validation, presence/null semantics, handlers, routing, and CORS with repository mocks. PostgreSQL tests cover persistence, ownership, independent lists, timestamps, duplicate preservation at quota, clearing, cascades, and constraints. Migration lifecycle tests cover seeded version-4 upgrade, version-5 rollback, and reapplication. Real database checks require explicit setup/cleanup authorization under the repository skills; see [testing](TESTING.md).
