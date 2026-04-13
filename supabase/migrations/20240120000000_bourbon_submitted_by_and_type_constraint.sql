-- ─────────────────────────────────────────
-- Issue #48: DB foundation for user-submitted bourbons
-- ─────────────────────────────────────────

-- 1. Add nullable submitted_by column with FK to profiles
alter table public.bourbons
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null;

-- 2. Add CHECK constraint on type column for the 10 valid bourbon types
--    (all 7 existing seed values are included; NULL is still allowed)
alter table public.bourbons
  add constraint bourbons_type_check
  check (
    type is null or type in (
      'traditional',
      'small_batch',
      'single_barrel',
      'wheated',
      'cask_strength',
      'high_rye',
      'rye',
      'bottled_in_bond',
      'straight',
      'blended'
    )
  );

-- 3. INSERT RLS policy: authenticated users may insert rows attributed to themselves
create policy "authenticated users can insert their own bourbons"
  on public.bourbons
  for insert
  to authenticated
  with check (submitted_by = auth.uid());
