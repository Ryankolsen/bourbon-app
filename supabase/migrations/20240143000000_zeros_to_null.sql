-- Migrate zero values to NULL for three numeric fields.
-- Zero is treated as "missing data" in the display layer and duel system;
-- NULL is the canonical representation of an unknown value.
-- After this migration all three fields are eligible for Tier 1 community
-- edits under the existing RLS policy (which gates on IS NULL).
--
-- Idempotent: a second run finds 0 rows and is a no-op.

UPDATE bourbons SET proof = NULL WHERE proof = 0;
UPDATE bourbons SET age_statement = NULL WHERE age_statement = 0;
UPDATE bourbons SET msrp = NULL WHERE msrp = 0;
