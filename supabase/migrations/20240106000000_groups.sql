-- ─────────────────────────────────────────
-- GROUPS
-- ─────────────────────────────────────────

-- Master groups table
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 500),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table public.groups enable row level security;

-- Members of a group (includes pending invites)
create table public.group_members (
  group_id    uuid references public.groups(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  role        text not null default 'member' check (role in ('owner', 'member')),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  invited_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

-- ─────────────────────────────────────────
-- RLS: groups
-- ─────────────────────────────────────────

-- Members (accepted) can view the group
create policy "Group members can view groups"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id
        and gm.user_id = auth.uid()
        and gm.status = 'accepted'
    )
    or created_by = auth.uid()
  );

-- Any authenticated user can create a group
create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.role() = 'authenticated' and created_by = auth.uid());

-- Group owners can update their group
create policy "Group owners can update groups"
  on public.groups for update
  using (created_by = auth.uid());

-- Group owners can delete their group
create policy "Group owners can delete groups"
  on public.groups for delete
  using (created_by = auth.uid());

-- ─────────────────────────────────────────
-- RLS: group_members
-- ─────────────────────────────────────────

-- Members can see other members in groups they belong to;
-- users can also see their own pending invites
create policy "Members can view group membership"
  on public.group_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members me
      where me.group_id = group_members.group_id
        and me.user_id = auth.uid()
        and me.status = 'accepted'
    )
  );

-- Group owners can invite others (insert a pending row for another user)
create policy "Group owners can invite members"
  on public.group_members for insert
  with check (
    -- either creating own owner row (when creating a group), or
    -- is an accepted owner of the group inviting someone else
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members owner_row
      where owner_row.group_id = group_members.group_id
        and owner_row.user_id = auth.uid()
        and owner_row.role = 'owner'
        and owner_row.status = 'accepted'
    )
  );

-- Users can update their own membership row (to accept/decline)
-- Owners can update any member row (e.g., role changes)
create policy "Users update own membership; owners update any"
  on public.group_members for update
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members owner_row
      where owner_row.group_id = group_members.group_id
        and owner_row.user_id = auth.uid()
        and owner_row.role = 'owner'
        and owner_row.status = 'accepted'
    )
  );

-- Users can leave a group; owners can remove members
create policy "Users can leave; owners can remove members"
  on public.group_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members owner_row
      where owner_row.group_id = group_members.group_id
        and owner_row.user_id = auth.uid()
        and owner_row.role = 'owner'
        and owner_row.status = 'accepted'
    )
  );

-- ─────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────
create index group_members_group_id_idx on public.group_members (group_id);
create index group_members_user_id_idx  on public.group_members (user_id);
create index group_members_status_idx   on public.group_members (user_id, status);

-- Auto-update updated_at on groups
create or replace function public.handle_group_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger groups_updated_at
  before update on public.groups
  for each row execute function public.handle_group_updated_at();

create trigger group_members_updated_at
  before update on public.group_members
  for each row execute function public.handle_group_updated_at();
