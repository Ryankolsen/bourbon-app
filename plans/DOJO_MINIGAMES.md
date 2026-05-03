# PRD: The Dojo — Dojo Duel & Sacred Pour Mini-Games

## Problem Statement

BourbonVault users earn XP through passive actions — logging tastings, checking in daily, interacting socially. There is no active, skill-based way to engage with the app. Users who want to deepen their bourbon knowledge have no structured, repeatable practice loop, and the daily habit mechanics are limited to a single check-in. The result is that engagement drops off between tasting logs, and the belt progression system lacks a dedicated arena for users to actively "train" their way to the next rank.

## Solution

Introduce **The Dojo** — a new bottom navigation tab that serves as the home for skill-based mini-games. Launch with two games:

1. **The Dojo Duel** — A 3-round bourbon knowledge sparring match against an async ghost opponent. Round 1 tests bourbon identification, Round 2 tests stat knowledge (proof, age, mash bill), and Round 3 challenges the player to spot a fake tasting note mixed in with two real ones. Fake notes are drawn from a large pre-seeded bank and are funny at every belt level. Win 2 of 3 rounds to beat the ghost and earn XP.

2. **The Sacred Pour** — A memorization kata. The app reveals a sequence of tasting attributes from a real bourbon one by one, then shuffles them into a grid. The player must recreate the exact sequence from memory. Sensei delivers sardonic commentary drawn from a pre-seeded quote bank.

Both games have a fixed daily play cap, difficulty choice (Training / Standard / Challenge), and integrate with the existing XP/belt progression system. All randomized content (fake notes, Sensei quips) is served from the database — no AI calls at runtime.

## User Stories

1. As a bourbon dojo member, I want a dedicated tab called "The Dojo" so I have a clear daily destination for skill-based practice.
2. As a user, I want to see both available mini-games on The Dojo home screen so I can choose which one to play.
3. As a user, I want to see my remaining daily plays for each game so I know how much practice I have left today.
4. As a user, I want to see a countdown to when my daily plays reset so I know when to come back.
5. As a user, I want to start a Dojo Duel and be matched against an async ghost opponent at a similar belt level so the challenge feels appropriately competitive.
6. As a user, I want to see my ghost opponent's health bar alongside mine during a duel so the sparring metaphor feels alive.
7. As a user in Round 1 of a Dojo Duel, I want to see a partial bourbon dossier and pick the correct bourbon from multiple choices so I'm tested on identification.
8. As a user in Round 2 of a Dojo Duel, I want to compare two bourbons on a stat (proof, age, or mash bill type) so I'm tested on factual bourbon knowledge.
9. As a user in Round 3 of a Dojo Duel, I want to see two real tasting notes and one fake, and pick the fake, so I'm tested on sensory vocabulary.
10. As a user, I want the fake tasting note to be funny at every belt level so the game has personality regardless of my rank.
11. As a user, I want to see a clear win/loss result after a duel with my XP earned so I know how I did.
12. As a user, I want my completed duel runs to be eligible as ghost opponents for other players so my practice contributes to the community.
13. As a user, I want to start a Sacred Pour round and watch a sequence of bourbon tasting attributes reveal one at a time so I can memorize them.
14. As a user in The Sacred Pour, I want to tap cards in the correct order from a shuffled grid to recreate the sequence.
15. As a user, I want to see which cards I placed correctly and incorrectly after submitting so I can learn.
16. As a user, I want a sardonic Sensei commentary line after every Sacred Pour attempt so the game has character.
17. As a user, I want to choose Training Mode (below my belt level) so I can practice without pressure, at reduced XP.
18. As a user, I want to choose Challenge Mode (above my belt level) so I can earn bonus XP at higher difficulty.
19. As a user, I want to earn XP even on losses and failed attempts so the dojo always rewards showing up.
20. As a user, I want to see an XP toast after completing a game, consistent with the rest of the app.
21. As a user, I want The Dojo tab badge or indicator to nudge me when I have plays remaining today.
22. As a user, I want the question pool to be automatically generated from the bourbon database so all content is grounded in real bourbon knowledge.
23. As a user at higher belt levels, I want the question pool to draw from more obscure and challenging bourbons so the games stay interesting as I progress.
24. As a user, I want win streaks across multiple duels to earn bonus XP so consistent daily play is rewarded.
25. As a user, I want to see a result screen after each game showing accuracy and XP earned so I can track improvement over time.
26. As an admin, I want fake notes and Sensei quotes stored in the database so new lines can be added without a code deploy.

## Implementation Decisions

### Navigation
- Add a **"The Dojo"** tab to the bottom tab navigator alongside existing tabs.
- The tab home screen lists both games with daily play status and reset countdown.

### Daily Play Cap
- Fixed cap per game per day (exact number TBD at implementation, ~5 per game).
- New `game_daily_sessions` table: `(user_id, game_type, date, plays_used, xp_earned)` with composite PK on `(user_id, game_type, date)`.
- Date comparison is done in user-local time at the application layer.

### Difficulty System
- Three tiers: **Training** (below current belt), **Standard** (current belt), **Challenge** (above current belt).
- Difficulty affects: question pool (simpler vs. obscure bourbons), distractor count, sequence length, display timing.
- XP multipliers: Training = 0.5×, Standard = 1×, Challenge = 1.5×.
- Difficulty selected via a picker before each session.

### XP Integration
- Extend the `xp_event_type` enum: `dojo_duel_win`, `dojo_duel_sweep`, `dojo_duel_loss`, `sacred_pour_perfect`, `sacred_pour_complete`.
- All awards go through the existing `award_xp()` RPC to maintain consistency with toast notifications, belt promotion detection, and the realtime subscription.
- Difficulty multiplier is applied to the XP amount before calling the RPC.

### Randomized Content — No AI at Runtime
- **Fake tasting notes** and **Sensei quotes** are served from pre-seeded database tables, not generated by AI on each play.
- A one-time offline script (using Claude API) generates the initial seed set of ~300 fake notes and ~100 Sensei quotes across all outcome categories. These are inserted via a migration.
- New content can be added in future migrations without code changes.
- `duel_fake_notes` table: `(id, note text, difficulty_tier int, created_at)` — pool of funny fake tasting notes, optionally tagged by tier so easier belts get more obviously wrong fakes while harder belts get more plausible ones.
- `sensei_quotes` table: `(id, outcome text, quote text)` — outcome values: `duel_win`, `duel_loss`, `duel_sweep`, `pour_perfect`, `pour_partial`, `pour_fail`.

### The Dojo Duel — Architecture
- **Question generation at session start:** Query `bourbons` table to build a 3-round question set. Distractors for Round 1 and Round 2 are bourbons with similar attributes (same type, neighboring proof/age range) to make them plausible wrong answers.
- **Round 3 fake note:** Select a random entry from `duel_fake_notes` filtered by difficulty tier. Two real notes are pulled from the `tastings` table for the same bourbon.
- **Ghost opponent:** On duel completion, write round-by-round results to `duel_ghost_runs (id, user_id, belt_level, difficulty, round_results jsonb, xp_earned, created_at)`. At session start, fetch a ghost run within ±1 belt level of the current player. Cold-start fallback: pre-seeded ghost runs representing average play at each belt level.
- **Sensei commentary:** Random quote from `sensei_quotes` filtered by outcome.

### The Sacred Pour — Architecture
- **Sequence generation:** For a given difficulty, select a random bourbon from the pool. Decompose `nose`, `palate`, and `finish` text into individual descriptor phrases. Select N phrases as the target sequence (3 / 5 / 7 for Training / Standard / Challenge). Add M distractors from bourbons with similar profiles.
- **Display timing:** 2.0s / 1.0s / 0.7s per card for Training / Standard / Challenge.
- **Scoring:** Perfect first attempt = full XP. One error = partial XP. Multiple errors = floor XP. Any completion earns at least the floor.
- **Sensei commentary:** Random quote from `sensei_quotes` by outcome.

### Schema Changes
- New table: `game_daily_sessions (user_id, game_type, date, plays_used, xp_earned)`
- New table: `duel_ghost_runs (id, user_id, belt_level, difficulty, round_results jsonb, xp_earned, created_at)`
- New table: `duel_fake_notes (id, note text, difficulty_tier int, created_at)`
- New table: `sensei_quotes (id, outcome text, quote text)`
- Extend `xp_event_type` enum with five new game outcome values.

### Module Boundaries
- **GameDailyTracker** — Reads/writes `game_daily_sessions`. Exposes `canPlay(userId, gameType)` and `recordPlay(userId, gameType, xpEarned)`. Enforces daily cap. Testable in isolation.
- **DuelQuestionGenerator** — Given belt level and difficulty, queries bourbons and returns a structured 3-round question set. Pure function over DB data, no side effects.
- **GhostOpponentService** — Selects ghost run from `duel_ghost_runs` by belt level. Writes new ghost runs on completion. Handles cold-start fallback.
- **KataSequenceGenerator** — Given belt level and difficulty, returns sequence + distractor set from a bourbon's tasting fields. Pure function.
- **ContentBank** — Single module for fetching randomized fake notes and Sensei quotes from the DB. Abstracted so the calling game code doesn't know or care about the source.

## Out of Scope

- Real-time / synchronous multiplayer duels.
- Leaderboards or competitive rankings between users.
- A third or fourth mini-game at launch (this PRD covers two games only).
- Push notifications reminding users to play their daily games.
- Admin UI for curating game content — new content added via migrations.
- The Price Whisperer, The Mash Pit, or any other brainstormed game concepts.
- Any live AI/Claude API calls during active gameplay.

## Further Notes

- The cold-start problem for ghost opponents is real: early users won't have ghost runs to match against. The pre-seeded fallback ghost runs should be written as part of the initial migration so day-one users have an opponent.
- The `sensei_quotes` and `duel_fake_notes` tables are the personality layer of both games. The initial seed migration should be generous — at least 100 Sensei quotes and 300 fake notes — so repetition doesn't set in quickly for daily players.
- Both games reuse the existing `XpToast`, `BeltUpModal`, and `XpBurst` components. No new XP celebration UI is needed.
- The difficulty picker should show the XP multiplier clearly so users understand the tradeoff before choosing.
- The ghost opponent's round results should be shown post-duel in a recap so players understand why they won or lost against the ghost — this reinforces the "sparring partner" metaphor.

---

## Implementation Notes (as-built)

### Bourbon Pool — Live from DB, Not Pre-Curated
The bourbon pool is fetched at runtime from the `bourbons` table on every session — no separate game-specific table. As users fill in missing bourbon data, those bourbons automatically become eligible. The pool filter requires:
- `name` is non-null and non-blank
- `type` is non-null
- At least one of `proof > 0`, `distillery IS NOT NULL`, or `state IS NOT NULL`

As of launch ~417 of 1,860 bourbons meet this bar. The query over-fetches 150 candidates and shuffles to a pool of 30, so every session is unique.

### Round 1 Dossier — Partial, Data-Driven
Round 1 shows a partial dossier card instead of a blank "??? Bourbon" placeholder. Fields shown (only when non-null/non-zero): **Type** (human-readable label from enum), **State**, **Distillery**, **Proof**. The `BourbonDossier` type is exported from `duel-question-generator.ts`. The display adapts — if a bourbon only has type data, only type is shown; "No details on file" is the last resort.

### Round 2 Stat Battle — Independent Target Selection
Round 2 picks its subject independently from a `statEligiblePool` (bourbons with at least one of proof/age/mashbill that is non-null and non-zero). This decouples Round 1 and Round 2 targets so a bourbon that qualifies for the pool via distillery/state alone can never produce "0" as the correct stat answer.

### Fake Notes & Sensei Quotes — Public Read RLS
`duel_fake_notes` and `sensei_quotes` were originally gated with `auth.role() = 'authenticated'`. This caused silent query failures (returning empty) before auth was fully resolved during game load, which caused the Honda Civic hardcoded fallback to appear every round. Both tables now use `using (true)` — they contain no sensitive data. Migration: `20240140000000_dojo_public_read_policies.sql`.

### Seeded Content
- `duel_fake_notes`: 100 notes per tier (301 total) seeded in `20240139000000_dojo_content_seed.sql`
- `sensei_quotes`: ~93 quotes across 6 outcome keys (`duel_win`, `duel_loss`, `duel_sweep`, `pour_perfect`, `pour_partial`, `pour_fail`)
- Fake note query fetches 50 per session (not 10) for better `pickRandom` variety
