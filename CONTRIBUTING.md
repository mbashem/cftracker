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

Install the exact dependency tree. This also enables the repository-managed Git hooks for the current clone:

```bash
npm ci
npm run verify:ci
```

`verify:ci` runs the policy tests, tracked-file hygiene scan, Secretlint's recommended ruleset, TypeScript check, zero-warning lint, and production build. For backend changes, run the full local verifier instead:

```bash
npm run verify
```

The hooks provide earlier feedback:

- `commit-msg` validates the machine-checkable commit-message rules below.
- `pre-commit` rejects staged whitespace errors, disallowed environment/log files, Secretlint findings, root frontend lint failures, and Go files that are not `gofmt`-formatted.
- `pre-push` runs `verify:ci` and also runs backend unit tests when the pushed commits change `backend/`.

Run `npm run hooks:install` to restore the hooks if they are disabled. Local hooks can be bypassed with `--no-verify`, so the `Policy`, `Frontend`, and aggregate `Required verification` GitHub checks must also pass. Repository administrators should require `Required verification` in the protected-branch ruleset to make that merge gate authoritative.

## Commit Messages

Use this Conventional Commit format:

```text
<type>(<optional-scope>): <imperative summary>
```

Allowed types:

- `feat`: Add or change user-facing behavior.
- `fix`: Correct a defect, security issue, or unintended behavior.
- `refactor`: Restructure code without changing its behavior.
- `perf`: Improve performance without changing behavior.
- `test`: Change tests, fixtures, or test infrastructure only.
- `docs`: Change documentation only.
- `build`: Change dependencies, build tooling, or packaging.
- `ci`: Change continuous-integration or delivery automation.
- `chore`: Perform repository maintenance that does not fit another type.
- `revert`: Revert an earlier commit.

Choose the type from the commit's primary purpose. Tests and documentation that support a feature or fix belong in that `feat` or `fix` commit; use `test` or `docs` when they are the commit's main purpose. Split unrelated purposes into separate commits.

Begin the summary with a lowercase imperative verb, keep the summary no longer than 72 characters, and omit trailing whitespace and the final period. Preserve the normal capitalization of proper nouns such as GitHub and OAuth. Use a lowercase kebab-case scope only when it adds useful context. Add a body after a blank line when the reason, behavior, or verification is not clear from the subject. The validator enforces the syntax and lowercase first letter; whether the wording is genuinely imperative remains a review criterion.

Examples:

```text
feat(lists): allow items to be reordered
fix(auth): reject mismatched OAuth state
test: cover repository ownership isolation
docs: document local migration checks
chore: update repository guidance
```

For a breaking change, add `!` before the colon and explain the break in a non-empty `BREAKING CHANGE:` footer after a blank line. The marker and footer are both required.

## Pull Request Checklist

Before opening a PR, confirm:

- A related issue exists and has maintainer approval.
- The change is scoped and described clearly.
- The affected flow was run and tested locally before pushing.
- `npm run verify:ci` and the `Required verification` GitHub check pass.
- `npm run verify:backend` passes for backend changes, or the PR explains why it could not be run.
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
