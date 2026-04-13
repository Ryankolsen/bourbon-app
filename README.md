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
| Auth providers | Google OAuth, Apple OAuth |

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

```bash
npm run ios      # iOS simulator
npm run android  # Android emulator
npm start        # Expo Go (scan QR code)
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

```bash
npx expo start
# press 'i' for iOS simulator, 'a' for Android emulator
```

### Supabase Studio

Browse your local database at **http://127.0.0.1:54323** while `supabase start` is running.

### Test personas

`supabase db reset` seeds 10 named test personas for development. All share the same password:

```
BourbonDev2024!
```

| Name | Email | Group | Role |
|------|-------|-------|------|
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

The dev user switcher panel (visible only in `__DEV__` builds) lets you sign in as any of these personas in one tap.

### Local environment variables

For local Supabase development, use these values in `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from `npx supabase status`>
EXPO_PUBLIC_ADMIN_EMAILS=your-real-email@example.com
```

## Auth Setup (Supabase Dashboard)

In your Supabase project go to **Authentication → Providers** and enable:
- **Google** — requires a Google Cloud OAuth client ID + secret
- **Apple** — required for iOS App Store apps that offer social login
