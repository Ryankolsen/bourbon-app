-- ─────────────────────────────────────────
-- GROUP MEMBER VISIBILITY (issue #17)
-- ─────────────────────────────────────────
-- Allow accepted group members to view each other's tastings and collection.
-- The existing "Users manage own ..." policies cover INSERT/UPDATE/DELETE;
-- these new SELECT policies extend read access to group peers.

-- Tastings: group members can view each other's entries
create policy "Group members can view each other's tastings"
  on public.tastings for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
        and gm2.user_id = tastings.user_id
        and gm1.status = 'accepted'
        and gm2.status = 'accepted'
    )
  );

-- Collection: group members can view each other's entries
create policy "Group members can view each other's collection"
  on public.user_collection for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
        and gm2.user_id = user_collection.user_id
        and gm1.status = 'accepted'
        and gm2.status = 'accepted'
    )
  );
