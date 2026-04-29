-- Add pending_deletion_at to profiles for 30-day soft-delete grace period.
-- A non-null value means the account is scheduled for permanent deletion.
-- Null means the account is active.
-- This column is only written by the delete-account edge function via the service role.
alter table public.profiles
  add column pending_deletion_at timestamptz;
