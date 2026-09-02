<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Shared-contest MCP workflow

When asked to process or resume a concluded shared Codeforces contest, use `$update-shared-codeforces-contests` from `../.agents/skills/update-shared-codeforces-contests/SKILL.md`. If its MCP server is unavailable, start `npm run dev -- -H 127.0.0.1 -p 3000` from this directory in a persistent command-line session, wait for Next.js readiness, and reconnect before continuing. Process one confirmed group at a time and do not change application code unless separately requested.
