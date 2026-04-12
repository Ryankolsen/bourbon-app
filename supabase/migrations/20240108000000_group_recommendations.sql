-- Group Recommendations
-- Allows accepted group members to recommend bourbons to the group.
-- Scoped to group membership via RLS (non-members cannot read).

create table public.group_recommendations (
  id            uuid        default gen_random_uuid() primary key,
  group_id      uuid        not null references public.groups(id) on delete cascade,
  bourbon_id    uuid        not null references public.bourbons(id) on delete cascade,
  recommended_by uuid       not null references public.profiles(id) on delete cascade,
  note          text        check (char_length(note) <= 500),
  created_at    timestamptz default now() not null,
  -- one recommendation per (user, group, bourbon)
  unique (group_id, bourbon_id, recommended_by)
);

alter table public.group_recommendations enable row level security;

-- Accepted group members can see recommendations for their groups
create policy "Group members read recommendations"
  on public.group_recommendations for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_recommendations.group_id
        and group_members.user_id  = auth.uid()
        and group_members.status   = 'accepted'
    )
  );

-- Accepted members can recommend (must be the recommender)
create policy "Group members insert recommendations"
  on public.group_recommendations for insert
  to authenticated
  with check (
    recommended_by = auth.uid()
    and exists (
      select 1 from public.group_members
      where group_members.group_id = group_recommendations.group_id
        and group_members.user_id  = auth.uid()
        and group_members.status   = 'accepted'
    )
  );

-- Users can delete their own recommendations
create policy "Users delete own recommendations"
  on public.group_recommendations for delete
  to authenticated
  using (recommended_by = auth.uid());

create index on public.group_recommendations (group_id);
create index on public.group_recommendations (bourbon_id);
create index on public.group_recommendations (recommended_by);
