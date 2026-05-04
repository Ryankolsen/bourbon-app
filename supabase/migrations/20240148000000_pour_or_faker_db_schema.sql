-- Pour or Faker DB schema updates:
--   1. Add pour_or_faker_complete to xp_event_type enum
--   2. Replace game_daily_sessions.game_type check constraint (sacred_pour → pour_or_faker)

alter type public.xp_event_type add value if not exists 'pour_or_faker_complete';

alter table public.game_daily_sessions
  drop constraint game_daily_sessions_game_type_check,
  add  constraint game_daily_sessions_game_type_check
       check (game_type in ('dojo_duel', 'pour_or_faker'));