---
name: update-shared-codeforces-contests
description: Process or resume an operator-confirmed shared Codeforces contest through the manage-contests MCP server. Use when a shared contest has concluded and its contest mappings, problems, and related.ts data need updating; do not use for generic Codeforces questions or manage-contests code changes.
---

# Update Shared Codeforces Contests

Process exactly one operator-confirmed shared-contest group through the manage-contests MCP server.

Before executing or resuming this workflow, read [references/workflow-scenarios.md](references/workflow-scenarios.md). The scenarios define the expected behavior at ambiguous, rejected, failed, and resumed states.

## Connect the server

If the MCP tools are unavailable, start `npm run dev -- -H 127.0.0.1 -p 3000` from `manage-contests` in a persistent command-line session. Reuse an existing server when one is already running. Wait for Next.js to report readiness, then reconnect and retry the MCP operation.

Keep a server started by this workflow running through confirmation and any same-conversation resume. Stop only that workflow-started process after successful completion or when the operator cancels the workflow. If startup or reconnection fails, stop that process, report the failure, and stop the workflow; do not substitute direct database, HTTP, or source-code operations.

## Invariants

- Call every MCP tool sequentially. Do not parallelize calls.
- Process only one candidate group per confirmation.
- A group is a non-empty `contestIds` array; one contest ID is valid.
- Do not call `list_shared_contest_groups` during candidate discovery. `list_ungrouped_contests` already excludes grouped contests.
- Do not call standalone `sync_contest_problems` during this workflow. It remains available for separate problem-only requests.
- Treat every successful response as completed and `isError: true` as failure.
- Stop on the first failed tool call. Do not perform any later step in that turn.
- Keep progress only in the current conversation. Do not create a checkpoint file or require a new persistence mechanism.

## Discover and confirm

1. Call `sync_contests`.
2. Call `list_ungrouped_contests`.
3. Identify exactly one group that plausibly belongs to the concluded shared event:
   - Treat an operator-supplied contest name as the strongest anchor.
   - Compare the event or name stem and complementary division, rating, or round labels.
   - Use nearby contest IDs only as supporting evidence, never as the sole reason to group contests.
   - Exclude contests whose names indicate a different event even if their IDs are adjacent.
4. If one group cannot be selected confidently, ask for the exact contest name or IDs. Do not present multiple candidate groups for one confirmation.
5. Present one `contestIds` array with its IDs and names sorted ascending. State that the smallest ID will be the parent and ask the operator to confirm that every listed contest belongs to the same group.

A correction, rejection, or ambiguous reply is not confirmation. Do not call `sync_shared_contest_group` before confirmation. If the array changes, present it again and request fresh confirmation.

## Execute the confirmed workflow

1. Call `sync_shared_contest_group` once with the exact confirmed `contestIds`.
2. Call `write_related_ts` once. Omit `outputPath` to use the default; pass it only when the operator supplied a destination.
3. Report the parent, group members, mapping results, synchronized problem counts, written path, and related-problem count.

`sync_shared_contest_group` owns the internal sequence: it sorts IDs ascending, uses the smallest ID as parent, maps the parent to itself followed by its children, then waits two seconds immediately before each serial problem synchronization. Do not add client-side waits or reproduce those internal calls.

## Stop and resume

After each successful call, update the conversation checkpoint with:

- the confirmed `contestIds`;
- whether `sync_shared_contest_group` completed;
- whether `write_related_ts` completed;
- the intended `outputPath`, if the operator supplied one;
- the first failed or incomplete tool call, if any.

On failure, report the tool name and arguments, error code/message/retryable value, completed steps, and first incomplete step. Do not call any later tool.

When the operator asks to resume in the same conversation:

- reuse the exact confirmed array without asking for confirmation again;
- repeat `sync_shared_contest_group` with the same array if it failed or its result was uncertain;
- retry only `write_related_ts` if group synchronization completed;
- reuse the confirmed `outputPath` when retrying `write_related_ts`;
- if confirmation was still pending, ask for it because a resume request is not confirmation;
- ask for confirmation again only if the array changes.

Repeating the composite group operation is safe because it is idempotent and may replay completed internal work.
