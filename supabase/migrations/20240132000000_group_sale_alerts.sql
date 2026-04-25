-- Group Sale Alerts
-- Allows accepted group members to post sale alerts for bourbons they've
-- spotted at local stores.  Any accepted member can soft-delete an alert
-- once the stock is gone.  Alerts auto-expire after 30 days (filtered in
-- application queries).

-- ─────────────────────────────────────────────────────────────────────────────
-- group_sale_alerts
-- ─────────────────────────────────────────────────────────────────────────────

create table public.group_sale_alerts (
  id            uuid        default gen_random_uuid() primary key,
  group_id      uuid        not null references public.groups(id) on delete cascade,
  bourbon_id    uuid        not null references public.bourbons(id) on delete cascade,
  posted_by     uuid        not null references public.profiles(id) on delete cascade,
  price         text        not null check (char_length(price) <= 50),
  place_id      text        not null,
  place_name    text        not null,
  place_address text        not null,
  note          text        check (char_length(note) <= 500),
  created_at    timestamptz default now() not null,
  removed_at    timestamptz,
  removed_by    uuid        references public.profiles(id) on delete set null
);

alter table public.group_sale_alerts enable row level security;

-- Accepted group members can read active alerts for their groups
create policy "Group members read sale alerts"
  on public.group_sale_alerts for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_sale_alerts.group_id
        and group_members.user_id  = auth.uid()
        and group_members.status   = 'accepted'
    )
  );

-- Accepted members can post alerts (must be the poster)
create policy "Group members insert sale alerts"
  on public.group_sale_alerts for insert
  to authenticated
  with check (
    posted_by = auth.uid()
    and exists (
      select 1 from public.group_members
      where group_members.group_id = group_sale_alerts.group_id
        and group_members.user_id  = auth.uid()
        and group_members.status   = 'accepted'
    )
  );

-- Any accepted member can soft-delete (update removed_at / removed_by)
create policy "Group members remove sale alerts"
  on public.group_sale_alerts for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = group_sale_alerts.group_id
        and group_members.user_id  = auth.uid()
        and group_members.status   = 'accepted'
    )
  );

create index on public.group_sale_alerts (group_id);
create index on public.group_sale_alerts (bourbon_id);
create index on public.group_sale_alerts (posted_by);
create index on public.group_sale_alerts (created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_push_tokens
-- ─────────────────────────────────────────────────────────────────────────────

create table public.user_push_tokens (
  user_id    uuid        primary key references public.profiles(id) on delete cascade,
  token      text        not null,
  platform   text        not null check (platform in ('ios', 'android')),
  updated_at timestamptz default now() not null
);

alter table public.user_push_tokens enable row level security;

-- Users can read and write their own push token only
create policy "Users read own push token"
  on public.user_push_tokens for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users upsert own push token"
  on public.user_push_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users update own push token"
  on public.user_push_tokens for update
  to authenticated
  using (user_id = auth.uid());

create policy "Users delete own push token"
  on public.user_push_tokens for delete
  to authenticated
  using (user_id = auth.uid());
