ALTER TABLE list_items ALTER COLUMN position TYPE BIGINT;

WITH ranked AS (
    SELECT list_id, problem_id,
        row_number() OVER (PARTITION BY list_id ORDER BY position, created_at, problem_id) * 1073741824::bigint AS position
    FROM list_items
)
UPDATE list_items SET position = ranked.position
FROM ranked WHERE list_items.list_id = ranked.list_id AND list_items.problem_id = ranked.problem_id;

ALTER TABLE list_items
    ADD CONSTRAINT list_items_position_range CHECK (position > 0 AND position <= 9007199254740991),
    ADD CONSTRAINT list_items_position_unique UNIQUE (list_id, position) DEFERRABLE INITIALLY DEFERRED;
