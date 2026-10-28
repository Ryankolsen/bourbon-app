# db-migrate Reference

## `feature_flags` table

```sql
create table if not exists public.feature_flags (
  name  text primary key,
  enabled boolean not null default false
);
```

Seed a new flag in the same migration that introduces the gated behavior:

```sql
insert into public.feature_flags (name, enabled)
values ('my_feature_live', false)
on conflict (name) do nothing;
```

## Reading a flag inside a PL/pgSQL function

```sql
declare
  _flag_enabled boolean := false;
begin
  select enabled into _flag_enabled
  from public.feature_flags
  where name = 'my_feature_live';

  if not coalesce(_flag_enabled, false) then
    return; -- or return new; for trigger functions
  end if;

  -- gated logic here
end;
```

## Exception guard template (trigger functions)

Wrap the entire body so a bug in the trigger never breaks the originating write:

```sql
create or replace function public.my_trigger_fn()
returns trigger language plpgsql security definer as $$
begin
  begin
    -- actual logic here
  exception when others then
    raise warning 'my_trigger_fn: % %', sqlerrm, sqlstate;
  end;
  return new;
end;
$$;
```

## What needs a flag vs what doesn't

| Change | Flag needed? |
|---|---|
| New table | No |
| New column (nullable or with default) | No |
| New index | No |
| New trigger on an existing table | **Yes** |
| Rewrite of existing RPC (`check_in`, `award_xp`, etc.) | **Yes** |
| Adding table to realtime publication | **Yes** |
| New RPC (not replacing an existing one) | Usually no |
| Seed/reference data | No |

## Flipping the flag

No migration needed — run directly against remote:

```bash
npx supabase db query --linked \
  "update public.feature_flags set enabled = true where name = 'my_feature_live';"
```

Verify immediately after:

```bash
npx supabase db query --linked \
  "select name, enabled from public.feature_flags where name = 'my_feature_live';"
```

## Backfill consideration

When a flag is off, writes to tracking tables (e.g. `user_achievements`) still happen, but downstream effects (XP, notifications) do not. After flipping, users have their earned rows but no XP for the pre-flip period. Decide before flipping:

- **Accept the gap** — simplest, minor fairness issue for early adopters.
- **Backfill** — write a one-off script that reads the tracking table and inserts the missing `xp_events` rows. Ask the user to confirm scope before running.