CREATE SCHEMA IF NOT EXISTS migration_meta;

CREATE TABLE IF NOT EXISTS migration_meta.migration_checksums (
    version BIGINT PRIMARY KEY,
    up_checksum CHAR(64) NOT NULL,
    down_checksum CHAR(64) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS migration_meta.table_migrations (
    table_name TEXT PRIMARY KEY,
    rollback_version BIGINT NOT NULL CHECK (rollback_version >= 0)
);
