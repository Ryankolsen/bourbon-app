-- ─────────────────────────────────────────────────────────────────────────────
-- Achievements: Explorer Triggers
--
-- Fires after INSERT on tastings. Joins to bourbons to inspect bourbon
-- characteristics (type, distillery, age_statement) and calls
-- check_and_award_achievement() for each qualifying explorer achievement.
-- All award calls are idempotent — safe to run even if already granted.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_tasting_insert_explorer_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_distillery      text;
  v_bourbon_type    bourbon_type;
  v_age_statement   integer;
  v_distillery_count  integer;
  v_single_barrel_count integer;
begin
  -- Fetch bourbon details for this tasting
  select b.distillery, b.type, b.age_statement
    into v_distillery, v_bourbon_type, v_age_statement
    from public.bourbons b
   where b.id = new.bourbon_id;

  -- ── Distillery variety tier ─────────────────────────────────────────────────
  -- Count distinct non-null distilleries across all of user's tastings
  select count(distinct b.distillery)
    into v_distillery_count
    from public.tastings t
    join public.bourbons b on b.id = t.bourbon_id
   where t.user_id = new.user_id
     and b.distillery is not null;

  if v_distillery_count >= 3 then
    perform public.check_and_award_achievement(new.user_id, 'branching_out');
  end if;

  if v_distillery_count >= 10 then
    perform public.check_and_award_achievement(new.user_id, 'passport_sipper');
  end if;

  if v_distillery_count >= 25 then
    perform public.check_and_award_achievement(new.user_id, 'gone_native');
  end if;

  -- ── Rye Curious (one-time) ──────────────────────────────────────────────────
  if v_bourbon_type = 'rye'::bourbon_type then
    perform public.check_and_award_achievement(new.user_id, 'rye_curious');
  end if;

  -- ── Wheated Wonder (one-time) ───────────────────────────────────────────────
  if v_bourbon_type = 'wheated'::bourbon_type then
    perform public.check_and_award_achievement(new.user_id, 'wheated_wonder');
  end if;

  -- ── Single Barrel Snob (at 10 single barrel tastings) ──────────────────────
  if v_bourbon_type = 'single_barrel'::bourbon_type then
    select count(*)
      into v_single_barrel_count
      from public.tastings t
      join public.bourbons b on b.id = t.bourbon_id
     where t.user_id = new.user_id
       and b.type = 'single_barrel'::bourbon_type;

    if v_single_barrel_count >= 10 then
      perform public.check_and_award_achievement(new.user_id, 'single_barrel_snob');
    end if;
  end if;

  -- ── Old Money (one-time, aged 15+ years) ───────────────────────────────────
  if v_age_statement is not null and v_age_statement >= 15 then
    perform public.check_and_award_achievement(new.user_id, 'old_money');
  end if;

  -- ── Barrel Proof or Bust (one-time, cask strength) ─────────────────────────
  if v_bourbon_type = 'cask_strength'::bourbon_type then
    perform public.check_and_award_achievement(new.user_id, 'barrel_proof_or_bust');
  end if;

  return new;
end;
$$;

create trigger tasting_explorer_achievement_trigger
  after insert on public.tastings
  for each row execute function public.after_tasting_insert_explorer_achievements();
