# CFTracker

CFTracker is a Codeforces companion app for browsing contests and problems, checking solve status for one or more handles, and building practice lists.

The app can run as a frontend-only tracker using public Codeforces data. An optional Go backend enables GitHub login and saved problem lists.

## Features

- Contest grid grouped by contest category, with problem ratings, solve coloring, dates, and random contest selection.
- Problem browser with search, rating range, contest ID range, tags, solve status filters, sorting, pagination, and random problem selection.
- Multi-handle submission sync from Codeforces.
- Stats page with verdict charts, rating breakdowns, contest category solve percentages, and a submissions heat map.
- Optional authenticated lists for saving and organizing practice problems.
- Dark and light themes.

For local development workflows, see [DEVELOPMENT.md](./DEVELOPMENT.md). For contribution rules and pull request expectations, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Tech Stack

- React 18
- TypeScript 5
- Vite 5
- Redux Toolkit and RTK Query
- Bootstrap and React Bootstrap
- Chart.js and D3
- Optional backend: Go 1.22, Gin, PostgreSQL, GitHub OAuth

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- Optional backend: Go 1.22 or newer, Docker, and PostgreSQL

## Frontend Setup

```bash
git clone https://github.com/mbashem/cftracker.git
cd cftracker
npm install
npm run dev
```

Open the local URL printed by Vite in the terminal.

The frontend-only app does not require environment variables. In local Vite development it loads problem, contest, and shared-problem data from checked-in generated files. Production builds fetch the problemset from the public Codeforces API.

## Frontend Configuration

Create `.env` in the repository root only when enabling backend-backed features:

```bash
VITE_BACKEND_API_URL=http://localhost:8080/api
VITE_IS_BACKEND_AVAILABLE=true
VITE_GITHUB_OAUTH_CLIENT_ID=your_github_oauth_client_id
VITE_GITHUB_OAUTH_REDIRECT_URI=http://localhost:5173/callback/auth-gh
```

Leave `VITE_IS_BACKEND_AVAILABLE` unset for frontend-only mode. Backend UI is enabled only when it is set to the literal value `true`.

## Backend Setup

The backend is optional. It powers GitHub authentication and saved problem lists.

1. Start PostgreSQL:

```bash
cd backend
docker compose -f internal/db/docker-compose.yml up -d
```

2. Create `backend/.env`:

```bash
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_REDIRECT_URL=http://localhost:5173/callback/auth-gh
DATABASE_URL=postgres://postgres:postgrespw@localhost:5432/cftracker?sslmode=disable
JWT_SECRET=replace_with_a_long_random_string
```

3. Run the API:

```bash
make run
```

The API runs on `http://localhost:8080` and allows requests from `http://localhost:5173`.

## Scripts

```bash
npm run dev      # Start the Vite dev server
npm run build    # Build the frontend for production
npm run lint     # Run ESLint
```

Backend scripts are available from `backend/`:

```bash
make run         # Run the Go API
make build       # Build backend/tmp/main
make test        # Run Go tests
make watch       # Run with air if available
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
src/components/list/       Authenticated problem-list views
src/data/                  Redux store, reducers, RTK Query APIs, and data loaders
src/types/                 Codeforces and app domain types
backend/                   Optional Go API for auth and lists
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
