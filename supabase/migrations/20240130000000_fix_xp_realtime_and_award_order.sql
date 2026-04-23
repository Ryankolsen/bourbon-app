-- ─────────────────────────────────────────────────────────────────────────────
-- Fix 1: add xp_events to the Realtime publication
--
-- XpContext subscribes to xp_events INSERTs via postgres_changes, but the
-- table was never added to supabase_realtime. Without this, the channel
-- receives nothing and XpToast / BeltUpModal never fire.
-- ─────────────────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.xp_events;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fix 2: reorder award_xp so the xp_events INSERT carries correct
--        promoted + new_belt values
--
-- The previous version inserted xp_events first (with defaults promoted=false,
-- new_belt=1), computed the belt, then UPDATEd the row. The Realtime INSERT
-- payload had already been sent with wrong values before the UPDATE ran.
-- Clients listening only to INSERT events (XpContext) always saw promoted=false
-- and new_belt=1.
--
-- Fix: compute XP total and belt first, then INSERT xp_events once with the
-- correct final values.
-- ─────────────────────────────────────────────────────────────────────────────

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
  -- 1. Upsert user_xp and capture old belt + new total in one shot
  insert into public.user_xp (user_id, total_xp, current_belt)
  values (p_user_id, p_xp_amount, 1)
  on conflict (user_id) do update
    set total_xp = public.user_xp.total_xp + excluded.total_xp;

  select ux.total_xp, ux.current_belt
    into v_new_xp, v_old_belt
    from public.user_xp ux
   where ux.user_id = p_user_id;

  -- 2. Compute new belt
  v_new_belt := 1;
  for i in 1..array_length(v_thresholds, 1) loop
    if v_new_xp >= v_thresholds[i] then
      v_new_belt := i;
    end if;
  end loop;

  v_promoted := v_new_belt > v_old_belt;

  -- 3. Sync belt back to user_xp and profiles
  update public.user_xp
     set current_belt = v_new_belt
   where user_id = p_user_id;

  update public.profiles
     set current_belt = v_new_belt
   where id = p_user_id;

  -- 4. INSERT xp_events last — Realtime broadcasts this payload to the client.
  --    promoted + new_belt are now correct before the INSERT fires.
  insert into public.xp_events (user_id, event_type, xp_awarded, reference_id, promoted, new_belt)
  values (p_user_id, p_event_type, p_xp_amount, p_reference_id, v_promoted, v_new_belt);

  return query select p_xp_amount, v_promoted, v_new_belt;
end;
$$;
