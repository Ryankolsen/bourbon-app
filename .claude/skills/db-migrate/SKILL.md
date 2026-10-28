---
name: db-migrate
description: Safely author, test, and deploy Supabase migrations for BourbonVault without breaking existing deployed builds. Uses feature flags to gate new functionality, exception guards on triggers, and a structured local→remote checklist. Use when writing a new migration, pushing schema changes, adding triggers or RPCs, flipping a feature flag, or whenever the user asks "is it safe to push to the database".
---

# db-migrate

## The cardinal rule

**Any migration that touches existing behavior must be gated behind a feature flag.** New tables and columns are additive and safe. New triggers, RPC rewrites, and realtime publications affect live bundles and must be gated.

## Local vs remote commands

```bash
# Apply to LOCAL Supabase only (safe to experiment)
npx supabase migration up

# Apply to REMOTE (prod) — always confirm the list before accepting
npx supabase db push --linked

# Query remote to verify state
npx supabase db query --linked "<SQL>"
```

> `supabase db push` without `--linked` STILL hits remote. There is no flag to target local with `db push` — use `migration up` for local.

## Workflow

### 1. Write the migration

- New tables/columns: no flag needed.
- New triggers or RPC rewrites: add a feature flag gate (see below).
- Every trigger function must have an exception guard (see REFERENCE.md).
- Seed the flag as `false` in the same migration — never `true`.

### 2. Test locally

```bash
npx supabase migration up
# Exercise the feature in the simulator
# Confirm existing flows (XP toast, belt promotion, notifications) still work
```

### 3. Confirm flag is off locally

```bash
npx supabase db query "select name, enabled from public.feature_flags;"
```

### 4. Push to remote

```bash
npx supabase db push --linked
# Review the migration list carefully before accepting
```

### 5. Confirm flag is off on remote

```bash
npx supabase db query --linked "select name, enabled from public.feature_flags;"
```

### 6. QA on remote

- Verify existing flows are unaffected.
- Verify new functionality is silently tracking (rows written, no UI side effects).

### 7. Ship the new bundle

Run `eas build --platform all --profile production` and submit to both stores. Wait for both to be live.

### 8. Decide: backfill?

Before flipping the flag, decide whether users who triggered events while the flag was off should receive retroactive XP/data. Ask explicitly — this is a product decision, not a default.

### 9. Flip the flag (no migration needed)

```bash
npx supabase db query --linked \
  "update public.feature_flags set enabled = true where name = '<flag_name>';"
```

Or via Supabase dashboard SQL editor.

## Rollback

There is no built-in rollback. To undo: write a new migration that drops/reverts the objects. Because the flag is off, the blast radius of any bug is contained — existing bundles are unaffected until you flip it.

## See also

- [REFERENCE.md](REFERENCE.md) — feature flag pattern, exception guard template, `feature_flags` table schema