-- ─────────────────────────────────────────────────────────────────────────────
-- backfill-achievement-xp.sql  (one-off script, NOT a migration)
--
-- RUNBOOK
-- 1. Purpose (2026-10-17): pay XP for achievements earned before XP payouts took
--    effect. user_achievements rows with no matching xp_events row
--    (event_type = 'achievement_unlocked', reference_id = achievement_id) get
--    public.award_xp(user_id, 'achievement_unlocked', achievements.xp_award,
--    achievement_id). award_xp updates user_xp.total_xp, the belt in user_xp and
--    profiles, and inserts the xp_events row. It skips belt achievements for
--    this event type, so nothing cascades. No social_notifications are inserted.
--
-- 2. Dry run (preview the rows; read-only). Keep this filter in sync with the
--    live CTE below:
--      select ua.user_id, a.key, a.xp_award, ua.earned_at
--        from public.user_achievements ua
--        join public.achievements a on a.id = ua.achievement_id
--       where not exists (
--               select 1 from public.xp_events xe
--                where xe.user_id      = ua.user_id
--                  and xe.event_type   = 'achievement_unlocked'
--                  and xe.reference_id = ua.achievement_id);
--
-- 3. Local run:
--      npx supabase db query --local --file scripts/backfill-achievement-xp.sql
--    (Always pass --local. Never --linked unless deliberately running prod.)
--
-- 4. Expected production effect: 4 rows, 3 users, 115 XP.
--
-- 5. Safe to run twice: a paid row gains an xp_events row, so the selection
--    finds 0 rows the second time and nothing changes.
--
-- Not under supabase/migrations/, so db reset / db push never run it.
-- Runs as one atomic statement (single transaction); prints a summary (rows paid, users, total XP).
-- ─────────────────────────────────────────────────────────────────────────────

-- One single statement on purpose: `supabase db query` rejects multi-statement
-- files, and a single statement is atomic (one transaction, all or nothing).
with unpaid as materialized (
  select ua.user_id, ua.achievement_id, a.xp_award
    from public.user_achievements ua
    join public.achievements a on a.id = ua.achievement_id
   where not exists (
           select 1 from public.xp_events xe
            where xe.user_id      = ua.user_id
              and xe.event_type   = 'achievement_unlocked'
              and xe.reference_id = ua.achievement_id
         )
), paid as materialized (
  select u.user_id,
         u.xp_award,
         (select x.xp_awarded
            from public.award_xp(u.user_id, 'achievement_unlocked', u.xp_award, u.achievement_id) x) as xp_paid
    from unpaid u
)
select count(*)                   as rows_paid,
       count(distinct user_id)    as distinct_users,
       coalesce(sum(xp_paid), 0)  as total_xp
  from paid;
