# CFTracker Development Guide

This guide explains how to set up the project locally, understand the code layout, and develop new features safely.

## Quick Start

```bash
git clone https://github.com/mbashem/cftracker.git
cd cftracker
npm install
npm run dev
```

Open the local URL printed by Vite in the terminal.

The frontend can run without the backend. Backend-backed features, such as GitHub login and saved lists, are optional.

## Repository Shape

```text
src/
  components/          Page-level features and shared UI components
  data/                Redux store, reducers, hooks, RTK Query APIs, data fetch actions
  hooks/               App-level reusable hooks
  types/               Codeforces and CFTracker domain models
  util/                Routing, storage, sorting, theme, URLs, general helpers
backend/               Optional Go API for auth, profile, and lists
scripts/               Codeforces snapshot refresh scripts
manage-contests/       Personal admin utility for contest/problem management
```

## Frontend Architecture

The app is a React/Vite SPA. Routes are registered in `src/App.tsx`, and route constants live in `src/util/route/path.ts`.

The navigation component, `src/components/Menu.tsx`, performs the initial data loads:

- Codeforces problemset data from `src/data/saved_api/problems_data.ts` in local debug mode, or from the public API outside debug mode.
- Contest snapshot data from `src/data/saved_api/contests_data.ts`.
- Shared-problem data from `src/data/saved_api/related.ts`.

Redux Toolkit state is configured in `src/data/store.ts`. Feature state is split across reducers in `src/data/reducers/`.

Use these local patterns when adding or refactoring pages:

- Put page orchestration and business logic in a page hook, for example `useContestPage` or `useProblemPage`.
- Keep page components focused on composition.
- Move repeated view pieces into feature subfolders, for example `contest/contest-list` and `problem/problem-list`.
- Prefer existing shared UI controls from `src/components/common`.
- Keep filter and view state persistent only when that behavior already exists or is explicitly desired.

## Persistence Helpers

Use `usePersistentState` for page-local state that must survive reloads. It delegates reads and writes to `StorageService`.

Persisted storage key names belong under `StorageService.Keys`. Do not define storage key strings inside page hooks.

`StorageService` owns the low-level storage handlers:

- `getObject` / `saveObject`
- `getSet` / `saveSet`
- `getMap` / `saveMap`

## Main Feature Areas

### Contests

Location: `src/components/contest/`

`ContestPage.tsx` composes filters, category selection, list rendering, and pagination. `useContestPage.ts` owns filtering, category state, participant type filters, solve status filters, pagination, and submission-derived contest state.

Contest table views live in `src/components/contest/contest-list/`.

### Problems

Location: `src/components/problem/`

`ProblemPage.tsx` composes the toolbar, filter modal, problem table, and pagination. `useProblemPage.ts` owns problem filtering, sorting, solve status, tag filters, pagination, random selection, URL search sync, and list-add mode.

Problem table views live in `src/components/problem/problem-list/`.

### Stats

Location: `src/components/stats/`

`useStatPage.ts` groups loaded submissions by verdict and rating. Chart components live in `src/components/stats/charts/`.

### Lists

Location: `src/components/list/`

Lists require the optional backend. The frontend uses RTK Query APIs from `src/data/queries/listQuery.ts`. Authenticated routes are guarded by `src/util/route/AuthGuard.ts`.

### Manage Contests

Location: `manage-contests/`

`manage-contests` is a separate personal admin tool for maintaining contest/problem/shared-contest data. It is not part of the public CFTracker user-facing app and should be treated as an operator utility. It can run destructive admin actions, so do not expose it as a public deployment.

## Data Flow

Codeforces problemset data is loaded from `src/data/saved_api/problems_data.ts` while running Vite locally. Outside local debug mode, it is fetched live from:

```text
https://codeforces.com/api/problemset.problems?lang=en
```

Contest data is loaded from a checked-in generated snapshot. Refresh scripts live in `scripts/`.

Local debug mode is based on Vite's development flag, so `npm run dev` uses the saved problem snapshot and production builds use the live API.

User submissions are fetched for comma-separated Codeforces handles entered in the navbar. Submission status is converted into solved, attempted, and unsolved states in feature hooks.

In local debug mode, identical Codeforces API URLs reuse a browser-local response for 30 minutes. Simultaneous requests for the same URL also share one in-flight request. Production requests are not cached by this helper.

Several filters are saved in browser local storage through `src/util/StorageService.ts`. Search text and list-add mode use URL query params from `src/util/constants.ts`.

## Environment Variables

Frontend-only development does not need a `.env` file.

### Root Frontend `.env`

Create root `.env` only when enabling backend-backed features in the Vite app:

```bash
VITE_BACKEND_API_URL=http://localhost:8080/api
VITE_IS_BACKEND_AVAILABLE=true
VITE_GITHUB_OAUTH_CLIENT_ID=your_github_oauth_client_id
VITE_GITHUB_OAUTH_REDIRECT_URI=http://localhost:5173/callback/auth-gh
```

Leave `VITE_IS_BACKEND_AVAILABLE` unset for frontend-only mode. Backend UI is enabled only when it is set to the literal value `true`.

Root frontend envs currently read by the app:

| Variable | Required | Used for |
| --- | --- | --- |
| `VITE_BACKEND_API_URL` | Only with backend features | RTK Query base URL. Use `http://localhost:8080/api` locally. |
| `VITE_IS_BACKEND_AVAILABLE` | Only with backend features | Shows backend-only nav/auth/list UI only when set to `true`. |
| `VITE_GITHUB_OAUTH_CLIENT_ID` | Only with GitHub login | GitHub OAuth login link. |
| `VITE_GITHUB_OAUTH_REDIRECT_URI` | Only with GitHub login | GitHub OAuth redirect target, usually `http://localhost:5173/callback/auth-gh`. |
| `VITE_BACKEND_NOT_AVAILBLE_MESSAGE` | Optional | Currently exported from `src/util/env.ts`; not central to the main flow. |

### Backend `.env`

Create `backend/.env` when running the Go API:

```bash
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_REDIRECT_URL=http://localhost:5173/callback/auth-gh
DATABASE_URL=postgres://postgres:postgrespw@localhost:5432/cftracker?sslmode=disable
JWT_SECRET=replace_with_a_long_random_string
```

Backend envs:

| Variable | Required | Used for |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth app client ID. |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth app client secret. |
| `GITHUB_REDIRECT_URL` | Yes | GitHub OAuth callback URL. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `JWT_SECRET` | Yes | Signing/verifying app JWTs. |

### `manage-contests/.env`

Create `manage-contests/.env` when running the admin tool:

```bash
DATABASE_URL=postgres://postgres:postgrespw@localhost:5432/cftracker_manage?sslmode=disable
CF_API_KEY=your_codeforces_api_key
CF_API_SECRET=your_codeforces_api_secret
```

Admin tool envs:

| Variable | Required | Used for |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma/PostgreSQL connection string for admin data. |
| `CF_API_KEY` | Only for authenticated Codeforces API calls | Codeforces API key. |
| `CF_API_SECRET` | Only for authenticated Codeforces API calls | Codeforces API secret used to sign requests. |

## Optional Backend

The backend is a Go/Gin API under `backend/`. It provides GitHub OAuth, user profile endpoints, and saved problem lists.

Start PostgreSQL:

```bash
cd backend
docker compose -f internal/db/docker-compose.yml up -d
```

Create `backend/.env`:

```bash
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_REDIRECT_URL=http://localhost:5173/callback/auth-gh
DATABASE_URL=postgres://postgres:postgrespw@localhost:5432/cftracker?sslmode=disable
JWT_SECRET=replace_with_a_long_random_string
```

Run the API:

```bash
make run
```

The backend listens on `http://localhost:8080`. Frontend API calls should use `VITE_BACKEND_API_URL=http://localhost:8080/api`.

## Common Commands

Frontend:

```bash
npm run dev      # Start Vite
npm run build    # Build production assets
npm run lint     # Run ESLint
```

Backend:

```bash
cd backend
make run         # Run the API
make build       # Build backend/tmp/main
make test        # Run Go tests
make watch       # Run with air if installed
```

Data refresh:

```bash
cd scripts
npm install
node fetch_contests.mjs
node fetch_problems.mjs
```

## Validation Notes

Use `npm run build` as the current frontend baseline. It verifies the Vite production build.

The stricter `npx tsc -b` command currently reports legacy project issues outside recent page work, including `web-vitals` API changes, missing Workbox types, and an unused icon in `Menu.tsx`. Fix those separately before making `tsc -b` a required gate.

When changing a focused feature, a targeted TypeScript check can still be useful:

```bash
npx tsc --noEmit --jsx react-jsx --target ES2020 --lib ES2020,DOM,DOM.Iterable --module ESNext --moduleResolution bundler --allowImportingTsExtensions --resolveJsonModule --isolatedModules --strict --noUnusedLocals --noUnusedParameters --skipLibCheck src/vite-env.d.ts path/to/file.tsx
```

## Adding a New Page

1. Add the route constant in `src/util/route/path.ts`.
2. Register the route in `src/App.tsx`.
3. Add a navigation link in `src/components/Menu.tsx` if the page should be globally reachable.
4. Put business logic in `useYourPage.ts`.
5. Keep `YourPage.tsx` as a composition layer.
6. Move larger view pieces into a feature subfolder.
7. Add reducer, query, or data hook changes under `src/data/` only when shared state is needed.

## Working With Codeforces Data

Prefer the existing domain types under `src/types/CF/`. They normalize Codeforces entities and provide helper properties such as problem IDs.

Avoid duplicating Codeforces URL construction. Use helpers in `src/util/util.ts`, such as `getContestUrl`, `getProblemUrl`, and `getUserSubmissionsURL`.

Be mindful of Codeforces API rate limits. Existing submission fetching intentionally waits between multiple handles.

## Local Storage and URL State

Filter state that should survive reloads generally uses `usePersistentState`.

Shareable state should use query params through `useAppSearchParams`. Current keys are:

- `q`: search text.
- `listId`: selected list while adding problems.

Prefer keeping transient UI state inside the page hook.
