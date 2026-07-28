# .env file (create a .env file in backend folder)

GITHUB_CLIENT_ID={GITHUB_CLIENT_ID}

GITHUB_CLIENT_SECRET={GITHUB_CLIENT_SECRET}

GITHUB_REDIRECT_URL=http://localhost:8080/auth/github/callback

DATABASE_URL=postgres://username:password@localhost:port/database?sslmode=disable # example postgres://

JWT_SECRET=JWT_SECRET_ANY_STRING_WILL_WORK

# Optional Go duration for GitHub and Codeforces requests. Defaults to 10s.
EXTERNAL_API_TIMEOUT=10s

## Database migrations

The API only opens and validates the database connection during startup. Apply schema changes separately from the `backend` directory; the Makefile reads `DATABASE_URL` from the environment or `.env`.

```sh
make migrate-up
```

Inspect the current version:

```sh
make migrate-version
```

Roll back every applied migration:

```sh
make migrate-down
```

Roll back the migration that owns a specific table:

```sh
make migrate-down table=lists
make migrate-down table=list_items
make migrate-down table=users
```

The Makefile passes the table name to PostgreSQL. The database resolves its owning migration through `migration_meta.table_migrations`, so adding future tables does not require another Makefile case. Rollback still follows the dependency order `list_items -> lists -> users`: rolling back a parent also rolls back later dependent migrations.

Move a specific number of migrations in either direction:

```sh
make migrate direction=down steps=1
make migrate direction=up steps=2
```

Migration steps are ordered schema changes. Each migration file can manage one table or a related group of tables; targeting arbitrary tables directly would bypass migration version tracking.

Create the next pair of migration files:

```sh
make migrate-create name=add_feature
```

Run `make migrate-up` once as a deployment step before starting new application instances. Migrations are versioned in PostgreSQL, and the migration runner serializes concurrent attempts.

## Test without the frontend

Run these commands from the `backend` directory. They use a separate test database so existing development data is not affected.

Start PostgreSQL and reset the test database:

```sh
docker compose -f internal/db/docker-compose.yml up -d postgres

docker compose -f internal/db/docker-compose.yml exec -T postgres \
  dropdb -U postgres --if-exists cftracker_migration_test

docker compose -f internal/db/docker-compose.yml exec -T postgres \
  createdb -U postgres cftracker_migration_test

export DATABASE_URL='postgres://postgres:postgrespw@localhost:5432/cftracker_migration_test?sslmode=disable'
```

Apply the migrations and inspect the resulting tables:

```sh
make migrate-up
make migrate-version

docker compose -f internal/db/docker-compose.yml exec -T postgres \
  psql -U postgres -d cftracker_migration_test -c '\dt'
```

The database should contain `users`, `lists`, `list_items`, and `schema_migrations`.

Roll back one migration and confirm that the version changes from `3` to `2`:

```sh
make migrate direction=down steps=1
make migrate-version
```

Only `list_items` should now be absent; `lists` and `users` should remain. Restore it before starting the API:

```sh
make migrate-up
```

To test a full rollback, remove every application table and then restore the schema:

```sh
make migrate-down

docker compose -f internal/db/docker-compose.yml exec -T postgres \
  psql -U postgres -d cftracker_migration_test -c '\dt'

make migrate-up
```

After `migrate-down`, no application tables should remain. Migration metadata stays in `schema_migrations` and `migration_meta.table_migrations` so named rollback remains resolvable.

To test a table rollback, restore the schema and select a table:

```sh
make migrate-up
make migrate-down table=lists
make migrate-version
```

The version should be `1`; `users` should remain while `lists` and `list_items` are removed.

Rolling back only `list_items` should leave both parent tables at version `2`:

```sh
make migrate-up
make migrate-down table=list_items
make migrate-version
```

Ensure an `.env` file exists, then start the API with test-only configuration:

```sh
touch .env

make run \
  DATABASE_URL="$DATABASE_URL" \
  JWT_SECRET=test-secret \
  GITHUB_CLIENT_ID=test \
  GITHUB_CLIENT_SECRET=test \
  GITHUB_REDIRECT_URL=http://localhost:8080/auth/github/callback
```

From another terminal, verify that the server responds:

```sh
curl -i http://localhost:8080/
```

A `404` response is expected because `/` has no registered route. It confirms that the API connected to PostgreSQL and started without the frontend.

# API

/

- /auth/github/login - initialize github login
- /auth/github/callback - retuns user info and jwt token

Authorization header with token 'Bearer {token}' required for following
GET - /user/profile - returns users info ,
PUT - /user/cfhandle - body = { "cf_handle": "{handle}" }
GET - /user/cfverification-token - returns verification token - {"token": "{token}"}
GET - /user/verify-cftoken - verifies verification token

set cf firstName as the token recieved from verification token. It is valid for 1 hour

- Go to settings -> social -> firstName


# Docker
local db- postgres://postgres:postgrespw@host.docker.internal:5432/cftracker?sslmode=disable
