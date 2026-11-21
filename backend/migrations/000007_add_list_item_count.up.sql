ALTER TABLE lists ADD COLUMN item_count INTEGER NOT NULL DEFAULT 0
    CONSTRAINT lists_item_count_nonnegative CHECK (item_count >= 0);

UPDATE lists SET item_count = existing.item_count
FROM (
    SELECT list_id, count(*) AS item_count
    FROM list_items GROUP BY list_id
) AS existing
WHERE lists.id = existing.list_id;
