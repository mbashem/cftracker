INSERT INTO migration_meta.table_migrations (table_name, rollback_version)
VALUES ('list_items', 3)
ON CONFLICT (table_name) DO UPDATE
SET rollback_version = EXCLUDED.rollback_version;

CREATE TABLE IF NOT EXISTS list_items (
    list_id INT NOT NULL,
    problem_id VARCHAR(100) NOT NULL,
    position INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_list FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
    PRIMARY KEY (list_id, problem_id)
);
