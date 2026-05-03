# Delete / Restore Account Flow

## Overview

Accounts are soft-deleted via a 30-day grace period. Tapping "Delete Account" marks the account as pending deletion (sets a timestamp), signs the user out, and blocks re-entry via an intercept modal until the user either cancels or the 30 days expire and a purge function hard-deletes the account.

This flow was built for Apple App Store guideline 5.1.1(v) compliance.

---

## Database

**Table:** `public.profiles`  
**Column:** `pending_deletion_at` (`timestamptz`, nullable)

- `NULL` → account is active
- Non-null timestamp → account is pending deletion; timestamp is when deletion was initiated (permanent deletion scheduled 30 days after this)

The column is only written by the `delete-account` edge function using the **service role** key (bypasses RLS).

**Migration:** `supabase/migrations/20240135000000_account_deletion.sql`

---

## Edge Function

**Path:** `supabase/functions/delete-account/index.ts`

1. Receives the user's JWT in the `Authorization` header
2. Verifies the token using the anon client → extracts `user.id`
3. Uses the **service role client** to `UPDATE profiles SET pending_deletion_at = NOW() WHERE id = user.id`
4. Returns `{ success: true }` on success, `500` on failure

**Deploy command:**
```bash
npx supabase functions deploy delete-account
```

**Required secret:**
```bash
npx supabase secrets list --linked   # confirm SUPABASE_SERVICE_ROLE_KEY is present
```

---

## Hooks

**File:** `hooks/use-profile.ts`

### `useDeleteAccount()`
- Calls `supabase.functions.invoke("delete-account")`
- On success: calls `supabase.auth.signOut()`
- On error: throws (surface in UI)

### `usePendingDeletion(userId)`
- Queries `profiles.pending_deletion_at` for the given user
- Returns:
  - `isPendingDeletion: boolean`
  - `pendingDeletionAt: Date | null`
  - `cancelDeletion()` — sets `pending_deletion_at = null` directly via anon client, then invalidates the query

---

## UI Components

### Profile Screen — Danger Zone
**File:** `app/(tabs)/profile.tsx`

- "Delete Account" button in a red "Danger Zone" section
- Tapping shows an `Alert` with title, message, and 30-day grace period notice
- Confirming calls `deleteAccount.mutate()`

### PendingDeletionInterceptModal
**File:** `components/PendingDeletionModal.tsx`

- Mounted in the root layout (`app/_layout.tsx`)
- Calls `usePendingDeletion(userId)` on every auth session
- Shows as a full-screen blocking modal when `isPendingDeletion === true`
- Cannot be dismissed by backdrop or back button
- Displays the scheduled permanent deletion date (30 days after `pending_deletion_at`)
- Buttons: **Cancel Deletion** (nulls out the column → restores account) | **Sign Out**

---

## End-to-End Flow

```
User taps Delete Account
  → Alert confirmation
  → deleteAccount.mutate()
  → edge function: sets pending_deletion_at = NOW()
  → onSuccess: supabase.auth.signOut()
  → user is signed out

User signs back in
  → root layout mounts PendingDeletionInterceptModal
  → usePendingDeletion fetches profiles.pending_deletion_at
  → isPendingDeletion = true → modal appears
  → user taps Cancel Deletion
  → cancelDeletion() sets pending_deletion_at = null
  → modal dismisses → account restored
```

---

## Apple QA Recording Script (Issue #152)

Record on a **physical iOS device**:

1. Sign in with demo account (email/password)
2. Profile → Danger Zone → Delete Account → confirm alert
3. App signs user out (shows deletion initiated)
4. Sign back in → intercept modal appears with deletion date
5. Tap Cancel Deletion → modal dismisses, account restored
6. Upload recording to App Store Connect → App Review Information → Notes

No hard deletion occurs during recording — account ends up active after step 5.

---

## Active Bug (as of 2026-04-29)

**Symptom:** After tapping Delete Account and being signed out, signing back in shows no intercept modal. DB confirms `pending_deletion_at` is `null` — the edge function write is not persisting.

**Debug steps:**

1. Confirm edge function is deployed:
   ```bash
   npx supabase functions list --linked
   ```
2. Confirm service role secret is set:
   ```bash
   npx supabase secrets list --linked
   ```
3. Check remote function logs after triggering from the app:
   ```bash
   npx supabase functions logs delete-account --linked
   ```
4. Add temporary logging to `useDeleteAccount` in `hooks/use-profile.ts`:
   ```typescript
   const { data, error } = await supabase.functions.invoke("delete-account");
   console.log("delete-account response:", { data, error });
   ```

**Most likely cause:** edge function not deployed, or `SUPABASE_SERVICE_ROLE_KEY` secret missing.
