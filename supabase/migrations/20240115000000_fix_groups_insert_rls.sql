-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: group creation fails for authenticated users (issue #24)
-- ─────────────────────────────────────────────────────────────────────────────
-- auth.role() returns 'anon' in some Supabase JS v2 configurations even for
-- authenticated sessions. Replace the role check with auth.uid() IS NOT NULL,
-- which is reliable across all client configurations.

drop policy if exists "Authenticated users can create groups" on public.groups;

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() is not null and created_by = auth.uid());
