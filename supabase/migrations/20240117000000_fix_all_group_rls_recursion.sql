-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: eliminate all remaining infinite recursion in groups/group_members RLS
-- (issue #35)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Root causes remaining after migration 20240116:
--
-- 1. The `groups` SELECT policy still queries `group_members` directly:
--      exists (select 1 from group_members where group_id = groups.id and ...)
--    Even though `group_members` SELECT now uses a SECURITY DEFINER helper,
--    the cross-table chain (groups → group_members → SECURITY DEFINER) causes
--    "infinite recursion" in some Postgres plan paths.  Fixing: rewrite the
--    groups SELECT policy to call `current_user_in_group()` directly.
--
-- 2. The group_members INSERT / UPDATE / DELETE policies all contain a
--    self-referential owner-check subquery that queries group_members.  While
--    that subquery goes through the fixed SELECT policy (SECURITY DEFINER), we
--    harden it further by extracting it into its own SECURITY DEFINER function
--    `is_group_owner(uuid)`.
--
-- Both helper functions are `STABLE` and `SECURITY DEFINER`, meaning they run
-- with the privileges of their owner (bypassing RLS entirely) and their results
-- can be cached per-statement by the planner.
--
-- This migration is idempotent: all CREATE OR REPLACE / DROP IF EXISTS so it
-- can be applied on top of 20240115 + 20240116 or on a fresh database.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper: is the current user an accepted member of a group? ───────────────
-- (Redefines the function from 20240116 — idempotent.)
create or replace function public.current_user_in_group(check_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = check_group_id
      and user_id   = auth.uid()
      and status    = 'accepted'
  );
$$;

-- ── Helper: is the current user an accepted OWNER of a group? ────────────────
create or replace function public.current_user_is_group_owner(check_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = check_group_id
      and user_id   = auth.uid()
      and role      = 'owner'
      and status    = 'accepted'
  );
$$;

-- ── groups: fix SELECT policy (remove direct group_members subquery) ──────────
drop policy if exists "Group members can view groups" on public.groups;
create policy "Group members can view groups"
  on public.groups for select
  using (
    created_by = auth.uid()
    or public.current_user_in_group(id)
  );

-- ── groups: fix INSERT policy (auth.role() → auth.uid() IS NOT NULL) ─────────
-- (Mirrors migration 20240115 — idempotent.)
drop policy if exists "Authenticated users can create groups" on public.groups;
create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() is not null and created_by = auth.uid());

-- ── group_members: fix SELECT policy (SECURITY DEFINER helper) ───────────────
-- (Mirrors migration 20240116 — idempotent.)
drop policy if exists "Members can view group membership" on public.group_members;
create policy "Members can view group membership"
  on public.group_members for select
  using (
    user_id = auth.uid()
    or public.current_user_in_group(group_id)
  );

-- ── group_members: fix INSERT policy ─────────────────────────────────────────
drop policy if exists "Group owners can invite members" on public.group_members;
create policy "Group owners can invite members"
  on public.group_members for insert
  with check (
    user_id = auth.uid()
    or public.current_user_is_group_owner(group_id)
  );

-- ── group_members: fix UPDATE policy ─────────────────────────────────────────
drop policy if exists "Users update own membership; owners update any" on public.group_members;
create policy "Users update own membership; owners update any"
  on public.group_members for update
  using (
    user_id = auth.uid()
    or public.current_user_is_group_owner(group_id)
  );

-- ── group_members: fix DELETE policy ─────────────────────────────────────────
drop policy if exists "Users can leave; owners can remove members" on public.group_members;
create policy "Users can leave; owners can remove members"
  on public.group_members for delete
  using (
    user_id = auth.uid()
    or public.current_user_is_group_owner(group_id)
  );
