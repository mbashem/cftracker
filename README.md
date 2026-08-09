# CFTracker

CFTracker is a Codeforces companion app for browsing contests and problems, checking solve status for one or more handles, and building practice lists.

Backend setup and development documentation is available in the [backend README](./backend/README.md).

## Features

- Contest grid grouped by contest category, with problem ratings, solve coloring, dates, and random contest selection.
- Problem browser with search, rating range, contest ID range, tags, solve status filters, sorting, pagination, and random problem selection.
- Multi-handle submission sync from Codeforces.
- Stats page with verdict charts, rating breakdowns, contest category solve percentages, and a submissions heat map.
- Dark and light themes.

For local development workflows, see [DEVELOPMENT.md](./DEVELOPMENT.md). For contribution rules and pull request expectations, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Tech Stack

- React 19
- TypeScript 6
- Vite 8
- Redux Toolkit and RTK Query
- Bootstrap and React Bootstrap
- Chart.js and D3

## Requirements

- Node.js 22.22 or newer
- npm 10 or newer

## Frontend Setup

```bash
git clone https://github.com/mbashem/cftracker.git
cd cftracker
npm ci
npm run dev
```

Open the local URL printed by Vite in the terminal.

The frontend does not require environment variables. Contest and shared-problem data are loaded from checked-in generated files. Problemset data is fetched from the public Codeforces API unless debug mode is enabled.

## Frontend Configuration

Create `.env` in the repository root only when enabling debug mode:

```bash
VITE_DEBUG_MODE=true
```

Set `VITE_DEBUG_MODE=true` to use the checked-in problem snapshot and local 30-minute Codeforces API cache while developing. Leave it unset to use live Codeforces problem data.

## Scripts

```bash
npm run dev      # Start the Vite dev server
npm run build    # Build the frontend for production
npm run lint     # Run ESLint
npm run typecheck # Run the TypeScript project check
```

## Data Refresh

Contest and problem snapshots live under `src/data/saved_api`. The scheduled GitHub Action runs the scripts in `scripts/` to refresh generated contest/problem data.

For a manual refresh:

```bash
cd scripts
npm install
node fetch_contests.mjs
node fetch_problems.mjs
```

## Project Layout

```text
src/components/contest/    Contest page hook and modular contest table views
src/components/problem/    Problem page hook, filters, and problem table views
src/components/stats/      Stats page and charts
src/components/list/       Problem-list views
src/data/                  Redux store, reducers, RTK Query APIs, and data loaders
src/types/                 Codeforces and app domain types
scripts/                   Data refresh scripts
```

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

In short:

1. Open an issue and wait for maintainer approval before starting new work.
2. Create a focused feature branch.
3. Run and test the affected flow locally before pushing.
4. Run `npm run build` before opening a pull request.
5. Update docs when behavior, setup, or development workflow changes.
