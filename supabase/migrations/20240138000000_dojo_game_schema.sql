-- ─────────────────────────────────────────────────────────────────────────────
-- The Dojo: Game Tables, XP Enum Extension, Cold-Start Ghost Seeds
--
-- Delivers:
--   • xp_event_type enum extended with 5 game outcome values
--   • game_daily_sessions table — daily play cap tracking per user/game
--   • duel_ghost_runs table — completed duel runs used as async opponents
--   • duel_fake_notes table — pool of funny fake tasting notes (seeded separately)
--   • sensei_quotes table — sardonic commentary by outcome (seeded separately)
--   • RLS policies for all four tables
--   • 10 cold-start ghost rows, one per belt level, for day-one opponents
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend xp_event_type enum with game outcome values
-- ─────────────────────────────────────────────────────────────────────────────

alter type public.xp_event_type add value if not exists 'dojo_duel_win';
alter type public.xp_event_type add value if not exists 'dojo_duel_sweep';
alter type public.xp_event_type add value if not exists 'dojo_duel_loss';
alter type public.xp_event_type add value if not exists 'sacred_pour_perfect';
alter type public.xp_event_type add value if not exists 'sacred_pour_complete';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. game_daily_sessions — tracks daily play cap per user per game
--
-- Composite PK on (user_id, game_type, date) enforces one row per session.
-- Date stored as text (ISO 'YYYY-MM-DD') — comparison done in app-local time.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.game_daily_sessions (
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  game_type  text        not null check (game_type in ('dojo_duel', 'sacred_pour')),
  date       date        not null,
  plays_used integer     not null default 0 check (plays_used >= 0),
  xp_earned  integer     not null default 0 check (xp_earned >= 0),
  primary key (user_id, game_type, date)
);

alter table public.game_daily_sessions enable row level security;

create policy "Users can read own game_daily_sessions"
  on public.game_daily_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own game_daily_sessions"
  on public.game_daily_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own game_daily_sessions"
  on public.game_daily_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. duel_ghost_runs — completed duel runs that serve as async ghost opponents
--
-- user_id is nullable to allow system-seeded cold-start ghost rows.
-- round_results jsonb stores per-round outcome: { round1, round2, round3 }
--   each round: { correct: bool, time_ms: int }
-- Index on belt_level supports efficient ghost matching within ±1 belt.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.duel_ghost_runs (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references public.profiles(id) on delete set null,
  belt_level    integer     not null check (belt_level between 1 and 10),
  difficulty    text        not null check (difficulty in ('training', 'standard', 'challenge')),
  round_results jsonb       not null,
  xp_earned     integer     not null default 0 check (xp_earned >= 0),
  created_at    timestamptz not null default now()
);

create index if not exists duel_ghost_runs_belt_level_idx on public.duel_ghost_runs (belt_level);

alter table public.duel_ghost_runs enable row level security;

create policy "Authenticated users can read all duel_ghost_runs"
  on public.duel_ghost_runs for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own duel_ghost_runs"
  on public.duel_ghost_runs for insert
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. duel_fake_notes — pool of funny fake tasting notes for Round 3
--
-- difficulty_tier: 1 = Training (obviously wrong), 2 = Standard, 3 = Challenge
-- Seeded with content by the content seed migration (20240139).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.duel_fake_notes (
  id               uuid        primary key default gen_random_uuid(),
  note             text        not null,
  difficulty_tier  integer     not null check (difficulty_tier between 1 and 3),
  created_at       timestamptz not null default now()
);

alter table public.duel_fake_notes enable row level security;

create policy "Authenticated users can read duel_fake_notes"
  on public.duel_fake_notes for select
  using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. sensei_quotes — sardonic commentary lines keyed by game outcome
--
-- outcome values: 'duel_win', 'duel_loss', 'duel_sweep',
--                 'pour_perfect', 'pour_partial', 'pour_fail'
-- Seeded with content by the content seed migration (20240139).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.sensei_quotes (
  id         uuid        primary key default gen_random_uuid(),
  outcome    text        not null check (outcome in (
               'duel_win', 'duel_loss', 'duel_sweep',
               'pour_perfect', 'pour_partial', 'pour_fail'
             )),
  quote      text        not null,
  created_at timestamptz not null default now()
);

create index if not exists sensei_quotes_outcome_idx on public.sensei_quotes (outcome);

alter table public.sensei_quotes enable row level security;

create policy "Authenticated users can read sensei_quotes"
  on public.sensei_quotes for select
  using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Cold-start ghost seeds — one fallback opponent per belt level (1–10)
--
-- user_id is null to mark these as system-seeded rows (not real player runs).
-- round_results represent average play: wins rounds 1 and 2, loses round 3.
-- Used until enough real player runs accumulate for each belt bracket.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.duel_ghost_runs (user_id, belt_level, difficulty, round_results, xp_earned)
select
  null,
  belt_level,
  'standard',
  jsonb_build_object(
    'round1', jsonb_build_object('correct', true,  'time_ms', timing),
    'round2', jsonb_build_object('correct', true,  'time_ms', timing + 1000),
    'round3', jsonb_build_object('correct', false, 'time_ms', timing + 2000)
  ),
  xp
from (values
  (1,  4500, 25),
  (2,  4000, 25),
  (3,  3500, 25),
  (4,  3200, 30),
  (5,  3000, 30),
  (6,  2800, 35),
  (7,  2600, 35),
  (8,  2400, 40),
  (9,  2200, 40),
  (10, 2000, 50)
) as seeds(belt_level, timing, xp)
where not exists (
  select 1 from public.duel_ghost_runs
  where user_id is null and duel_ghost_runs.belt_level = seeds.belt_level
);
