-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: infinite recursion in group_members SELECT policy (issue #24 follow-up)
-- ─────────────────────────────────────────────────────────────────────────────
-- Root cause: the group_members SELECT policy contains a self-referential
-- subquery. When groups are queried, the groups SELECT policy reads
-- group_members, which triggers the group_members SELECT policy, which reads
-- group_members again → "infinite recursion detected in policy for relation
-- group_members".
--
-- Migration 20240113000000 fixed tastings/user_collection by introducing a
-- SECURITY DEFINER helper, but left the group_members SELECT policy unchanged.
--
-- Fix: add a SECURITY DEFINER function that checks whether auth.uid() is an
-- accepted member of a given group (bypasses RLS), then use it in the
-- group_members SELECT policy to eliminate the self-reference.

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
      and user_id = auth.uid()
      and status = 'accepted'
  );
$$;

-- Replace self-referential SELECT policy with the SECURITY DEFINER helper
drop policy if exists "Members can view group membership" on public.group_members;
create policy "Members can view group membership"
  on public.group_members for select
  using (
    user_id = auth.uid()
    or public.current_user_in_group(group_id)
  );
