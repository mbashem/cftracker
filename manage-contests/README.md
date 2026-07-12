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

```bash
cd manage-contests
npm install
npm run dev
```

Open the local URL printed by Next.js in the terminal.

## Notes

- This tool is intended for admin usage only.
- Do not expose it as a public deployment.
- Saved admin snapshots live under `src/saved-db/`.
- Prisma schema and migrations live under `src/prisma/`.
