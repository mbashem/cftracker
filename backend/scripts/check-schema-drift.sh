#!/bin/sh

set -eu

if [ "$#" -ne 2 ]; then
	echo "Usage: $0 TARGET_DATABASE_URL REFERENCE_DATABASE_URL" >&2
	exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
	echo "pg_dump is required to check schema drift" >&2
	exit 1
fi

target_dump="$(mktemp)"
reference_dump="$(mktemp)"
trap 'rm -f "$target_dump" "$reference_dump"' EXIT

dump_schema() {
	pg_dump "$1" \
		--schema-only \
		--no-owner \
		--no-privileges \
		--no-comments \
		| sed '/^\\restrict /d; /^\\unrestrict /d' >"$2"
}

dump_schema "$1" "$target_dump"
dump_schema "$2" "$reference_dump"

if ! diff -u --label expected-schema --label target-schema "$reference_dump" "$target_dump"; then
	echo "Database schema differs from a clean application of the migrations" >&2
	exit 1
fi

echo "Database schema matches the migrations"
