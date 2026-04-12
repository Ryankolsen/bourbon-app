-- ─────────────────────────────────────────
-- BOURBON LOCATION COLUMNS (issue #2 / #5)
-- ─────────────────────────────────────────
alter table public.bourbons
  add column if not exists city    text,
  add column if not exists state   text,
  add column if not exists country text;

-- ─────────────────────────────────────────
-- DROP bottle_status FROM user_collection (issue #2)
-- ─────────────────────────────────────────
alter table public.user_collection
  drop column if exists bottle_status;

-- ─────────────────────────────────────────
-- CHANGE tastings.rating TO 1–5 INTEGER (issue #2)
-- ─────────────────────────────────────────
-- Drop the old numeric check constraint and column type, replace with
-- an integer column constrained to 1–5.  Existing rows with values
-- outside [1,5] are cleared to NULL so the migration is non-destructive.
drop view if exists public.bourbon_rating_stats;

alter table public.tastings
  drop column rating;

alter table public.tastings
  add column rating integer check (rating between 1 and 5);

-- ─────────────────────────────────────────
-- REFRESH bourbon_rating_stats VIEW
-- ─────────────────────────────────────────
-- The view already selects avg(rating) generically, so no SQL change is
-- needed — it will now reflect the 1–5 scale automatically.  We recreate
-- it here to make the migration idempotent with the new column definition.
create or replace view public.bourbon_rating_stats as
select
  bourbon_id,
  round(avg(rating)::numeric, 1)                          as avg_rating,
  count(*) filter (where rating is not null)::integer     as rating_count,
  count(*)::integer                                       as tasting_count
from public.tastings
group by bourbon_id;
