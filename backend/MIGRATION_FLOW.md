# Database Migration Flow

This document explains CFTracker's migration ordering, checksum protection, rollback behavior, and schema-drift detection.

## Migration sequence

| Version | Migration | Responsibility |
| --- | --- | --- |
| `000001` | `add_migration_checksums` | Creates `migration_meta.migration_checksums` and `migration_meta.table_migrations`. |
| `000002` | `create_users` | Creates `users`, its timestamp function, and its update trigger. |
| `000003` | `create_lists` | Creates `lists`, including its user foreign key and uniqueness constraint. |
| `000004` | `create_list_items` | Creates `list_items`, including its list foreign key and composite primary key. |

Migration metadata comes first so every application-table migration can be registered and checksummed. Its down migration intentionally retains this metadata so integrity checks continue to work after a full rollback.

## Migrate up

Running:

```sh
make migrate-up
```

performs three phases:

```text
Verify historical checksums
            |
            v
Apply pending migrations with golang-migrate
            |
            v
Record checksums for newly applied migrations
```

The corresponding Makefile commands are effectively:

```sh
go run ./cmd/migration-check ...
golang-migrate ... up
go run ./cmd/migration-check ... -sync
```

The generic step-based migration command and rollback commands follow the same verify-before, synchronize-after structure.

## Checksum verification

The migration checker scans the migrations directory and requires exactly one up file and one down file for every version. It computes a SHA-256 checksum from the exact bytes of each file.

PostgreSQL stores the following values in `migration_meta.migration_checksums`:

```text
version
up_checksum
down_checksum
recorded_at
```

The checker does not contain a hard-coded metadata migration version. It uses database state:

| Database state | Result | Reason |
| --- | --- | --- |
| Version `0`, checksum table absent | Continue | A fresh database has not run its first migration. |
| Version greater than `0`, checksum table absent | Stop | Every migrated database must contain checksum metadata. |
| Stored and calculated checksums match | Continue | The historical migration is unchanged. |
| A stored checksum differs | Stop | An applied migration was edited. |
| An applied version has no checksum | Stop | The supported synchronization flow was bypassed or failed. |
| A recorded migration file is missing | Stop | Migration history was deleted or is incomplete. |

Changing SQL, comments, or whitespace changes the checksum. Once a migration has been applied or shared, create a new migration instead of editing the historical file.

Check integrity without applying migrations:

```sh
make migrate-check
```

The checker can also run directly. When `-database` is omitted, it reads `DATABASE_URL` from the process environment or local `.env` file. An explicit flag takes precedence:

```sh
go run ./cmd/migration-check
go run ./cmd/migration-check -database='postgres://...'
```

## Rollbacks

### Full rollback

```sh
make migrate-down
```

This removes every application table. Migration metadata remains available for named rollbacks and integrity checks.

### Step rollback

```sh
make migrate direction=down steps=1
```

This moves backward by the requested number of migration versions.

### Named table rollback

```sh
make migrate-down table=lists
```

The Makefile does not contain table-specific migration versions. It passes the table name to `cmd/migration-target`, which reads the rollback target from `migration_meta.table_migrations`.

| Requested table | Target version | Result |
| --- | --- | --- |
| `list_items` | `3` | Removes list items; keeps lists and users. |
| `lists` | `2` | Removes list items and lists; keeps users. |
| `users` | `1` | Removes all application tables; keeps migration metadata. |

Dependencies remain safe because `golang-migrate` rolls migrations back in reverse version order.

## Schema-drift detection

Checksums detect changed migration files. They cannot detect SQL executed directly against a database.

The schema check requires the PostgreSQL `pg_dump` command. On macOS with Homebrew, install the PostgreSQL client tools and put them on `PATH`:

```sh
brew install libpq
echo 'export PATH="$(brew --prefix libpq)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
pg_dump --version
```

Create a separate, clean, disposable reference database. Never use the target application's database as the reference:

```sh
dropdb -h localhost -U postgres --if-exists cftracker_migration_reference
createdb -h localhost -U postgres cftracker_migration_reference
```

Then run the schema check:

```sh
make migrate-check-schema \
  reference_database_url='postgres://postgres:postgrespw@localhost:5432/cftracker_migration_reference?sslmode=disable'
```

The command:

1. Applies current migrations to the reference database.
2. Runs `pg_dump --schema-only` against the target and reference databases.
3. Removes ownership, privilege, comment, and generated restriction noise.
4. Compares the resulting schema definitions.
5. Fails when a table, column, constraint, index, function, or trigger differs.

The target database is inspected but not migrated by this command. The reference database must be disposable and should use the same PostgreSQL major version as the target.

## Code review map

| File | Responsibility |
| --- | --- |
| `Makefile` | Orchestrates verification, migration, checksum synchronization, and schema comparison. |
| `cmd/migration-check/main.go` | Discovers migration pairs, computes hashes, validates history, and records new checksums. |
| `cmd/migration-target/main.go` | Resolves a table name to its rollback version. |
| `scripts/check-schema-drift.sh` | Compares normalized PostgreSQL schema dumps. |
| `migrations/*.sql` | Defines ordered up and down schema changes. |

Review these invariants when changing migration code:

- Every version has one up file and one down file.
- Applied migration files are immutable.
- Corrections are introduced through a new migration version.
- Application tables register their rollback target in PostgreSQL.
- Checksum metadata survives rollback.
- Schema checks use a clean disposable reference database.
