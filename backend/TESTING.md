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
