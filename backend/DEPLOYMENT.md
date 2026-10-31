# Production Compose deployment

For a VPS installation, SSH/firewall recovery, DNS/IPv6/NGINX/HTTPS,
local image transfer, and repeatable release scripts, follow the
[VPS runbook](deploy/vps/README.md). It uses placeholders for deployment-specific
values and includes verification steps. That workflow needs no source checkout
or registry on the server.

Run commands from the repository root using `backend/compose.production.yml`.
The manifest's build contexts and SQL mount are relative to `backend/`.
This setup assumes a Linux server with
Docker Compose and an HTTPS reverse proxy on the host. Keep one backend replica:
verification tokens and rate-limit allowances are process-local. CI is optional
for this workflow. Start with a clean production database as currently agreed.

## Configuration

Create `/etc/cftracker` outside the checkout, owned by your deployment operator,
with mode `700`. Generate three independent secrets:

```sh
openssl rand -hex 32  # PostgreSQL administrator password
openssl rand -hex 32  # Application database password
openssl rand -base64 32  # JWT signing secret
```

Write the administrator and application passwords to
`/etc/cftracker/postgres-password` and `/etc/cftracker/app-password`, respectively.
Use the hex passwords unchanged in the connection URLs below. Other passwords
must be URL-encoded. Set `postgres-password`, `backend.env`, and `migration.env`
to mode `600`. Set `app-password` to `644`: the PostgreSQL SQL initializer runs
as the container's database user and must read this bind-mounted secret. Keep
the parent `/etc/cftracker` directory at `700`, preventing other unprivileged
host users from accessing the file. Mount the application password only into
PostgreSQL; privileged host/Docker users can still access it. Never commit these
files. Compose secret mounts are backed by host files, not an encrypted secret
store.

`/etc/cftracker/backend.env`:

```dotenv
# secretlint-disable-next-line @secretlint/secretlint-rule-database-connection-string -- Placeholder credentials; replace before deployment.
DATABASE_URL=postgres://cftracker_app:APPLICATION_PASSWORD@postgres:5432/cftracker?sslmode=disable
JWT_SECRET=GENERATED_JWT_SECRET
GITHUB_CLIENT_ID=PRODUCTION_CLIENT_ID
GITHUB_CLIENT_SECRET=PRODUCTION_CLIENT_SECRET
CORS_ALLOWED_ORIGINS=https://your-frontend.example
# Set this to the actual reverse-proxy source address/CIDR seen by the container.
TRUSTED_PROXIES=
```

`/etc/cftracker/migration.env`:

```dotenv
# secretlint-disable-next-line @secretlint/secretlint-rule-database-connection-string -- Placeholder credentials; replace before deployment.
MIGRATION_DATABASE_URL=postgres://postgres:ADMINISTRATOR_PASSWORD@postgres:5432/cftracker?sslmode=disable
```

The backend receives only application credentials. The migration container gets
administrator credentials and exits after use. Environment values remain visible
to operators with Docker access. PostgreSQL receives password files through
secret mounts. This is password authentication on a private container network,
not passwordless Unix-socket authentication. `sslmode=disable` assumes this
single-host network; the database connection is not encrypted.

## First deployment

```sh
docker compose -f backend/compose.production.yml config --quiet
docker compose -f backend/compose.production.yml build backend migrate
docker compose -f backend/compose.production.yml up -d postgres
docker compose -f backend/compose.production.yml run --rm migrate
docker compose -f backend/compose.production.yml up -d backend
docker compose -f backend/compose.production.yml ps
docker compose -f backend/compose.production.yml logs --tail=100 backend
```

On the first initialization of an empty volume, PostgreSQL creates the restricted
`cftracker_app` login. The migration job checks checksums, applies the schema,
records checksums, and grants CRUD access to application tables and sequence
access. It grants no access to migration metadata. Future application tables or
sequences need explicit grants in `deploy/migrate.sh`.

The job uses prebuilt migration binaries; it needs no internet connection or Go
compiler at runtime. Building images does need registry and Go dependency access.
The API image does not apply migrations automatically. Do not start it until the
migration job succeeds: readiness verifies connectivity, not schema state.

The database has no published port and joins only an internal Docker network.
The backend also has outbound networking for GitHub and Codeforces. Only
`127.0.0.1:8080` is published for the host proxy. Do not deploy the development
database Compose file alongside this setup or publish pgAdmin publicly.

Configure the host proxy for HTTPS, forwarding to `127.0.0.1:8080`, preserving
paths, cookies, and Authorization, setting `X-Forwarded-Proto: https`, and omitting
OAuth query strings from access logs. Configure GitHub's OAuth callback URL to
match each frontend origin plus `/callback/auth-gh`. CORS entries remain origins without paths. No backend redirect environment variable is required. Set frontend build variables:

```dotenv
VITE_BACKEND_API_URL=https://your-api.example/api
VITE_IS_BACKEND_AVAILABLE=true
```

The frontend appends `/v1` to this base URL, producing `/api/v1` requests.
Do not include `/v1` in `VITE_BACKEND_API_URL`.

Use `/health/live` for liveness and `/health/ready` for readiness. Docker's image
health check reports readiness but Compose does not restart a running container
solely because it becomes unhealthy. The restart policy covers process exits.
Allow the configured 40-second container stop grace for the application's
30-second drain budget. Smoke-test GitHub login, profile, lists, and Codeforces
verification after configuring the real domains.

## Updates and database lifecycle

Back up before updating. Build the new images, run the migration job, and replace
the backend using the commands above. Stop the backend first when a schema change
is incompatible with the running release. Retain a previous image for rollback;
rolling back code does not undo schema changes.

The named volume persists across container replacement and ordinary `down`.
`down -v` deletes the database. Do not run it against retained data. Keep the
Compose project name and volume identity stable. Existing PostgreSQL volumes do
not rerun initialization or change passwords when secret files change. Rotate
passwords through PostgreSQL, then update the matching files and recreate clients.
Once data is retained, preserve applied migrations and add new versions.

## Administration and backups without a database port

SSH to the server and connect through the container's local socket:

```sh
docker compose -f backend/compose.production.yml exec postgres \
  psql -U postgres -d cftracker
```

Create a custom-format database backup on the host:

```sh
umask 077
docker compose -f backend/compose.production.yml exec -T postgres \
  pg_dump -U postgres -d cftracker -Fc > cftracker.dump
```

Check command success before treating a dump as complete. Keep copies off the
server and periodically test restoration. This dump contains the database, not
cluster roles; retain the application-role initialization and credential setup
separately. Docker and host administrators can access the local database.

To inspect an archive without changing data:

```sh
docker compose -f backend/compose.production.yml exec -T postgres \
  pg_restore --list < cftracker.dump
```

For an actual restore, stop the backend, create an empty destination database
owned by the administrator, restore with `pg_restore --no-owner --no-privileges`,
then apply the migration job's grants to that destination before starting the
backend. Do not restore over a live database or delete a production volume as a
routine restore step.
