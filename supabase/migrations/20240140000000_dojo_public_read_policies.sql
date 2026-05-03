-- duel_fake_notes and sensei_quotes are public game content — no sensitive data.
-- Replace the authenticated-only read policy with an unrestricted public read
-- so queries succeed regardless of session state at question-generation time.

drop policy if exists "Authenticated users can read duel_fake_notes" on public.duel_fake_notes;
create policy "Public read access for duel_fake_notes"
  on public.duel_fake_notes for select
  using (true);

drop policy if exists "Authenticated users can read sensei_quotes" on public.sensei_quotes;
create policy "Public read access for sensei_quotes"
  on public.sensei_quotes for select
  using (true);
