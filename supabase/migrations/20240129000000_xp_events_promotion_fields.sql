-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add promoted + new_belt columns to xp_events
--
-- BeltUpModal (client) reads these from the Supabase Realtime INSERT payload
-- so it can show the belt-promotion celebration without an extra round-trip.
-- award_xp is updated to populate both columns on every call.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add columns (null-safe defaults so existing rows are unaffected)
alter table public.xp_events
  add column if not exists promoted  boolean not null default false,
  add column if not exists new_belt  integer not null default 1
    check (new_belt between 1 and 10);

-- 2. Replace award_xp to populate the new columns
create or replace function public.award_xp(
  p_user_id      uuid,
  p_event_type   public.xp_event_type,
  p_xp_amount    integer,
  p_reference_id uuid default null
)
returns table (xp_awarded int, promoted bool, new_belt int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_belt   integer;
  v_new_xp     integer;
  v_new_belt   integer;
  v_promoted   boolean;

  -- Belt thresholds must match lib/belt-config.ts BELTS array
  v_thresholds integer[] := array[0, 200, 600, 1500, 3500, 8000, 16000, 30000, 50000, 80000];
  i            integer;
begin
  -- 1. Append event log (promoted/new_belt filled in below)
  insert into public.xp_events (user_id, event_type, xp_awarded, reference_id)
  values (p_user_id, p_event_type, p_xp_amount, p_reference_id);

  -- 2. Upsert user_xp; capture old belt before update
  insert into public.user_xp (user_id, total_xp, current_belt)
  values (p_user_id, p_xp_amount, 1)
  on conflict (user_id) do update
    set total_xp = public.user_xp.total_xp + excluded.total_xp;

  -- 3. Compute new belt from updated total_xp
  select ux.total_xp, ux.current_belt
    into v_new_xp, v_old_belt
    from public.user_xp ux
   where ux.user_id = p_user_id;

  v_new_belt := 1;
  for i in 1..array_length(v_thresholds, 1) loop
    if v_new_xp >= v_thresholds[i] then
      v_new_belt := i;
    end if;
  end loop;

  v_promoted := v_new_belt > v_old_belt;

  -- 4. Sync belt back to user_xp and profiles
  update public.user_xp
     set current_belt = v_new_belt
   where user_id = p_user_id;

  update public.profiles
     set current_belt = v_new_belt
   where id = p_user_id;

  -- 5. Back-fill promotion info into the xp_events row we just inserted
  update public.xp_events
     set promoted = v_promoted,
         new_belt = v_new_belt
   where user_id   = p_user_id
     and event_type = p_event_type
     and created_at = (
           select max(e2.created_at)
             from public.xp_events e2
            where e2.user_id    = p_user_id
              and e2.event_type = p_event_type
         );

  return query select p_xp_amount, v_promoted, v_new_belt;
end;
$$;
