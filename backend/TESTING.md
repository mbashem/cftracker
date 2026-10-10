# Backend Testing

This backend uses two kinds of tests:

- Unit tests run without PostgreSQL and should cover handlers, middleware, providers, token logic, and small utilities through interfaces or fake dependencies.
- Integration tests use a real PostgreSQL database only when the code under test depends on SQL behavior, migrations, constraints, transactions, or repository queries.

Do not use the development or production database for integration tests.

## Test Layout

All backend Go tests and shared helpers live under one dedicated root:

```text
tests/
├── unit/          # auth, configs, lists, middlewares, users, utils
├── integration/   # database, items, lists, migrations, routes, users
└── support/       # HTTP helpers, provider mocks, PostgreSQL fixtures
```

Tests import production packages and exercise exported behavior. Configuration parsing is checked through `configs.Load()`. Handler constructor options inject OAuth state, session token, and verification token generators for deterministic success and failure scenarios. Production callers retain their default generators.

Keep new tests under this root. Keep package-specific fixtures beside their tests and helpers used by multiple packages in `tests/support` (imported as `testutil`). Do not add another Go module.

## Commands

Run commands from the `backend` directory.

```sh
make test-unit
make test-race
make test-cover
make test-integration
make test-migrations
make test-all
```

`make test` is an alias for `make test-unit`. Unit and race commands target `./tests/unit/...`; integration commands target `./tests/integration/...`. `make test-all` also runs `go vet ./...` to check production and test packages.

Because tests live outside production packages, coverage requires `-coverpkg=./configs/...,./internal/...`. `make test-cover` supplies this flag and excludes support helpers from the production coverage scope.

`make test-migrations` is an explicitly invoked destructive integration check and is not included in `make test` or `make test-all`. It replaces and later removes only its fixed, reserved disposable databases; see [MIGRATION_FLOW.md](MIGRATION_FLOW.md#local-migration-tests) for the required URLs, safety checks, and covered migration behavior.

`make test-integration` runs with the `integration` build tag and `-p 1`. The package-level parallelism is disabled because integration tests share one destructive test database reset helper. Do not call `t.Parallel()` in tests that use that database.

## Editor Support for Integration Tests

Integration test files retain `//go:build integration` so the default unit suite runs without PostgreSQL. A `gopls` warning such as "No packages found for open file" can mean that the editor has not enabled this tag; removing the package declaration does not resolve it.

The repository's [VS Code workspace settings](../.vscode/settings.json) enable `-tags=integration` for `gopls` when the repository root is open. This setting enables editor analysis, not test execution, and does not change the Makefile's default unit-test command. If an already running language server keeps the warning, restart it. Other LSP clients, or editors opened directly on `backend/`, need the equivalent configuration in their own workspace settings:

```json
{
  "gopls": {
    "buildFlags": ["-tags=integration"]
  }
}
```

The exact configuration location depends on the editor; `buildFlags` is a setting passed to `gopls`. See the [official settings reference](https://github.com/golang/tools/blob/master/gopls/doc/settings.md#buildflags). Keep explicit `-tags=integration` and `-p 1` when running integration tests from the terminal.

Nested `t.Run` calls are Go subtests: this suite groups the cancellation scenario first and the repository operation second. Each callback receives its own `*testing.T` and context, so failure names and cleanup remain scoped to that case. See [Go's subtest guide](https://go.dev/blog/subtests).

## Current Unit Coverage

The configuration, concrete external providers, GitHub OAuth state, authentication middleware, JWT, list-handler, user-handler, and verification-token packages can be checked independently while working in those areas:

```sh
go test ./tests/unit/...
go test -race ./tests/unit/...
```

The current tests cover:

- `configs`: application defaults, invalid port and external API timeout values, CORS parsing, required configuration, GitHub redirect URL validation, JWT secret length, process-environment precedence over `.env`, value trimming, and database URL loading from `.env`.
- `internal/auth`: cryptographically generated GitHub OAuth state, login redirects, HTTP and HTTPS cookie attributes, callback state validation and cookie deletion, new-user and returning-user persistence, provider and repository failures, token-generation failures, JWT user IDs, and concrete GitHub token and user responses without GitHub network access.
- `internal/lists`: list and list-item handler success responses, request validation, whitespace normalization, missing and foreign lists, repository failures, idempotent item-deletion responses, and exact authenticated repository arguments.
- `internal/middlewares`: missing or malformed authorization, unsupported schemes, invalid signatures, expiration, invalid `userId` claims, request abortion, and propagation of the authenticated `int64 userId`.
- `internal/utils`: JWT generation and verification, claims and expiration, invalid signatures, unsupported signing methods, and missing or invalid `userId` claims.
- `internal/users`: profile and Codeforces-handle responses, deterministic verification-token creation and reuse, verification state transitions, provider error mapping, concrete Codeforces responses and URL escaping, verification-token storage and expiration, user isolation, handle-bound proofs, historical rename resolution, stale verification rejection, and concurrent token-store access.

These are unit tests and do not use PostgreSQL or external HTTP services. The configuration tests temporarily change process environment variables, the working directory, and the standard logger output. Authentication middleware and JWT tests initialize a package-level signing secret, while OAuth-state, middleware, list-handler, and user-handler tests also change process-wide Gin or logger state. Do not call `t.Parallel()` in these tests while they share process-wide state.

## Tested File Coverage

The following tested production files must maintain 100% statement coverage:

- `configs/configs.go`
- `internal/lists/lists_handler.go`
- `internal/middlewares/auth.go`
- `internal/utils/jwt.go`
- `internal/users/users_cfverification.go`
- `internal/users/users_model.go`
- `internal/users/users_handler.go`

Run `make test-cover` to generate `coverage/backend.out` and print function-level coverage. The overall package percentages are lower because those packages also contain repositories, routes, or configuration whose tests belong to other phases. Judge each completed phase by its production-file function entries in the coverage report; every entry for the files listed above must be `100.0%`.

Historical statement coverage before the test-directory migration, recorded on `2026-08-16` (run `make test-cover` for current measurements):

| Scope | Coverage |
| --- | ---: |
| `configs/configs.go` | 100.0% |
| `internal/auth/auth_handlers.go` | 98.4% |
| `internal/auth/github_provider.go` | 95.2% |
| Entire `internal/auth` package | 96.6% |
| `internal/lists/lists_handler.go` | 100.0% |
| Entire `internal/lists` package | 70.0% |
| `internal/middlewares/auth.go` | 100.0% |
| `internal/utils/jwt.go` | 100.0% |
| `internal/users/codeforces_provider.go` | 94.7% |
| `internal/users/users_cfverification.go` | 100.0% |
| `internal/users/users_handler.go` | 100.0% |
| Entire `internal/users` package | 64.8% |

The package percentages are included only as references for later phases. They do not reduce the 100% file-level coverage of `lists_handler.go`, `users_cfverification.go`, or `users_handler.go`. The fixed provider URLs and non-nil derived contexts make request-construction failures unreachable without adding test-only state to the clients, leaving one uncovered statement in each provider. Every function in `auth_handlers.go` is fully covered except the error return from `crypto/rand.Read`, which Go 1.26 handles by terminating the process instead of returning the error.

For a focused coverage report while changing these files:

```sh
go test -coverpkg=./configs -coverprofile=/tmp/cftracker-configs.out ./tests/unit/configs
go tool cover -func=/tmp/cftracker-configs.out

go test -coverpkg=./internal/middlewares -coverprofile=/tmp/cftracker-middlewares.out ./tests/unit/middlewares
go tool cover -func=/tmp/cftracker-middlewares.out

go test -coverpkg=./internal/lists -coverprofile=/tmp/cftracker-lists.out ./tests/unit/lists
go tool cover -func=/tmp/cftracker-lists.out

go test -coverpkg=./internal/utils -coverprofile=/tmp/cftracker-utils.out ./tests/unit/utils
go tool cover -func=/tmp/cftracker-utils.out

go test -coverpkg=./internal/users -coverprofile=/tmp/cftracker-users.out ./tests/unit/users
go tool cover -func=/tmp/cftracker-users.out
```

## Database Cancellation Coverage

Handler table tests check that authentication, user, list, and item operations pass the HTTP request context into their repositories. Configuration tests cover the five-second database default, overrides, environment precedence, and rejection of malformed, zero, or negative durations.

`tests/integration/routes/database_context_integration_test.go` exercises every application repository operation against PostgreSQL. It checks already canceled requests, deadlines while the pool is exhausted, deadlines during table-lock waits, and cancellation after the query is observed waiting on a lock. It also verifies that canceled operations preserve the seeded user, list, and item state and that connections remain usable. These tests use short injected operation timeouts and safety deadlines; they do not wait for the production five-second default. Run them using the integration database workflow below:

```sh
go test -race -p 1 -count=1 -tags=integration -run TestRepositoryDatabaseContextsIntegration ./tests/integration/routes
```

## Integration Database

Integration tests require `TEST_DATABASE_URL`. The helper refuses to run unless the connected database name ends in `_test` or `_integration`. It also rejects a `TEST_DATABASE_URL` that exactly matches `DATABASE_URL`.

Create and migrate a disposable database:

```sh
createdb -h localhost -U postgres cftracker_test
export TEST_DATABASE_URL='postgres://postgres:postgrespw@localhost:5432/cftracker_test?sslmode=disable'
make migrate-up MIGRATION_DATABASE_URL="$TEST_DATABASE_URL"
make test-integration
```

The integration helper requires migration version `4` with `dirty=false`. If migrations change, update the helper after the new migration is committed and applied to the test database.

## Reset Behavior

Integration tests can call:

```go
database := testutil.OpenTestDB(t)
testutil.ResetTestDB(t, database)
```

`ResetTestDB` re-checks the current database name before deleting data, then runs:

```sql
TRUNCATE list_items, lists, users RESTART IDENTITY CASCADE;
```

This keeps tests deterministic while protecting `cftracker` and production-like database names from accidental truncation.

## When To Use PostgreSQL

Use unit tests for HTTP behavior, validation, auth branching, provider response handling, and repository-interface consumers.

Use integration tests for concrete repository methods, schema constraints, migration behavior, transaction behavior, and complete workflows where PostgreSQL is part of the behavior being verified.
