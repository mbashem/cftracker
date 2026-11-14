ALTER TABLE list_items
    DROP COLUMN status,
    DROP COLUMN help_used,
    DROP COLUMN solved_on,
    DROP COLUMN time_spent,
    DROP COLUMN notes;

DROP TYPE practice_help;
DROP TYPE practice_status;
