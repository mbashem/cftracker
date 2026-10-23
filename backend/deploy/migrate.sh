#!/bin/sh
set -eu
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL is required}"
/app/migration-check -path /app/migrations -database "$MIGRATION_DATABASE_URL"
/app/migrate -path /app/migrations -database "$MIGRATION_DATABASE_URL" up
/app/migration-check -path /app/migrations -database "$MIGRATION_DATABASE_URL" -sync
# Grant only application data access; migration metadata remains administrator-only.
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
GRANT SELECT, INSERT, UPDATE, DELETE ON users, lists, list_items TO cftracker_app;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq, lists_id_seq TO cftracker_app;
SQL
