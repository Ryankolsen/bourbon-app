-- Partial unique index for achievement_shared XP cap.
-- Separated from 20240136000000 because PostgreSQL does not allow using a newly
-- added enum value in a CREATE INDEX WHERE clause within the same transaction.

create unique index if not exists xp_events_achievement_shared_user_key_uniq
  on public.xp_events (user_id, event_type, reference_key)
  where event_type = 'achievement_shared';
