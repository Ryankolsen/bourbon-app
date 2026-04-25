# BourbonVault — Store Deployment Plan

**App version:** 1.0.0  
**Bundle ID:** `com.ryankolsen.bourbonvault`  
**EAS project:** `3e15eee4-f1d6-49f2-8e6d-3f8ebc6223f4`

---

## Current State

| Platform | Status |
|----------|--------|
| iOS (App Store Connect) | App record exists, v1.0 in "Prepare for Submission" — needs screenshots + metadata |
| Android (Google Play) | **Account closed** Mar 20, 2024 — cannot reactivate, must create new account |
| Expo EAS | Development build expired, no production builds yet |

---

## Phase 0 — App Icon (Prerequisite)

You will generate the icon image using Nano Banana.

**Required sizes to export:**
| File | Size | Use |
|------|------|-----|
| `assets/icon.png` | 1024×1024 px, PNG, no alpha | iOS App Store + Expo |
| `assets/adaptive-icon.png` | 1024×1024 px, PNG, with safe zone (content in center 66%) | Android adaptive icon foreground |
| `assets/splash-icon.png` | 200×200 px or larger, PNG | Splash screen logo |
| `assets/favicon.png` | 64×64 px | Web (minor) |

**Tips:**
- iOS icon must have **no transparency** (alpha channel) — flat background required.
- Android adaptive icon will be masked to a circle/squircle — keep key content in the center 66% of the canvas.
- Drop the files into `assets/` replacing the current placeholders.

---

## Phase 1 — Android: New Developer Account

> **Reactivation is not possible.** Google's policy explicitly states accounts closed for inactivity cannot be reopened. You must create a new account.

### Steps

1. Go to [play.google.com/console/signup](https://play.google.com/console/signup)
2. Sign in with a Google account (can be `ryankolsen@gmail.com` or a new one)
3. Pay the **one-time $25 registration fee**
4. Fill in developer name (e.g. "Ryan Kolsen" or a studio name)
5. Complete identity verification (takes minutes to hours)
6. Once approved, create a new app:
   - App name: **BourbonVault**
   - Default language: English (US)
   - App type: App
   - Free or paid: Free
7. Complete the **Store listing** (see Phase 3)

> Note: If you want a separate business identity (e.g. "BourbonVault LLC"), you can register as an organization instead of an individual.

---

## Phase 2 — Build Production Binaries

Version is already `1.0.0` — no bump needed for initial release.

### 2a. iOS Production Build

```bash
eas build --profile production --platform ios
```

- EAS will auto-increment `buildNumber` (starts at 1)
- Output: IPA uploaded to EAS, ready for App Store submission
- Takes ~15–25 min in the cloud

### 2b. Android Production Build

```bash
eas build --profile production --platform android
```

- EAS will auto-increment `versionCode` (starts at 1)
- Output: AAB (Android App Bundle) uploaded to EAS
- Takes ~10–20 min

### 2c. Check builds

```bash
eas build:list
```

---

## Phase 3 — Store Metadata (both platforms)

Prepare these before submitting:

### App Store Listing Content

| Field | Value |
|-------|-------|
| Name | BourbonVault |
| Subtitle | Track your bourbon collection |
| Category | Food & Drink |
| Description | (see below) |
| Keywords | bourbon, whiskey, collection, tasting, tracker |
| Support URL | (your site or GitHub) |
| Privacy Policy URL | Required — must exist |

**Suggested description:**
```
BourbonVault is your personal bourbon companion. Track every bottle in your collection, log tasting notes with a 100-point scale, and build a wishlist of bottles you're hunting. Join groups with fellow bourbon lovers to share sale alerts and discoveries.

Features:
• Collection tracker — catalog every bottle you own
• Tasting log — rate and review with detailed notes
• Wishlist — keep a running list of bottles to acquire
• Groups — connect with friends and share sale alerts
• Fast, offline-capable with automatic sync
```

### Screenshots (iOS — Required)

App Store Connect requires screenshots for **6.5" iPhone** (and optionally 5.5"). Minimum 3, maximum 10.

**To capture:**
1. Run the app on an iPhone 14 Pro Max simulator (6.7") or iPhone 11 Pro Max (6.5")
2. Navigate to each key screen and take a screenshot (`Cmd+S` in Simulator)
3. Required sizes: 1242×2688, 2688×1242, 1284×2778, or 2778×1284 px

**Suggested screens to capture:**
1. Collection tab (bottles grid)
2. Bourbon detail / tasting entry
3. Wishlist tab
4. Group sale alerts
5. Login / onboarding screen

### Screenshots (Android — Required)

Google Play requires at least **2 screenshots**. Recommended: 1080×1920 or 1080×2340 px.

Capture from the Android emulator: `adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png`

### Feature Graphic (Android only)

Required: **1024×500 px** banner image shown on the Play Store listing.

### App Icon Upload

Both stores will use the icon from your build automatically. But you must also upload it manually during store listing setup.

---

## Phase 4 — Privacy Policy

Both stores require a privacy policy URL before submission.

**Quickest option:** Create a GitHub Pages site or use a free generator like [privacypolicygenerator.info](https://www.privacypolicygenerator.info/).

Key disclosures needed:
- Authentication data (email, Google/Apple OAuth)
- Collection/tasting data stored in Supabase (your servers)
- Push notification tokens
- No advertising or third-party data selling

---

## Phase 5 — iOS Submission

### 5a. Fill in App Store Connect metadata

Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → bourbon-app → Distribution → 1.0:

- [ ] Upload screenshots (6.5" iPhone required)
- [ ] Set app description, keywords, support URL
- [ ] Set privacy policy URL
- [ ] Set age rating (likely 4+)
- [ ] App Privacy — declare data types collected
- [ ] Review Information — add test account info if reviewer needs to log in

### 5b. Submit the build via EAS

```bash
eas submit --platform ios --latest
```

Or manually in App Store Connect: go to the build section and select your EAS build once it appears (takes ~30 min after build finishes).

### 5c. Add for Review

In App Store Connect, click **"Add for Review"** → confirm submission.

**Typical iOS review time:** 24–72 hours.

---

## Phase 6 — Android Submission

### 6a. Complete Play Console store listing

After creating your new developer account and app:

- [ ] Upload APK/AAB (from EAS, or manually download and upload)
- [ ] Upload screenshots (min 2)
- [ ] Upload feature graphic (1024×500 px)
- [ ] Set short description (80 chars max)
- [ ] Set full description (4000 chars max — reuse iOS description)
- [ ] Select category: Entertainment or Lifestyle
- [ ] Set content rating (run the questionnaire)
- [ ] Set privacy policy URL
- [ ] Complete "Data safety" section (declare what data you collect)

### 6b. Submit via EAS (after Play Console app is created)

First link your EAS project to the new Play Console app:

```bash
# In eas.json submit.production, add:
# "android": { "serviceAccountKeyPath": "./path/to/service-account.json" }
```

Then:
```bash
eas submit --platform android --latest
```

Or download the AAB from EAS and upload manually in Play Console → Production → Create release.

**Typical Android review time:** 1–7 days for new accounts (new accounts get more scrutiny).

---

## Phase 7 — Post-Launch

### OTA updates (JS-only changes, no rebuild needed)

```bash
eas update --branch production --message "fix: description of change" --platform all
```

### App version bumps (when native code changes)

1. Update `version` in `app.json`
2. Rebuild: `eas build --profile production --platform all`
3. Resubmit: `eas submit --platform all --latest`

---

## Checklist Summary

### Android
- [ ] Create new Google Play Developer account ($25)
- [ ] Complete identity verification
- [ ] Create new app in Play Console
- [ ] Generate app icon with Nano Banana → place in `assets/`
- [ ] Run `eas build --profile production --platform android`
- [ ] Upload AAB to Play Console (internal test → production)
- [ ] Complete store listing + data safety + content rating
- [ ] Add privacy policy URL
- [ ] Submit for review

### iOS
- [ ] Generate app icon with Nano Banana → place in `assets/`
- [ ] Run `eas build --profile production --platform ios`
- [ ] Upload screenshots to App Store Connect
- [ ] Complete metadata (description, keywords, privacy policy)
- [ ] Declare App Privacy data types
- [ ] Submit for review via `eas submit --platform ios --latest`

---

## Notes

- **Android account closed reason:** "not being used" — Google does not reactivate these. New account required.
- **Apple:** Your App Store Connect record already exists (`appId: 6762319810`), App ID `com.ryankolsen.bourbonvault` is already registered.
- **Sign In with Apple JWT expires every 6 months** — current key ID `6AB877VMLT`, Team ID `T6DGD6WGY`. Check expiry before launch.
- **Google OAuth:** Disabled in local dev builds. Confirm it's configured in the production Supabase project for the production bundle ID.
