# BourbonVault

A mobile app for tracking your bourbon collection, tasting notes, and wishlist.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo (managed) + TypeScript |
| Navigation | Expo Router v6 (file-based) |
| Backend / Auth / DB | Supabase (PostgreSQL) |
| Server state | TanStack Query v5 |
| Form state | React Hook Form + Zod |
| Styling | NativeWind v4 + Tailwind CSS v3 |
| Auth providers | Google OAuth, native Sign In with Apple (`expo-apple-authentication`) |

## Project Structure

```
bourbon-app/
├── app/
│   ├── _layout.tsx              # Root layout: QueryClient + auth guard
│   ├── (auth)/
│   │   └── login.tsx            # Google + Apple sign-in
│   └── (tabs)/
│       ├── index.tsx            # Collection tab
│       ├── explore.tsx          # Browse & search bourbons
│       ├── tastings.tsx         # Tasting log
│       └── profile.tsx          # User profile + sign out
├── hooks/                       # TanStack Query hooks
├── lib/                         # Pure business logic + Supabase client
├── types/
│   └── database.ts              # Typed Supabase schema
└── supabase/
    └── migrations/              # All schema migrations
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Local Supabase (Android emulator uses 10.0.2.2 to reach the host machine)
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from `npx supabase status`>

# Production Supabase
EXPO_PUBLIC_SUPABASE_URL_PROD=https://dmudeosnwcizorotxlrs.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD=<prod anon key>

# Admin email(s) — comma-separated
EXPO_PUBLIC_ADMIN_EMAILS=your-email@example.com

# Google Places API — used for store autocomplete in Sale Alerts
# Get from console.cloud.google.com → Bourbon Tracker project → Credentials
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...

# DB target toggle — see section below
EXPO_PUBLIC_FORCE_PROD_DB=false
```

### EXPO_PUBLIC_FORCE_PROD_DB

Controls which Supabase instance the app connects to:

| Value | Behavior |
|-------|----------|
| `false` (default) | Emulator/simulator → local Supabase. Physical device → prod Supabase (via `Device.isDevice`). |
| `true` | Always prod Supabase, regardless of device type. |

**Set to `true` when:**
- Testing on a physical device via USB so it gets prod data
- Testing features that require real internet (e.g. Google Places autocomplete in Sale Alerts)

**Set to `false` when:**
- Running on the Android emulator or iOS simulator against local Supabase

Restart Metro after changing this flag.

---

## Local Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local Supabase

Requires [OrbStack](https://orbstack.dev/) or Docker Desktop running.

```bash
npx supabase start
npx supabase db reset      # applies all migrations + seeds test personas
```

### 3. Link to prod (one-time)

```bash
supabase login
supabase link --project-ref dmudeosnwcizorotxlrs
```

---

## Running the App

> **Expo Go is not supported** — the app uses native modules (`expo-apple-authentication`, `expo-secure-store`) that require a custom build.

### Android Emulator

```bash
npx expo run:android
```

Builds, installs, and starts Metro. Connects to local Supabase by default (`EXPO_PUBLIC_FORCE_PROD_DB=false`).

### Android — Physical Device (USB)

Use this when you want to test on a real phone (e.g. to test Google Places autocomplete or prod data).

1. Enable **Developer Options** on your phone (Settings → About phone → tap Build Number 7 times)
2. Enable **USB debugging** in Developer Options
3. Connect via USB and tap **Allow** on the "Allow USB debugging?" prompt
4. **Uninstall any production BourbonVault build** from your phone first (debug and release APKs have different signing certificates and can't coexist)
5. Set `EXPO_PUBLIC_FORCE_PROD_DB=true` in `.env.local`

```bash
npx expo run:android --device
```

After the dev build is installed once, you can scan the Metro QR code wirelessly on the same WiFi network without plugging in again — until native code changes require a rebuild.

### iOS Simulator

`npx expo run:ios` is broken under Xcode 26 (devicectl detection bug). Use the manual steps:

```bash
# 1. Find and boot a simulator
xcrun simctl list devices available | grep -i iphone
xcrun simctl boot <UDID>

# 2. Install pods (first time + after any npm install that adds native modules)
cd ios && pod install && cd ..

# 3. Build the native app
xcodebuild -workspace ios/bourbonapp.xcworkspace \
  -scheme bourbonapp \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=<UDID>" \
  build 2>&1 | grep -E "error:|BUILD SUCCEEDED|BUILD FAILED"

# 4. Install and launch
APP=$(find ~/Library/Developer/Xcode/DerivedData -name "bourbonapp.app" -path "*iphonesimulator*" | head -1)
xcrun simctl install booted "$APP"
xcrun simctl launch booted com.ryankolsen.bourbonvault

# 5. Start Metro
npx expo start --port 8081
```

On subsequent runs with no native changes, only steps 4 and 5 are needed.

---

## EAS Builds (Cloud)

EAS Build compiles the native shell in the cloud. Use it when native dependencies change or you need a distributable build.

### Build profiles

| Profile | Command | Output | Use for |
|---------|---------|--------|---------|
| `development` | `eas build --profile development --platform android` | Internal APK | Dev client install |
| `preview` | `eas build --profile preview --platform android` | Downloadable APK | QA testing without USB |
| `production` | `eas build --profile production --platform android` | AAB | Google Play Store |
| `production` | `eas build --profile production --platform ios` | IPA | App Store |

### iOS builds — Apple account locked error

If EAS throws `Apple Service Error -20209` (account locked), **always answer No** when asked "Do you want to log in to your Apple account?" — use the App Store Connect API key instead.

The API key is configured in EAS credentials (Key ID: `CJF35VD4VU`, Issuer ID: `83f2cf71-005e-4e5f-bdf5-8f355ddeaf01`). The `.p8` file is at `~/Downloads/AuthKey_CJF35VD4VU.p8` — keep it safe, it can only be downloaded once.

To unlock the Apple Developer Portal account if needed: call 1-800-275-2273 or chat at developer.apple.com/contact.

### Install a preview build on your phone (avoids USB for future testing)

Build a preview APK once and install it. After that, scanning the Metro QR code delivers the latest JS without another build:

```bash
eas build --profile preview --platform android
# Download the APK from expo.dev and install it on your phone
```

---

## OTA Updates (EAS Update)

Push JS-only changes to installed builds without using build credits. The native shell stays the same; only the JS bundle is updated.

```bash
# Android only
eas update --branch production --message "your message" --platform android

# Both platforms
eas update --branch production --message "your message" --platform all
```

`EXPO_PUBLIC_*` env vars from `.env.local` are baked into the bundle at update time — the Places API key and `FORCE_PROD_DB` flag are included automatically.

> OTA updates only reach installed production/preview builds. Dev builds running via Metro are not affected.

---

## Store Deployment

### Android → Google Play Store

Upload is done manually via the Google Play Console.

```bash
# Build the AAB
eas build --profile production --platform android
```

Download the AAB from expo.dev, then upload it in **Google Play Console → Production → Create new release**.

### iOS → App Store

```bash
# 1. Build the IPA
eas build --profile production --platform ios

# 2. Upload to App Store Connect
eas submit --platform ios
```

Requires Apple credentials and an App Store Connect app record for `com.ryankolsen.bourbonvault`. If you have a local IPA, pass `--path ./path/to/your.ipa` instead of triggering a new build.

---

## Legal

| Document | URL |
|----------|-----|
| Privacy Policy | https://ryankolsen.github.io/bourbonvault-privacy/ |

---

## Database

### Apply migrations

```bash
# Local only (safe to experiment)
npx supabase migration up

# Remote (prod) — review the migration list before accepting
npx supabase db push --linked
```

> **Warning:** `supabase db push` without `--linked` still targets remote, not local. Always use `migration up` when testing locally.

### Add a new migration

```bash
npx supabase migration new your_migration_name
# edit supabase/migrations/<timestamp>_your_migration_name.sql
npx supabase migration up          # test locally first
npx supabase db push --linked      # push to prod when ready
```

### Schema

| Table | Description |
|-------|-------------|
| `profiles` | User profiles, auto-created on signup via trigger |
| `bourbons` | Master bourbon catalog (~1,860 bottles) |
| `user_collection` | Bottles a user owns |
| `user_wishlist` | Bottles a user wants |
| `tastings` | Tasting notes and ratings (0–100 scale) |
| `groups` | Bourbon groups |
| `group_members` | Group membership (owner / member, pending / accepted) |
| `group_sale_alerts` | Sale alerts posted to a group (soft-deleted via `removed_at`) |
| `user_push_tokens` | Push notification tokens per device |
| `achievements` | Achievement definitions (title, tier, category, XP value) |
| `user_achievements` | Earned achievements per user (written even when flag is off) |
| `feature_flags` | Boolean flags gating new features from existing deployed bundles |

All tables have Row Level Security enabled.

---

## Feature Flags

Feature flags in `public.feature_flags` protect existing deployed builds from new functionality until a new bundle is live in both stores. Flags are seeded `false` and flipped manually — never via migration.

### Current flags

| Flag | Status | Blocks |
|------|--------|--------|
| `achievements_live` | **OFF** — waiting for v1.1.0 bundle in both stores | XP awards + bell notifications for achievements |

### How to flip a flag

Once the v1.1.0 bundle is live in **both** the App Store and Play Store:

```bash
npx supabase db query --linked \
  "update public.feature_flags set enabled = true where name = 'achievements_live';"
```

Verify immediately after:

```bash
npx supabase db query --linked \
  "select name, enabled from public.feature_flags;"
```

> **Before flipping:** decide whether to backfill XP for users who earned achievements while the flag was off. Users have `user_achievements` rows but no `xp_events` entries for that period. Ask before running any backfill script.

### Supabase Studio (local)

Browse your local database at **http://127.0.0.1:54323** while `supabase start` is running.

### Production reset (pre-launch only)

```bash
npx supabase db reset --linked --no-seed
npx supabase db query --linked --file supabase/seeds/catalog.sql
```

> Never run `supabase db reset` without `--linked` — that targets your local database.

---

## Test Personas

`supabase db reset` seeds 11 users. All share password `BourbonDev2024!`.

| Name | Email | Group | Role |
|------|-------|-------|------|
| Ryan Kolsen | ryankolsen@gmail.com | — | Admin (local only) |
| Marcus Webb | marcus.webb@bourbonvault.dev | The Barrel Room | Owner |
| Diana Chen | diana.chen@bourbonvault.dev | The Barrel Room | Member |
| Tobias Grant | tobias.grant@bourbonvault.dev | The Barrel Room | Member |
| Priya Nair | priya.nair@bourbonvault.dev | The Barrel Room | Member |
| Logan Steele | logan.steele@bourbonvault.dev | The Barrel Room | Member |
| Celeste Morrow | celeste.morrow@bourbonvault.dev | Whiskey Underground | Owner |
| Finn Callahan | finn.callahan@bourbonvault.dev | Whiskey Underground | Member |
| Ava Drummond | ava.drummond@bourbonvault.dev | Whiskey Underground | Member |
| Jonah Rivera | jonah.rivera@bourbonvault.dev | _(solo)_ | — |
| Sadie Okafor | sadie.okafor@bourbonvault.dev | _(solo)_ | — |

The **dev login screen** (`__DEV__` only) lists all users — tap any row to sign in instantly. The **dev user switcher** (floating button, `__DEV__` only) lets you switch personas without returning to the login screen.

---

## Auth Setup (Supabase Dashboard)

Go to **Authentication → Providers** and enable:

- **Google** — requires a Google Cloud OAuth client ID + secret
- **Apple** — set **Client ID** to `com.ryankolsen.bourbonvault` and **Secret Key** to the JWT from the Apple private key (Team ID: `T6DGD6WGY`, Key ID: `6AB877VMLT`). The JWT expires every 6 months and must be regenerated.

Sign In with Apple uses the native iOS sheet — not a web OAuth redirect. No Services ID or redirect URL required. Google OAuth is disabled in local dev builds.
