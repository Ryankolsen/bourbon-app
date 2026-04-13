-- ─────────────────────────────────────────────────────────────────────────────
-- group_notifications
--
-- Persistent per-owner notifications created when a group member accepts an
-- invitation.  Rows are soft-dismissed via dismissed_at rather than deleted so
-- we retain history for potential analytics.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.group_notifications (
  id           uuid        primary key default gen_random_uuid(),
  owner_id     uuid        not null references public.profiles(id) on delete cascade,
  joiner_id    uuid        not null references public.profiles(id) on delete cascade,
  group_id     uuid        not null references public.groups(id)   on delete cascade,
  created_at   timestamptz not null default now(),
  dismissed_at timestamptz
);

alter table public.group_notifications enable row level security;

-- Owners can read their own notifications
create policy "Owners can view their notifications"
  on public.group_notifications for select
  using (owner_id = auth.uid());

-- Owners can dismiss (update dismissed_at) their own notifications
create policy "Owners can dismiss their notifications"
  on public.group_notifications for update
  using (owner_id = auth.uid());

-- Only the trigger function (security definer) can insert; no direct client insert
create policy "No direct client insert"
  on public.group_notifications for insert
  with check (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

create index group_notifications_owner_id_idx
  on public.group_notifications (owner_id)
  where dismissed_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: create a notification when a group_members row is accepted
--
-- Fires AFTER UPDATE on group_members.
-- Conditions:
--   - new.status = 'accepted' AND old.status <> 'accepted'  (just accepted)
--   - The joining user is NOT the group owner                (avoid self-notify)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.notify_group_owner_on_member_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  -- Only fire on an acceptance transition
  if new.status <> 'accepted' or old.status = 'accepted' then
    return new;
  end if;

  -- Find the owner of this group
  select user_id into v_owner_id
  from public.group_members
  where group_id = new.group_id
    and role = 'owner'
    and status = 'accepted'
  limit 1;

  -- Don't notify if the owner is the one accepting (self-join / owner accepting their own row)
  if v_owner_id is null or v_owner_id = new.user_id then
    return new;
  end if;

  insert into public.group_notifications (owner_id, joiner_id, group_id)
  values (v_owner_id, new.user_id, new.group_id);

  return new;
end;
$$;

create trigger group_member_accepted_notify
  after update on public.group_members
  for each row
  execute function public.notify_group_owner_on_member_join();
