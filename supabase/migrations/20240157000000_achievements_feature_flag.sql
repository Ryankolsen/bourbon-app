-- ─────────────────────────────────────────────────────────────────────────────
-- Achievements feature flag
--
-- Protects old app bundles (pre-achievements UI) from two problems:
--   1. XP toast showing raw "achievement_unlocked" event type label
--   2. Notification bell row with null actor_id navigating to /user/null
--
-- When achievements_live = false:
--   • user_achievements rows ARE written (achievements tracked silently)
--   • XP is NOT awarded (no xp_events insert, no Realtime toast)
--   • social_notifications row is NOT inserted (no bell notification)
--
-- When achievements_live = true (flip after new bundle is live in stores):
--   • Full behavior: XP awarded + bell notification fires
--
-- To enable after new bundle ships, run:
--   update public.feature_flags set enabled = true where name = 'achievements_live';
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. feature_flags table (generic — reusable for future flags)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.feature_flags (
  name        text    primary key,
  enabled     boolean not null default false,
  description text,
  updated_at  timestamptz not null default now()
);

-- Only service role can write; authenticated users can read (client may use flags)
alter table public.feature_flags enable row level security;

create policy "Authenticated users can read feature flags"
  on public.feature_flags for select
  using (auth.role() = 'authenticated');

-- Seed the achievements flag — off by default
insert into public.feature_flags (name, enabled, description)
values (
  'achievements_live',
  false,
  'Gates XP award and bell notification for achievements. Flip to true after achievements UI bundle ships to stores.'
)
on conflict (name) do nothing;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rewrite check_and_award_achievement() with flag check
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.check_and_award_achievement(
  p_user_id         uuid,
  p_achievement_key text
)
returns table (awarded boolean, xp_awarded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_achievement    record;
  v_already_earned boolean;
  v_flag_enabled   boolean;
begin
  -- Fetch achievement definition
  select id, xp_award, title
    into v_achievement
    from public.achievements
   where key = p_achievement_key;

  if not found then
    raise exception 'Unknown achievement key: %', p_achievement_key;
  end if;

  -- Idempotency check
  select exists (
    select 1 from public.user_achievements
     where user_id       = p_user_id
       and achievement_id = v_achievement.id
  ) into v_already_earned;

  if v_already_earned then
    return query select false, 0;
    return;
  end if;

  -- Always write the earned record — achievements are tracked regardless of flag
  insert into public.user_achievements (user_id, achievement_id)
  values (p_user_id, v_achievement.id);

  -- Check feature flag
  select enabled
    into v_flag_enabled
    from public.feature_flags
   where name = 'achievements_live';

  -- Gate XP award and notification on flag
  if coalesce(v_flag_enabled, false) then
    perform public.award_xp(p_user_id, 'achievement_unlocked', v_achievement.xp_award, v_achievement.id);

    insert into public.social_notifications (recipient_id, actor_id, type, metadata)
    values (p_user_id, null, 'achievement_unlocked', jsonb_build_object('title', v_achievement.title));
  end if;

  return query select true, case when coalesce(v_flag_enabled, false) then v_achievement.xp_award else 0 end;
end;
$$;

grant execute on function public.check_and_award_achievement(uuid, text) to authenticated;
revoke execute on function public.check_and_award_achievement(uuid, text) from anon;
