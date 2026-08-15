# Backend

## Configuration

For local development, create `.env` from the committed example and replace its placeholder values:

```sh
cp .env.example .env
```

The API loads `.env` when that file exists. Values already present in the process environment take precedence. A `.env` file is not required when the deployment environment provides configuration directly.

Required variables:

```env
GITHUB_CLIENT_ID=replace-with-github-client-id
GITHUB_CLIENT_SECRET=replace-with-github-client-secret
GITHUB_REDIRECT_URL=http://localhost:5173/callback/auth-gh
DATABASE_URL=postgres://postgres:postgrespw@localhost:5432/cftracker?sslmode=disable
JWT_SECRET=replace-with-generated-secret
```

Generate `JWT_SECRET` with `openssl rand -base64 32`; it must contain at least 32 bytes of unpredictable data.

Optional variables:

```env
PORT=8080
EXTERNAL_API_TIMEOUT=10s
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

`PORT` defaults to `8080`. `EXTERNAL_API_TIMEOUT` accepts Go duration values such as `5s` or `1m` and defaults to `10s`. `CORS_ALLOWED_ORIGINS` accepts comma-separated HTTP or HTTPS origins without paths. Missing or invalid entries are logged and skipped; when none are valid, requests without a browser `Origin` header can still be used for API testing. Do not use `*` because the API allows credentialed CORS requests.

GitHub sign-in must start at `/api/auth/github/login`. The handler stores the short-lived OAuth state in an HTTP-only cookie, and the frontend forwards GitHub's returned `state` with the authorization code. A new login replaces any pending login in the same browser profile. HTTPS deployments behind a reverse proxy must set `X-Forwarded-Proto: https` so the state cookie is marked `Secure`.

## Testing

See the [`TESTING.md`](TESTING.md) backend testing guide for the complete unit, integration, race, coverage, and database-safety workflow.

Unit tests do not require PostgreSQL. Run the complete unit suite and race detector from the `backend` directory:

```sh
make test-unit
make test-race
```

The configuration, authentication middleware, JWT, and Codeforces verification-token tests can be run directly while working on those packages:

```sh
go test ./configs ./internal/auth ./internal/middlewares ./internal/utils ./internal/users
go test -race ./internal/auth ./internal/middlewares ./internal/users ./internal/utils
```

Configuration tests cover defaults, invalid values, process-environment precedence over `.env`, and database URL loading from `.env`. Authentication middleware tests cover rejected credentials, endpoint abortion, and propagation of a verified `int64 userId`. JWT tests cover generation, verification, expiration, signatures, signing methods, and invalid `userId` claims. Verification-token tests cover storage, replacement, deletion, expiration, and concurrent access.

The currently tested production files `configs/configs.go`, `internal/middlewares/auth.go`, `internal/utils/jwt.go`, and `internal/users/users_cfverification.go` each maintain 100% statement coverage. Integration tests require a disposable PostgreSQL database; follow the testing guide before running them.

## Database migrations

The API only opens and validates the database connection during startup. Apply schema changes separately from the `backend` directory; the Makefile reads `DATABASE_URL` from the environment or `.env`.

See [`MIGRATION_FLOW.md`](MIGRATION_FLOW.md) for a code-review guide to migration ordering, checksum verification, rollback behavior, and schema-drift detection.

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

Applied migration files are immutable. Never edit or delete an existing migration after it has been applied or shared; create another migration for the correction. `make migrate-up` records SHA-256 checksums for both directions and stops when a previously recorded file has changed. Check them without applying anything:

```sh
make migrate-check
```

To detect schema changes made outside migrations, compare the target database with a separate clean reference database. The reference database is brought to the latest version and must be disposable; the target database is only inspected. Both databases should use the same PostgreSQL major version, and `pg_dump` must be installed:

```sh
make migrate-check-schema \
  reference_database_url='postgres://postgres:postgrespw@localhost:5432/cftracker_migration_reference?sslmode=disable'
```

Run the checksum check before deployment and the schema check against production from a trusted deployment environment. GitHub Actions also rejects modified or deleted historical migration files and exercises the complete migration workflow.

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

Roll back one migration and confirm that the version changes from `4` to `3`:

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

After `migrate-down`, no application tables should remain. Migration metadata stays in `schema_migrations`, `migration_meta.table_migrations`, and `migration_meta.migration_checksums` so named rollback and migration-integrity checks remain available.

To test a table rollback, restore the schema and select a table:

```sh
make migrate-up
make migrate-down table=lists
make migrate-version
```

The version should be `2`; `users` should remain while `lists` and `list_items` are removed.

Rolling back only `list_items` should leave both parent tables at version `3`:

```sh
make migrate-up
make migrate-down table=list_items
make migrate-version
```

Start the API with test-only configuration. No `.env` file is required because these values are injected into the process:

```sh
make run \
  DATABASE_URL="$DATABASE_URL" \
  JWT_SECRET=test-secret-with-at-least-32-bytes \
  GITHUB_CLIENT_ID=test \
  GITHUB_CLIENT_SECRET=test \
  GITHUB_REDIRECT_URL=http://localhost:5173/callback/auth-gh \
  CORS_ALLOWED_ORIGINS=http://localhost:5173
```

From another terminal, verify that the server responds:

```sh
curl -i http://localhost:8080/
```

A `404` response is expected because `/` has no registered route. It confirms that the API connected to PostgreSQL and started without the frontend.

# API

- `GET /api/auth/github/login` - initialize GitHub login and OAuth state
- `GET /api/auth/github/callback?code={code}&state={state}` - return user info and a JWT

The equivalent routes without the `/api` prefix remain available for direct backend clients.

Authorization header with token 'Bearer {token}' required for following
GET - /user/profile - returns users info ,
PUT - /user/cfhandle - body = { "cf_handle": "{handle}" }
GET - /user/cfverification-token - returns verification token - {"token": "{token}"}
GET - /user/verify-cftoken - verifies verification token

set cf firstName as the token recieved from verification token. It is valid for 1 hour

- Go to settings -> social -> firstName


## Docker

Build one environment-neutral image from the `backend` directory:

```sh
docker build -f dockerfile -t cftracker-backend .
```

Keep production configuration outside the repository and image, restrict its file permissions, and inject it when the container starts:

```sh
chmod 600 /secure/path/cftracker.env
docker run --env-file /secure/path/cftracker.env -p 8080:8080 cftracker-backend
```

With Docker Compose, use `env_file` to inject the same protected host file:

```yaml
services:
  backend:
    image: cftracker-backend
    env_file:
      - /secure/path/cftracker.env
    ports:
      - "8080:8080"
```

When PostgreSQL runs on the host during local Docker development, use `host.docker.internal` in `DATABASE_URL`:

```env
DATABASE_URL=postgres://postgres:postgrespw@host.docker.internal:5432/cftracker?sslmode=disable
```
