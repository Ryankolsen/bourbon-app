-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: missing INSERT policy on profiles + backfill orphaned auth users
-- ─────────────────────────────────────────────────────────────────────────────
-- The profiles table had SELECT + UPDATE policies but no INSERT policy.
-- RLS blocked the client-side upsert in use-auth.ts, so users whose
-- on_auth_user_created trigger failed had no profile row.
-- Without a profile row the user_collection FK constraint rejects every insert,
-- causing "Add to Collection" to silently fail.

-- Allow authenticated users to insert their own profile row
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Backfill profile rows for any auth users that are missing one
insert into public.profiles (id)
select id from auth.users
where id not in (select id from public.profiles);