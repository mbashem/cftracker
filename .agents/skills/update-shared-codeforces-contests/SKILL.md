---
name: update-shared-codeforces-contests
description: Process or resume an operator-confirmed shared Codeforces contest through the manage-contests MCP server. Use when a shared contest has concluded and its contest mappings, problems, and related.ts data need updating; do not use for generic Codeforces questions or manage-contests code changes.
---

# Update Shared Codeforces Contests

Process exactly one operator-confirmed shared-contest group through the manage-contests MCP server.

Before executing or resuming this workflow, read [references/workflow-scenarios.md](references/workflow-scenarios.md). The scenarios define the expected behavior at ambiguous, rejected, failed, and resumed states.

## Connect the server

Assume the manage-contests MCP server is started and managed outside this workflow. Do not start, stop, or restart the Next.js process, and do not modify MCP registration or Codex configuration.

If the MCP tools are unavailable, report that the server must be started externally and that Codex may need a new session or an explicit MCP reconnect. Stop the workflow; do not substitute direct database, HTTP, or source-code operations.

## Invariants

- Call every MCP tool sequentially. Do not parallelize calls.
- Process only one candidate group per confirmation.
- A group is a non-empty `contestIds` array; one contest ID is valid. An existing group may be extended by supplying its self-mapped `parentContestId`, regardless of whether that ID is numerically higher or lower than its children.
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
5. Present one `contestIds` array with its IDs and names sorted ascending. For a new group, state that the smallest ID will be the parent. When adding children to an existing group, state the existing `parentContestId`. Ask the operator to confirm the complete operation.

A correction, rejection, or ambiguous reply is not confirmation. Do not call `sync_shared_contest_group` before confirmation. If the array changes, present it again and request fresh confirmation.

## Execute the confirmed workflow

1. Call `sync_shared_contest_group` once with the exact confirmed `contestIds` and include the confirmed `parentContestId` only when extending an existing group.
2. Call `write_related_ts` once. Omit `outputPath` to use the default; pass it only when the operator supplied a destination.
3. Report the parent, group members, mapping results, synchronized problem counts, written path, and related-problem count.

`sync_shared_contest_group` owns the internal sequence: it sorts IDs ascending, uses the supplied existing parent or otherwise the smallest ID as parent, maps each supplied contest, then waits two seconds immediately before each supplied contest's serial problem synchronization. Do not add client-side waits or reproduce those internal calls.

## Stop and resume

After each successful call, update the conversation checkpoint with:

- the confirmed `contestIds`;
- the confirmed `parentContestId`, if supplied;
- whether `sync_shared_contest_group` completed;
- whether `write_related_ts` completed;
- the intended `outputPath`, if the operator supplied one;
- the first failed or incomplete tool call, if any.

On failure, report the tool name and arguments, error code/message/retryable value, completed steps, and first incomplete step. Do not call any later tool.

When the operator asks to resume in the same conversation:

- reuse the exact confirmed array and optional `parentContestId` without asking for confirmation again;
- repeat `sync_shared_contest_group` with the same arguments if it failed or its result was uncertain;
- retry only `write_related_ts` if group synchronization completed;
- reuse the confirmed `outputPath` when retrying `write_related_ts`;
- if confirmation was still pending, ask for it because a resume request is not confirmation;
- ask for confirmation again only if the array or `parentContestId` changes.

Repeating the composite group operation is safe because it is idempotent and may replay completed internal work.
