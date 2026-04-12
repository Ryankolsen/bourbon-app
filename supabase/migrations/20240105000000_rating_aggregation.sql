-- ─────────────────────────────────────────
-- RATING AGGREGATION (issue #12)
-- ─────────────────────────────────────────
-- Allow authenticated users to read any tasting so we can compute
-- community-wide aggregate ratings. Insert/update/delete remain owner-only.

drop policy "Users manage own tastings" on public.tastings;

create policy "Tastings are viewable by authenticated users"
  on public.tastings for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own tastings"
  on public.tastings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tastings"
  on public.tastings for update
  using (auth.uid() = user_id);

create policy "Users can delete own tastings"
  on public.tastings for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- VIEW: bourbon_rating_stats
-- ─────────────────────────────────────────
-- Aggregates all tastings per bourbon across all users.
-- avg_rating is rounded to 1 decimal place; null when no rated tastings exist.
create or replace view public.bourbon_rating_stats as
select
  bourbon_id,
  round(avg(rating)::numeric, 1)                          as avg_rating,
  count(*) filter (where rating is not null)::integer     as rating_count,
  count(*)::integer                                       as tasting_count
from public.tastings
group by bourbon_id;
