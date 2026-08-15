# Backend Testing

This backend uses two kinds of tests:

- Unit tests run without PostgreSQL and should cover handlers, middleware, providers, token logic, and small utilities through interfaces or fake dependencies.
- Integration tests use a real PostgreSQL database only when the code under test depends on SQL behavior, migrations, constraints, transactions, or repository queries.

Do not use the development or production database for integration tests.

## Commands

Run commands from the `backend` directory.

```sh
make test-unit
make test-race
make test-cover
make test-integration
make test-all
```

`make test` is an alias for `make test-unit`.

`make test-integration` runs with the `integration` build tag and `-p 1`. The package-level parallelism is disabled because integration tests share one destructive test database reset helper. Do not call `t.Parallel()` in tests that use that database.

## Current Unit Coverage

The configuration, GitHub OAuth state, authentication middleware, JWT, list-handler, user-handler, and verification-token packages can be checked independently while working in those areas:

```sh
go test ./configs ./internal/auth ./internal/lists/... ./internal/middlewares ./internal/utils ./internal/users
go test -race ./internal/auth ./internal/lists/... ./internal/middlewares ./internal/users ./internal/utils
```

The current tests cover:

- `configs`: application defaults, invalid port and external API timeout values, CORS parsing, required configuration, GitHub redirect URL validation, JWT secret length, process-environment precedence over `.env`, value trimming, and database URL loading from `.env`.
- `internal/auth`: cryptographically generated GitHub OAuth state, login redirects, HTTP and HTTPS cookie attributes, generator failures, callback state validation, cookie deletion, and rejection before provider or repository access.
- `internal/lists`: list and list-item handler success responses, request validation, whitespace normalization, missing and foreign lists, repository failures, idempotent item-deletion responses, and exact authenticated repository arguments.
- `internal/middlewares`: missing or malformed authorization, unsupported schemes, invalid signatures, expiration, invalid `userId` claims, request abortion, and propagation of the authenticated `int64 userId`.
- `internal/utils`: JWT generation and verification, claims and expiration, invalid signatures, unsupported signing methods, and missing or invalid `userId` claims.
- `internal/users`: profile and Codeforces-handle responses, deterministic verification-token creation and reuse, verification state transitions, provider error mapping, verification-token storage and expiration, user isolation, and concurrent token-store access.

These are unit tests and do not use PostgreSQL or external HTTP services. The configuration tests temporarily change process environment variables, the working directory, and the standard logger output. Authentication middleware and JWT tests initialize a package-level signing secret, while OAuth-state, middleware, list-handler, and user-handler tests also change process-wide Gin or logger state. Do not call `t.Parallel()` in these tests while they share process-wide state.

## Tested File Coverage

The following tested production files must maintain 100% statement coverage:

- `configs/configs.go`
- `internal/lists/lists_handler.go`
- `internal/middlewares/auth.go`
- `internal/utils/jwt.go`
- `internal/users/users_cfverification.go`
- `internal/users/users_handler.go`

Run `make test-cover` to generate `coverage/backend.out` and print function-level coverage. The overall `internal/lists` and `internal/users` package percentages are lower because those packages also contain repositories, routes, and providers whose tests belong to other phases. Judge each completed phase by its production-file function entries in the coverage report; every entry for the files listed above must be `100.0%`.

Latest measured statement coverage, recorded on `2026-08-14`:

| Scope | Coverage |
| --- | ---: |
| `configs/configs.go` | 100.0% |
| `internal/lists/lists_handler.go` | 100.0% |
| Entire `internal/lists` package | 70.0% |
| `internal/middlewares/auth.go` | 100.0% |
| `internal/utils/jwt.go` | 100.0% |
| `internal/users/users_cfverification.go` | 100.0% |
| `internal/users/users_handler.go` | 100.0% |
| Entire `internal/users` package | 53.9% |

The package percentages are included only as references for later phases. They do not reduce the 100% file-level coverage of `lists_handler.go`, `users_cfverification.go`, or `users_handler.go`.

For a focused coverage report while changing these files:

```sh
go test -coverprofile=/tmp/cftracker-configs.out ./configs
go tool cover -func=/tmp/cftracker-configs.out

go test -coverprofile=/tmp/cftracker-middlewares.out ./internal/middlewares
go tool cover -func=/tmp/cftracker-middlewares.out

go test -coverprofile=/tmp/cftracker-lists.out ./internal/lists
go tool cover -func=/tmp/cftracker-lists.out

go test -coverprofile=/tmp/cftracker-utils.out ./internal/utils
go tool cover -func=/tmp/cftracker-utils.out

go test -coverprofile=/tmp/cftracker-users.out ./internal/users
go tool cover -func=/tmp/cftracker-users.out
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
