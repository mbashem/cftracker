ALTER TABLE list_items DROP CONSTRAINT list_items_position_unique, DROP CONSTRAINT list_items_position_range;
WITH ranked AS (
    SELECT list_id, problem_id,
        row_number() OVER (PARTITION BY list_id ORDER BY position) - 1 AS position
    FROM list_items
)
UPDATE list_items SET position = ranked.position
FROM ranked WHERE list_items.list_id = ranked.list_id AND list_items.problem_id = ranked.problem_id;
ALTER TABLE list_items ALTER COLUMN position TYPE INTEGER;
