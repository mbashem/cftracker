# manage-contests

`manage-contests` is a personal admin utility for CFTracker contest/problem/shared-contest maintenance.

It is not part of the public CFTracker user-facing app. Treat it as an operator tool for local/admin tasks. It includes actions that fetch Codeforces data, sync saved data, and mutate local admin data.

## Environment

Create `manage-contests/.env`:

```bash
DATABASE_URL=postgres://postgres:postgrespw@localhost:5432/cftracker_manage?sslmode=disable
CF_API_KEY=your_codeforces_api_key
CF_API_SECRET=your_codeforces_api_secret
```

`DATABASE_URL` is used by Prisma. `CF_API_KEY` and `CF_API_SECRET` are only needed for authenticated Codeforces API calls.

## Run Locally

Node.js 22.22 or newer is required.

```bash
cd manage-contests
npm install
npm run dev -- -H 127.0.0.1 -p 3000
```

Open the local URL printed by Next.js in the terminal.

## MCP Server

The Next.js application exposes a Streamable HTTP MCP endpoint at:

```text
http://localhost:3000/api/mcp
```

The server is intended to let Codex or another MCP client perform the same contest-maintenance operations as the admin UI. Start the Next.js server only when MCP access is needed; the MCP server is not a separate long-running process.

### Set up in Codex

The MCP endpoint uses the `DATABASE_URL` from `manage-contests/.env`. Confirm that it points to the database you intend to update before starting the server.

1. Install the application dependencies:

   ```bash
   cd manage-contests
   npm install
   ```

2. Start Next.js on the fixed port expected by the MCP configuration. Keep this terminal running while Codex uses the tools:

   ```bash
   npm run dev -- -H 127.0.0.1 -p 3000
   ```

   Wait until Next.js reports that it is ready. The MCP endpoint is then available at `http://localhost:3000/api/mcp`.

3. In another terminal, register the endpoint with the local Codex client:

   ```bash
   codex mcp add manage-contests --url http://localhost:3000/api/mcp
   codex mcp list
   ```

   `codex mcp list` confirms that the registration exists. The equivalent manual entry in `~/.codex/config.toml` is:

   ```toml
   [mcp_servers.manage-contests]
   url = "http://localhost:3000/api/mcp"
   ```

4. Start a new Codex session after adding the configuration, or reconnect the MCP server from the client. The `manage-contests` tools should then be available to that session.

5. When maintenance is complete, stop Next.js with `Ctrl+C`. The Codex registration can remain in place; it will connect again the next time the Next.js server is started.

If Codex cannot connect, verify that Next.js is still running on port `3000`, that the configured URL ends with `/api/mcp`, and that the server was started before the Codex session tried to connect. Port `3000` is pinned intentionally so Next.js cannot silently select a different port. You can verify the live endpoint with the `tools/list` command under [Manual Inspector checks](#manual-inspector-checks).

The endpoint has no authentication. Keep it bound to your local development environment and do not expose it publicly. See the [official Codex MCP documentation](https://developers.openai.com/codex/mcp/) for Codex-wide MCP configuration details.

### Available tools

The endpoint currently exposes these tools:

| Tool | Purpose | Input |
| --- | --- | --- |
| `sync_contests` | Fetch non-gym Codeforces contests and save them to the database. | None |
| `sync_contest_problems` | Fetch and save one contest and all its problems. | `contestId` |
| `sync_shared_contest_group` | Group one confirmed array of contest IDs and synchronize every contest's problems serially. | `contestIds` |
| `list_ungrouped_contests` | Return contests that do not have a shared-contest mapping. | None |
| `list_problems` | Return all saved problems. | None |
| `list_shared_contest_groups` | Return shared groups with contest and problem details. | None |
| `write_related_ts` | Generate and write `related.ts` to the default or supplied path. | Optional `outputPath` |

`sync_shared_contest_group` accepts exactly one operator-confirmed group. It sorts the IDs, chooses the smallest as parent, creates every mapping serially, and waits two seconds immediately before each serial problem synchronization. A one-ID array is valid and creates a self-mapping.

Codex should use the repository runbook at [`../.agents/skills/update-shared-codeforces-contests/SKILL.md`](../.agents/skills/update-shared-codeforces-contests/SKILL.md). Its reliability scenarios cover candidate ambiguity, rejected confirmation, failures, and same-conversation resume.

### Expected automation workflow

When the operator says that a shared Codeforces contest has concluded, an MCP client should:

1. Call `sync_contests`.
2. Call `list_ungrouped_contests` and identify exactly one candidate group. Do not call `list_shared_contest_groups` for discovery.
3. Present one non-empty `contestIds` array and ask the operator to confirm that every ID belongs to the same group. One ID is allowed.
4. Call `sync_shared_contest_group` once with the confirmed array.
5. Call `write_related_ts` and report the result.

Each call depends on the preceding call. If a tool returns an error, stop the workflow and report the failed step. On same-conversation resume, repeat the composite group call with the same confirmed array if it failed or was uncertain; retry only `write_related_ts` if grouping completed.

### Implementation structure

- `src/app/api/mcp/route.ts` creates the HTTP handler and supplies the real application services.
- `src/features/mcp/McpServer.ts` defines the seven tool contracts and accepts its service dependencies explicitly.
- `src/features/shared-contests/services/GroupContestService.ts` owns confirmed-group mapping, the two-second pre-fetch delay, and serial problem synchronization.
- Service boundaries return `Result<T>` for expected Codeforces, database, validation, and filesystem failures.
- The MCP boundary converts a failed result into `isError: true` with a JSON text payload containing `code`, `message`, and `retryable`.
- The MCP boundary catches an unexpected exception defensively and returns `INTERNAL_ERROR`.

Keep business logic in the existing services. MCP tools should remain thin adapters and should not duplicate database, Codeforces, or file-generation logic.

## Testing MCP

### Automatic Inspector test

The automatic suite starts a random-port HTTP server using the production MCP tool registration and stateful in-memory service implementations. It then invokes the official MCP Inspector CLI as an external process. It does not require Next.js, PostgreSQL, `DATABASE_URL`, Codeforces access, or real file writes.

```bash
cd manage-contests
nvm use 22.22.0
npm run test:mcp:inspection
```

The suite verifies:

- initialization, server identity, and server-wide workflow instructions;
- all seven tool names, titles, descriptions, complete input/output schemas, and annotations;
- the complete sequential shared-contest workflow;
- every tool's success and typed failure behavior;
- idempotent syncing, grouping, listing, and writing;
- single-contest groups, smallest-parent mapping, mapping conflicts, and stop-on-first-failure behavior;
- the two-second delay before every serial group problem synchronization;
- deterministic contest, problem, group, and group-member ordering;
- rejection of unexpected arguments by no-input tools;
- default and supplied `related.ts` paths;
- real serialization to a temporary file, including overwrite and filesystem-error behavior;
- typed Codeforces, database, and filesystem errors;
- Inspector exit code `5` for tool failures; and
- conversion of unexpected exceptions to `INTERNAL_ERROR`.

### Manual Inspector checks

Start the application first:

```bash
npm run dev -- -H 127.0.0.1 -p 3000
```

List the available tools:

```bash
npx @modelcontextprotocol/inspector --cli \
  http://localhost:3000/api/mcp \
  --transport http \
  --method tools/list \
  --format json
```

Call a tool without input:

```bash
npx @modelcontextprotocol/inspector --cli \
  http://localhost:3000/api/mcp \
  --transport http \
  --method tools/call \
  --tool-name list_problems \
  --tool-args-json '{}' \
  --format json
```

Call a tool with input:

```bash
npx @modelcontextprotocol/inspector --cli \
  http://localhost:3000/api/mcp \
  --transport http \
  --method tools/call \
  --tool-name sync_contest_problems \
  --tool-args-json '{"contestId":1234}' \
  --format json
```

Manual calls use the database configured for the running Next.js process. Use a separate database URL when manually inspecting destructive tools; the automatic suite always uses fakes.

## Notes

- This tool is intended for admin usage only.
- The MCP route currently has no authentication. Do not expose it as a public deployment.
- Saved admin snapshots live under `src/saved-db/`.
- Prisma schema and migrations live under `src/prisma/`.
