#!/bin/sh

set -eu

target_database=cftracker_test
reference_database=cftracker_test_reference
target_created=false
reference_created=false
copied_migrations=

require_value() {
	if [ -z "$2" ]; then
		echo "$1 is required" >&2
		exit 1
	fi
}

require_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "$1 is required and must be available on PATH" >&2
		exit 1
	fi
}

connected_database() {
	psql "$1" -XAt -v ON_ERROR_STOP=1 -c "SELECT current_database()"
}

server_identifier() {
	psql "$1" -XAt -v ON_ERROR_STOP=1 \
		-c "SELECT COALESCE(inet_server_addr()::text, 'local') || ':' || COALESCE(inet_server_port()::text, current_setting('port'))"
}

cleanup() {
	status=$?
	trap - EXIT HUP INT TERM

	if [ -n "$copied_migrations" ] && ! rm -rf "$copied_migrations"; then
		status=1
	fi
	if [ "$reference_created" = true ] && ! dropdb --maintenance-db="$TEST_DATABASE_ADMIN_URL" "$reference_database"; then
		status=1
	fi
	if [ "$target_created" = true ] && ! dropdb --maintenance-db="$TEST_DATABASE_ADMIN_URL" "$target_database"; then
		status=1
	fi

	exit "$status"
}

assert_version() {
	actual="$(make --no-print-directory migrate-version 2>&1)"
	if [ "$actual" != "$1" ]; then
		echo "Migration version is $actual, want $1" >&2
		exit 1
	fi
}

assert_table() {
	actual="$(psql "$MIGRATION_DATABASE_URL" -XAt -v ON_ERROR_STOP=1 -c "SELECT to_regclass('public.$1') IS NOT NULL")"
	if [ "$actual" != "$2" ]; then
		echo "Table $1 existence is $actual, want $2" >&2
		exit 1
	fi
}

assert_tables() {
	assert_table users "$1"
	assert_table lists "$2"
	assert_table list_items "$3"
}

restore_latest() {
	make --no-print-directory migrate-up
	assert_version 4
	assert_tables t t t
}

expect_failure() {
	description="$1"
	expected_message="$2"
	shift 2

	if output="$("$@" 2>&1)"; then
		echo "$description unexpectedly succeeded" >&2
		exit 1
	fi
	printf '%s\n' "$output"
	case "$output" in
		*"$expected_message"*) ;;
		*) echo "$description failed for an unexpected reason" >&2; exit 1 ;;
	esac
}

require_value TEST_DATABASE_ADMIN_URL "${TEST_DATABASE_ADMIN_URL:-}"
require_value TEST_DATABASE_URL "${TEST_DATABASE_URL:-}"
require_value SCHEMA_REFERENCE_DATABASE_URL "${SCHEMA_REFERENCE_DATABASE_URL:-}"
for command_name in createdb dropdb make mktemp pg_dump psql; do
	require_command "$command_name"
done

if [ "$TEST_DATABASE_URL" = "$SCHEMA_REFERENCE_DATABASE_URL" ]; then
	echo "Target and reference database URLs must be different" >&2
	exit 1
fi
if [ "$(connected_database "$TEST_DATABASE_ADMIN_URL")" != "postgres" ]; then
	echo "TEST_DATABASE_ADMIN_URL must connect to the postgres maintenance database" >&2
	exit 1
fi

dropdb --maintenance-db="$TEST_DATABASE_ADMIN_URL" --if-exists "$reference_database"
dropdb --maintenance-db="$TEST_DATABASE_ADMIN_URL" --if-exists "$target_database"

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
createdb --maintenance-db="$TEST_DATABASE_ADMIN_URL" "$target_database"
target_created=true
createdb --maintenance-db="$TEST_DATABASE_ADMIN_URL" "$reference_database"
reference_created=true

if [ "$(connected_database "$TEST_DATABASE_URL")" != "$target_database" ]; then
	echo "TEST_DATABASE_URL must connect to $target_database" >&2
	exit 1
fi
if [ "$(connected_database "$SCHEMA_REFERENCE_DATABASE_URL")" != "$reference_database" ]; then
	echo "SCHEMA_REFERENCE_DATABASE_URL must connect to $reference_database" >&2
	exit 1
fi
admin_server="$(server_identifier "$TEST_DATABASE_ADMIN_URL")"
if [ "$(server_identifier "$TEST_DATABASE_URL")" != "$admin_server" ] || \
	[ "$(server_identifier "$SCHEMA_REFERENCE_DATABASE_URL")" != "$admin_server" ]; then
	echo "Admin, target, and reference URLs must connect to the same PostgreSQL cluster" >&2
	exit 1
fi

script_directory="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$script_directory/.."
export MIGRATION_DATABASE_URL="$TEST_DATABASE_URL"

# Verify fresh application, full rollback, and restoration.
restore_latest
make --no-print-directory migrate-check
make --no-print-directory migrate-down
assert_tables f f f
expect_failure "Full rollback version check" "no migration" make --no-print-directory migrate-version
restore_latest

# Verify every registered named rollback from the latest migration.
while read -r table version users_exist lists_exist items_exist; do
	make --no-print-directory migrate-down "MIGRATION_TABLE=$table"
	assert_version "$version"
	assert_tables "$users_exist" "$lists_exist" "$items_exist"
	restore_latest
done <<'ROLLBACKS'
list_items 3 t t f
lists 2 t f f
users 1 f f f
ROLLBACKS
make --no-print-directory migrate-check

# Verify an applied migration cannot be changed through an alternate directory.
copied_migrations="$(mktemp -d "${TMPDIR:-/tmp}/cftracker-migrations.XXXXXX")"
cp -R migrations/. "$copied_migrations/"
printf '\n-- Local checksum failure probe\n' >> "$copied_migrations/000002_create_users.up.sql"
expect_failure \
	"Checksum verification" \
	"migration version 2 was changed after being recorded" \
	make --no-print-directory migrate-check "MIGRATIONS_DIR=$copied_migrations"

# Verify a direct schema change differs from a clean migration application.
make --no-print-directory migrate-check-schema
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
	-c "ALTER TABLE users ADD COLUMN migration_drift_probe TEXT"
expect_failure \
	"Schema drift verification" \
	"Database schema differs from a clean application of the migrations" \
	make --no-print-directory migrate-check-schema

echo "Migration tests passed"
