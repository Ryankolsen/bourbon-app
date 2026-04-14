-- Migration: replace bourbons_type_check CHECK constraint with a proper bourbon_type ENUM
-- No data migration required — all existing values are valid enum members.

-- 1. Create the enum type
CREATE TYPE bourbon_type AS ENUM (
  'traditional',
  'small_batch',
  'single_barrel',
  'wheated',
  'cask_strength',
  'high_rye',
  'rye',
  'bottled_in_bond',
  'straight',
  'blended'
);

-- 2. Drop the existing CHECK constraint
ALTER TABLE bourbons DROP CONSTRAINT IF EXISTS bourbons_type_check;

-- 3. Cast the column from text to bourbon_type (preserving nullability)
ALTER TABLE bourbons
  ALTER COLUMN type TYPE bourbon_type USING type::bourbon_type;
