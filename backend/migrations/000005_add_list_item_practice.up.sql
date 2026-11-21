CREATE TYPE practice_status AS ENUM ('not_started', 'attempted', 'in_progress', 'solved');
CREATE TYPE practice_help AS ENUM ('none', 'test_case', 'hint', 'editorial', 'solution');

ALTER TABLE list_items
    ADD COLUMN status practice_status,
    ADD COLUMN help_used practice_help,
    ADD COLUMN solved_on DATE,
    ADD COLUMN time_spent INTEGER,
    ADD COLUMN notes TEXT,
    ADD CONSTRAINT list_items_solved_on_range CHECK (solved_on BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'),
    ADD CONSTRAINT list_items_time_nonnegative CHECK (time_spent >= 0),
    ADD CONSTRAINT list_items_notes_length CHECK (char_length(notes) <= 512);

COMMENT ON COLUMN list_items.time_spent IS 'Active practice time in seconds.';
