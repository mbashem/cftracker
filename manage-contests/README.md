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
npm run dev
```

Open the local URL printed by Next.js in the terminal.

## MCP Server

The Next.js application exposes a Streamable HTTP MCP endpoint at:

```text
http://localhost:3000/api/mcp
```

The server is intended to let Codex or another MCP client perform the same contest-maintenance operations as the admin UI. Start the Next.js server only when MCP access is needed; the MCP server is not a separate long-running process.

The endpoint currently exposes these tools:

| Tool | Purpose | Input |
| --- | --- | --- |
| `sync_contests` | Fetch non-gym Codeforces contests and save them to the database. | None |
| `sync_contest_problems` | Fetch and save one contest and all its problems. | `contestId` |
| `link_contest_to_shared_parent` | Link one contest to a confirmed shared-contest parent. | `parentContestId`, `contestId` |
| `list_ungrouped_contests` | Return contests that do not have a shared-contest mapping. | None |
| `list_problems` | Return all saved problems. | None |
| `list_shared_contest_groups` | Return shared groups with contest and problem details. | None |
| `write_related_ts` | Generate and write `related.ts` to the default or supplied path. | Optional `outputPath` |

Grouping contests automatically is deliberately not exposed. The MCP client must identify the likely contests, obtain operator confirmation, and then create each mapping explicitly.

### Expected automation workflow

When the operator says that a shared Codeforces contest has concluded, an MCP client should:

1. Call `sync_contests`.
2. Inspect the synchronized, ungrouped, and existing shared-contest data to identify the contests that likely belong together.
3. Ask the operator to confirm the proposed contest IDs. Do not create mappings before confirmation.
4. Select the smallest confirmed contest ID as `parentContestId`.
5. Call `link_contest_to_shared_parent` sequentially in ascending contest-ID order. The first call must link the parent to itself, followed by each child contest.
6. Call `sync_contest_problems` for every confirmed contest, sequentially.
7. Call `write_related_ts` and report the result.

Each call depends on the preceding call. If a tool returns an error, stop the workflow and report the failed step. The operator may later request that the same conversation resume from the first incomplete step. Completed idempotent calls can safely be repeated; an existing identical shared-contest link returns `unchanged`.

### Implementation structure

- `src/app/api/mcp/route.ts` creates the HTTP handler and supplies the real application services.
- `src/features/mcp/McpServer.ts` defines the seven tool contracts and accepts its service dependencies explicitly.
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

- initialization and server identity;
- all seven tool names, titles, descriptions, complete input/output schemas, and annotations;
- the complete sequential shared-contest workflow;
- every tool's success and typed failure behavior;
- idempotent syncing, linking, listing, and writing;
- self-mapping, mapping validation, and mapping conflicts;
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
npm run dev
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
