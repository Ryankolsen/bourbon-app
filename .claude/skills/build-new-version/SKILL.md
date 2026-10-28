---
name: build-new-version
description: Check whether the app version needs incrementing before triggering an EAS production build for BourbonVault. Use when user wants to push a build, submit to the store, or asks about versioning.
---

# Build New Version

BourbonVault uses EAS Build with `appVersionSource: "remote"`, meaning build numbers live on Expo's servers, not in `app.json`.

## Version Model

| Field | Where | Who updates it | When |
|---|---|---|---|
| `version` (e.g. `1.0.0`) | `app.json` | You manually | New store release, major/minor feature release |
| `versionCode` (Android) | EAS remote | Auto (`autoIncrement: true`) | Every production build |
| `buildNumber` (iOS) | EAS remote | Auto (`autoIncrement: true`) | Every production build |
| `runtimeVersion` | Derived from `version` | Changes when `version` changes | Controls OTA update compatibility |

## Step 1 — Check current versions

```bash
# Local app version
cat app.json | grep '"version"'

# Remote build numbers (last 5 builds)
eas build:list --limit 5 --platform all --non-interactive
```

## Step 2 — Decide if `version` needs a bump

Ask the user: **what changed in this build?**

| Change type | Action |
|---|---|
| Bug fix, crash fix, minor tweak | No version bump — EAS auto-increments build numbers |
| New feature visible to users | Bump minor: `1.0.0 → 1.1.0` |
| Major redesign / breaking change | Bump major: `1.0.0 → 2.0.0` |
| Hotfix on a released version | Bump patch: `1.0.0 → 1.0.1` |

**Important:** Changing `version` in `app.json` also changes `runtimeVersion` (because the policy is `appVersion`). This means **existing users on old builds will not receive OTA updates** — they must download a new binary from the store. Only bump when you intend to ship a new binary.

## Step 3 — If bumping, update app.json

Edit `app.json` and change the `version` field:

```json
"version": "1.1.0"
```

Then commit:
```bash
git add app.json
git commit -m "chore: bump version to 1.1.0"
```

## Step 4 — Trigger the build

**Do not run `eas build` yourself.** The user runs builds manually — stop after the version bump (and commit, if one was needed) and hand off the command for them to run:

**Both platforms (most common):**
```bash
eas build --platform all --profile production
```

**Android only:**
```bash
eas build --platform android --profile production
```

**iOS only:**
```bash
eas build --platform ios --profile production
```

EAS will auto-increment `versionCode` and `buildNumber` on every production build — you do not need to do this manually.

## Step 5 — After build completes

Check build status:
```bash
eas build:list --limit 2 --platform all
```

To submit to stores after a successful build:
```bash
# iOS — submits via EAS
eas submit --platform ios --latest

# Android — download .aab and upload manually via Play Console
eas build:download --latest --platform android
```

### After iOS submission succeeds

EAS will confirm "Submitted your app to Apple App Store Connect!" Apple then processes the binary (~5-10 min). Once you get Apple's processing email:

1. Go to [App Store Connect → Distribution](https://appstoreconnect.apple.com/apps/6762319810/distribution/ios/version/deliverable)
2. Click **+** next to "iOS App" in the left sidebar to create a new version (e.g. `1.0.1`)
3. Scroll down to the **Build** section and select the new build number
4. Fill in **"What's New in This Version"**
5. Click **Submit for Review**

## Common Pitfalls

- **Do not** manually set `versionCode` or `buildNumber` in `app.json` — with `appVersionSource: "remote"` those fields are ignored and EAS manages them.
- **Do not** bump `version` for routine builds — it breaks OTA updates for existing users.
- The `production` profile uses `distribution: "store"` and `buildType: "app-bundle"` for Android — the output is an `.aab`, not an `.apk`.
- **Apple error 90062/90186 ("version train closed"):** App Store Connect rejects a build if the `version` matches a previously approved release. Bump `version` in `app.json` (e.g. `1.0.0 → 1.0.1`), rebuild iOS, then resubmit. This also changes `runtimeVersion`, so existing users on the old version won't receive OTA updates.