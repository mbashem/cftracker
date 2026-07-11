# Contributing to CFTracker

Thanks for helping modernize CFTracker. The project has useful bones and some legacy corners, so small, well-scoped improvements are especially valuable.

## Before You Start

1. Read [README.md](./README.md) for project setup.
2. Read [DEVELOPMENT.md](./DEVELOPMENT.md) for architecture and development workflow.
3. Open an issue describing the change you want to make.
4. Wait for maintainer approval on that issue before starting implementation.
5. Check existing patterns near the code you plan to change.
6. Run and test the project locally before pushing your branch.

Please do not open a pull request for new work unless the related issue has been approved by the maintainer first. Unapproved pull requests may be closed so the project can keep scope and direction under control.

## Branches

Create a focused branch for each change:

```bash
git checkout -b feature/problem-page-cleanup
```

Use a descriptive branch name, such as:

- `feature/list-export`
- `fix/problem-filter-reset`
- `refactor/contest-page-views`
- `docs/backend-setup`

## Scope

Keep pull requests focused. A good PR usually does one of these:

- Adds one feature.
- Fixes one bug.
- Refactors one page or module.
- Updates one documentation area.

Avoid mixing broad formatting, unrelated cleanup, and feature work in the same PR.

## Frontend Guidelines

- Follow the current page pattern: business logic belongs in a page hook, view composition belongs in the page component.
- Prefer existing shared components under `src/components/common`.
- Keep feature-specific views in the feature folder, for example `src/components/problem/problem-list`.
- Use existing domain types from `src/types/`.
- Use helpers from `src/util/` instead of reimplementing URLs, storage, sorting, or route logic.
- Keep persisted state intentional. Use local storage only for preferences that should survive reloads.
- Keep URL query params for state that should be shareable or restorable by link.

## Backend Guidelines

- Keep backend changes inside `backend/` unless frontend API wiring is also required.
- Add new authenticated routes under `/api`.
- Reuse the existing Gin route grouping and repository patterns.
- Keep secrets in `.env`; never commit real credentials.

## Documentation Guidelines

Update docs when behavior, setup, environment variables, routes, or development workflow changes.

Use:

- [README.md](./README.md) for project overview and setup.
- [DEVELOPMENT.md](./DEVELOPMENT.md) for developer workflow and architecture.
- [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution rules and PR expectations.

## Validation

Run the app locally and manually test the affected flow before pushing your branch.

Run the production build before opening a PR:

```bash
npm run build
```

Run lint when your change touches TypeScript or React code:

```bash
npm run lint
```

For backend changes:

```bash
cd backend
make test
```

`npx tsc -b` is not currently a clean required gate because of legacy project issues. If you fix those issues, update [DEVELOPMENT.md](./DEVELOPMENT.md) and this guide.

## Commit Messages

Use clear, imperative commit messages:

```text
Refactor problem page into hook and views
Fix contest category multiselect reset
Document backend setup
```

## Pull Request Checklist

Before opening a PR, confirm:

- A related issue exists and has maintainer approval.
- The change is scoped and described clearly.
- The affected flow was run and tested locally before pushing.
- `npm run build` passes, or the PR explains why it could not be run.
- Backend tests pass for backend changes, or the PR explains why they could not be run.
- New or changed behavior is documented.
- User-facing behavior changes include screenshots or notes when helpful.
- The PR does not include unrelated generated files, logs, local env files, or credentials.

## Reporting Bugs

Include:

- What you expected.
- What happened.
- Steps to reproduce.
- Browser and OS if the issue is UI-related.
- Codeforces handles or contest/problem IDs involved, when relevant.
- Console or network errors, if available.

## Proposing Refactors

Refactors are welcome when they improve readability or reduce duplicated logic. Keep them reviewable:

- Explain the boundary you are moving.
- Preserve existing behavior unless the PR explicitly says otherwise.
- Prefer one page, hook, or module per refactor PR.
- Include validation notes.
