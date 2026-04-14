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
├── hooks/
│   ├── use-auth.ts              # Session state
│   ├── use-bourbons.ts          # TanStack Query: bourbon list
│   └── use-collection.ts        # TanStack Query: user collection
├── lib/
│   ├── supabase.ts              # Supabase client (SecureStore)
│   └── query-client.ts          # TanStack Query client config
├── types/
│   └── database.ts              # Typed Supabase schema
└── supabase/
    └── migrations/
        └── 20240101000000_initial_schema.sql
```

## Local Setup

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required due to a peer dependency conflict between expo-router and react-dom that doesn't affect runtime.

### 2. Configure environment

Create a `.env.local` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Get these values from your Supabase project: **Settings → API Keys**.
Use the **Publishable key** (not the Secret key).

### 3. Set up the database

Install the Supabase CLI and link the project:

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref your-project-ref
```

Apply migrations to the remote database:

```bash
supabase db push
```

### 4. Run the app

> **Note:** The app uses `expo-apple-authentication`, a native module that requires a custom dev build. **Expo Go is not supported.**

**iOS Simulator** — `npm run ios` (`expo run:ios`) is broken under Xcode 26 due to a devicectl detection bug. Build and install manually:

```bash
# One-time native build (re-run only when native code changes)
xcodebuild \
  -workspace ios/bourbonapp.xcworkspace \
  -scheme bourbonapp \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=01DF1BA4-0491-44C5-980C-5479D7D04C25" \
  build 2>&1 | grep -E "error:|BUILD"

xcrun simctl install booted \
  ~/Library/Developer/Xcode/DerivedData/bourbonapp-fjaxpkiknmklivghbnzbagithrcv/Build/Products/Debug-iphonesimulator/bourbonapp.app

xcrun simctl launch booted com.ryankolsen.bourbonvault

# Start Metro (handles all JS changes without a rebuild)
npx expo start --port 8081
```

**Android emulator**

```bash
npm run android  # expo run:android
```

**Finding your Simulator UDID** (if the above ID doesn't match your machine):

```bash
xcrun simctl list devices available | grep -i iphone
```

## Database Schema

| Table | Description |
|-------|-------------|
| `profiles` | User profiles, auto-created on signup via trigger |
| `bourbons` | Master list of bourbon bottles |
| `user_collection` | Bottles a user owns (sealed / open / empty) |
| `user_wishlist` | Bottles a user wants to acquire |
| `tastings` | Tasting notes and ratings (0–100 scale) |

All tables have Row Level Security enabled. Users can only access their own collection, wishlist, and tasting rows.

## Adding a New Migration

```bash
supabase migration new your_migration_name
# edit the generated file in supabase/migrations/
supabase db push
```

## Local Development on macOS

### Prerequisites

Install [OrbStack](https://orbstack.dev/) as your container runtime (faster and lighter than Docker Desktop). Make sure it is running before proceeding.

### 1. Start local Supabase

```bash
npx supabase start
```

This pulls and starts all Supabase containers (Postgres, Auth, Storage, Studio). The first run takes a few minutes while images download.

### 2. Apply migrations and seed data

```bash
npx supabase db reset
```

Run this on first setup and any time the schema changes. It applies all migrations and seeds the 10 test personas.

### 3. Configure environment variables

Update `.env.local` to point at your local stack. Get the publishable key from the `supabase start` output (or run `npx supabase status`):

**iOS simulator** (`127.0.0.1` works because the simulator shares the host network):
```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<Publishable key from supabase start output>
```

**Android emulator** (`127.0.0.1` is the emulator's own loopback — use `10.0.2.2` to reach the host):
```env
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<Publishable key from supabase start output>
```

### 4. Start the app

> **Note:** Expo Go is not supported — the app requires a custom native build due to `expo-apple-authentication`.

**iOS Simulator** — `npx expo run:ios` is broken under Xcode 26 (devicectl detection bug). Use xcodebuild instead:

```bash
# One-time native build (re-run only when native code changes)
xcodebuild \
  -workspace ios/bourbonapp.xcworkspace \
  -scheme bourbonapp \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=01DF1BA4-0491-44C5-980C-5479D7D04C25" \
  build 2>&1 | grep -E "error:|BUILD"

xcrun simctl install booted \
  ~/Library/Developer/Xcode/DerivedData/bourbonapp-fjaxpkiknmklivghbnzbagithrcv/Build/Products/Debug-iphonesimulator/bourbonapp.app

xcrun simctl launch booted com.ryankolsen.bourbonvault

# Then start Metro for JS hot-reload
npx expo start --port 8081
```

**Android emulator**

```bash
npx expo run:android
```

**Finding your Simulator UDID** (if the above ID doesn't match your machine):

```bash
xcrun simctl list devices available | grep -i iphone
```

### Supabase Studio

Browse your local database at **http://127.0.0.1:54323** while `supabase start` is running.

### Test personas

`supabase db reset` seeds 11 users for development — a local admin account and 10 named test personas. All share the same password:

```
BourbonDev2024!
```

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

The **dev login screen** (visible only in `__DEV__` builds) lists all users — tap any row to sign in instantly. Google OAuth is disabled locally; use the email list instead.

The **dev user switcher** (floating button, `__DEV__` only) lets you switch personas without returning to the login screen. It is guarded inside the component itself so it renders nothing in production builds even if accidentally left in the layout.

### Local environment variables

For local Supabase development, use these values in `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from `npx supabase status`>
EXPO_PUBLIC_ADMIN_EMAILS=your-real-email@example.com
```

## Production Database

The production project is `dmudeosnwcizorotxlrs`.

### Apply schema migrations

```bash
npx supabase db push --linked
```

### Seed the bourbon catalog (no test users)

The seed file at `supabase/seeds/catalog.sql` contains only the 1,860 bourbon rows — no fake accounts or dev passwords. Run it against prod after a fresh reset:

```bash
npx supabase db query --linked --file supabase/seeds/catalog.sql
```

### Full prod reset (pre-launch only)

Wipes all data and re-applies migrations from scratch. Only use before launch when no real users exist.

```bash
npx supabase db reset --linked --no-seed
npx supabase db query --linked --file supabase/seeds/catalog.sql
```

> **Never run `supabase db reset` (without `--linked`) against prod** — that targets your local database. Never run `seed.sql` against prod — it contains fake test accounts with a shared dev password.

## Auth Setup (Supabase Dashboard)

In your Supabase project go to **Authentication → Providers** and enable:
- **Google** — requires a Google Cloud OAuth client ID + secret
- **Apple** — set **Client ID** to `com.ryankolsen.bourbonvault` and **Secret Key** to the JWT generated from the Apple private key (Team ID: `T6DGD6WGY`, Key ID: `6AB877VMLT`). The JWT expires every 6 months and must be regenerated.

Sign In with Apple uses the native iOS sheet (`expo-apple-authentication` + `signInWithIdToken`) — not a web OAuth redirect. No Services ID or redirect URL is required.

Google OAuth is intentionally disabled in local dev builds. The login screen shows a greyed-out button when not on a real device — use the email list instead.
