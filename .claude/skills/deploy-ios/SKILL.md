---
name: deploy-ios
description: Deploy BourbonVault to iOS App Store Connect via EAS — version bumping, building, and submitting. Use when the user wants to deploy to iOS, push an App Store build, update screenshots, submit for review, bump the iOS version, or hit errors 90062/90186 (train closed).
---

# Deploy iOS

## Quick start (no version bump needed)

```bash
eas build --platform ios --profile production
# wait ~4 min, verify Version field in output matches target
eas submit --platform ios --latest
```

## Workflow

### 1 — Check current versions

```bash
grep '"version"' app.json package.json
```

Both files must show the same version. `app.json` is canonical — fix `package.json` to match if they differ.

### 2 — Decide if a version bump is needed

| Change type | Action |
| --- | --- |
| Bug fix / minor tweak | No bump — EAS auto-increments build number |
| New user-visible feature | Bump minor: `1.0.1 → 1.1.0` |
| Major redesign | Bump major: `1.0.1 → 2.0.0` |
| Resubmit after a version was approved | Bump patch: `1.0.1 → 1.0.2` |

**OTA warning:** Bumping `version` changes `runtimeVersion`. Existing users on the old binary won't receive OTA updates until they install the new store version.

### 3 — Bump version (if needed)

Edit **both** files:
- `app.json` → `"version": "X.X.X"`
- `package.json` → `"version": "X.X.X"`

Commit **before** building:

```bash
git add app.json package.json
git commit -m "chore: bump version to X.X.X"
```

> EAS reads committed source. Building before committing bakes the old version into the binary.

### 4 — Build

```bash
eas build --platform ios --profile production
```

EAS auto-increments `buildNumber` — never set it manually. Verify the version after the build completes:

```bash
eas build:list --limit 1 --platform ios --non-interactive
```

The `Version` field must match your target (e.g. `1.0.2`) before submitting.

### 5 — Submit

```bash
eas submit --platform ios --latest
```

Apple processes the binary in ~5–10 min.

### 6 — Attach build in App Store Connect

The App Store Connect version slot (e.g. `1.0.2`) only accepts a build whose `CFBundleShortVersionString` matches exactly. If your build says `1.0.1`, it will not appear in the `1.0.2` slot.

1. Go to App Store Connect → Distribution → select the version in the left sidebar
2. Scroll to **Build** → click **+** → select the new build
3. Update screenshots or metadata
4. Click **Add for Review**

## Pitfalls

- **Built before committing:** old version baked in — bump, commit, rebuild.
- **Only updated one file:** `app.json` and `package.json` must stay in sync.
- **Error 90062 / 90186 "train closed":** build version ≤ last approved version — bump to a higher version, rebuild, resubmit.
- **Wrong build selected by `--latest`:** always verify `Version` in `eas build:list` before submitting.