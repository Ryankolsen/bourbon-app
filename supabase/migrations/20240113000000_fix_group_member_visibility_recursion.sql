-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: infinite recursion in group_member visibility RLS (issue #17 follow-up)
-- ─────────────────────────────────────────────────────────────────────────────
-- The group_members SELECT policy is self-referential (it queries group_members
-- to check membership). The policies added in 20240112000000 join into
-- group_members from tastings/user_collection, which triggers that policy,
-- which queries group_members again → "infinite recursion detected".
--
-- Fix: extract the membership check into a SECURITY DEFINER function that runs
-- with elevated privileges and bypasses RLS, then call it from the policies.

create or replace function public.shares_group_with(viewer_id uuid, target_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from group_members gm1
    join group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = viewer_id
      and gm2.user_id = target_id
      and gm1.status = 'accepted'
      and gm2.status = 'accepted'
  );
$$;

-- Tastings: replace the recursive subquery with the helper
drop policy if exists "Group members can view each other's tastings" on public.tastings;
create policy "Group members can view each other's tastings"
  on public.tastings for select
  using (
    auth.uid() = user_id
    or public.shares_group_with(auth.uid(), user_id)
  );

-- Collection: replace the recursive subquery with the helper
drop policy if exists "Group members can view each other's collection" on public.user_collection;
create policy "Group members can view each other's collection"
  on public.user_collection for select
  using (
    auth.uid() = user_id
    or public.shares_group_with(auth.uid(), user_id)
  );