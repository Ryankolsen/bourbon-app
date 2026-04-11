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

## Auth Setup (Supabase Dashboard)

In your Supabase project go to **Authentication → Providers** and enable:
- **Google** — requires a Google Cloud OAuth client ID + secret
- **Apple** — required for iOS App Store apps that offer social login
