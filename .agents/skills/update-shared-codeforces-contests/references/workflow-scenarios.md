# Workflow Scenarios

Use these scenarios as behavioral checks when executing the shared-contest workflow. They illustrate decisions; the contest IDs and names are examples.

## 1. Server unavailable

The MCP tools cannot connect.

Expected behavior: report that the externally managed server must be started and that Codex may need a new session or an explicit MCP reconnect. Stop the workflow; do not start or stop the server.

## 2. No contest name supplied

The operator says only that a shared Codeforces contest concluded.

Expected behavior: call `sync_contests`, then `list_ungrouped_contests`. Select exactly one credible group from event/name stems and complementary labels. Never select contests solely because they are newest or adjacent.

## 3. Contest name supplied

The operator names the concluded event.

Expected behavior: use that name as the anchor, while still looking for all ungrouped contests whose names represent complementary versions of the same event. Show the matched IDs and names and ask for confirmation. Do not assume that one exact-name match is the complete group.

## 4. Ambiguous candidates

Two different ungrouped sets could plausibly match the operator's wording.

Expected behavior: ask for the exact contest name or IDs. Do not present multiple groups under one confirmation and do not call `sync_shared_contest_group`.

## 5. Rejected or corrected confirmation

The operator rejects the proposal or replaces one contest ID.

Expected behavior: make no mappings for the rejected set. Re-evaluate the correction, show the complete revised set and proposed smallest parent, and obtain fresh confirmation.

## 6. Single-contest group

Only contest `2130` belongs in the group.

Expected behavior: present `contestIds: [2130]` and request confirmation. After confirmation, call `sync_shared_contest_group` with that array. The server self-maps `2130`, waits two seconds, and synchronizes its problems.

## 7. Successful group

The operator confirms contests `2130` and `2129`.

Expected calls:

1. `sync_shared_contest_group({ contestIds: [2129, 2130] })`
2. `write_related_ts({})`

The client does not add waits or call standalone `sync_contest_problems`; the composite tool owns that work.

After `write_related_ts` succeeds, leave the externally managed Next.js process running.

## 8. Composite failure and resume

`sync_shared_contest_group` fails during an internal mapping or problem synchronization.

Expected behavior: stop without calling `write_related_ts`. Record the confirmed array and failed composite call. On same-conversation resume, call `sync_shared_contest_group` again with the exact same array; do not request confirmation again.

## 9. File-write failure and resume

Mappings and all problem synchronizations succeed, but `write_related_ts` fails.

Expected behavior: stop and report only the write as incomplete. On resume, retry `write_related_ts`; do not repeat confirmed mappings or problem synchronization unless the previous response was uncertain.

## 10. Uncertain composite response

A composite call was sent, but no success or error response was received.

Expected behavior: mark `sync_shared_contest_group` incomplete. On resume, repeat it with the same confirmed array because the operation is idempotent; never skip directly to `write_related_ts`.

## 11. Mapping conflict

`sync_shared_contest_group` reports that one contest belongs to a different parent.

Expected behavior: stop and report the conflict for operator resolution. Do not call `write_related_ts`.

## 12. Add a child to an existing group

The operator confirms that contest `2131` belongs to the existing group whose self-mapped parent is `2129`.

Expected calls:

1. `sync_shared_contest_group({ contestIds: [2131], parentContestId: 2129 })`
2. `write_related_ts({})`

The server maps and synchronizes only contest `2131`. It rejects the operation if `2129` is not a self-mapped parent or if `2131` already belongs to a different parent.
The explicit parent may also be numerically higher than the child; numeric ordering is enforced only when the server chooses the parent because `parentContestId` was omitted.
