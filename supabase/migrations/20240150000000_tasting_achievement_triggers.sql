-- ─────────────────────────────────────────────────────────────────────────────
-- Achievements: Tasting Triggers
--
-- Fires after INSERT on tastings. Checks tasting-count and notes-count
-- thresholds and calls check_and_award_achievement() for each qualifying key.
-- All award calls are idempotent — safe to run even if the achievement was
-- already granted.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.after_tasting_insert_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tasting_count integer;
  v_notes_count   integer;
  v_has_notes     boolean;
begin
  -- Total tastings for this user (including the new row)
  select count(*)
    into v_tasting_count
    from public.tastings
   where user_id = new.user_id;

  -- Tasting-count achievements (tiers + one-time first)
  if v_tasting_count >= 1 then
    perform public.check_and_award_achievement(new.user_id, 'first_impressions');
    perform public.check_and_award_achievement(new.user_id, 'freshman_sipper');
  end if;

  if v_tasting_count >= 10 then
    perform public.check_and_award_achievement(new.user_id, 'seasoned_palate');
  end if;

  if v_tasting_count >= 50 then
    perform public.check_and_award_achievement(new.user_id, 'tasting_savant');
  end if;

  -- Notes-count achievements
  -- A tasting "has notes" when any of the free-text note fields is non-empty.
  v_has_notes := (
    (new.nose          is not null and new.nose          <> '') or
    (new.palate        is not null and new.palate        <> '') or
    (new.finish        is not null and new.finish        <> '') or
    (new.overall_notes is not null and new.overall_notes <> '')
  );

  if v_has_notes then
    select count(*)
      into v_notes_count
      from public.tastings
     where user_id = new.user_id
       and (
         (nose          is not null and nose          <> '') or
         (palate        is not null and palate        <> '') or
         (finish        is not null and finish        <> '') or
         (overall_notes is not null and overall_notes <> '')
       );

    if v_notes_count >= 1 then
      perform public.check_and_award_achievement(new.user_id, 'notes_to_self');
    end if;

    if v_notes_count >= 20 then
      perform public.check_and_award_achievement(new.user_id, 'wax_poetic');
    end if;

    if v_notes_count >= 75 then
      perform public.check_and_award_achievement(new.user_id, 'pretentious_in_the_best_way');
    end if;
  end if;

  return new;
end;
$$;

create trigger tasting_achievement_trigger
  after insert on public.tastings
  for each row execute function public.after_tasting_insert_achievements();
