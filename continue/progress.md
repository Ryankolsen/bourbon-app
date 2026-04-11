# BourbonVault — Progress & Remaining Work

## Done

### Project Scaffold
- [x] Created Expo managed workflow app with TypeScript (`create-expo-app`)
- [x] Replaced default entry point (`App.tsx` / `index.ts`) with Expo Router
- [x] Set `"main": "expo-router/entry"` in `package.json`
- [x] Added `scheme: "bourbonvault"` to `app.json` (required for OAuth deep links)
- [x] Configured path aliases (`@/*`) in `tsconfig.json`

### Dependencies Installed
- [x] `expo-router` — file-based navigation
- [x] `@supabase/supabase-js` — database + auth client
- [x] `expo-secure-store` — encrypted token storage
- [x] `expo-auth-session` + `expo-web-browser` — OAuth flow
- [x] `expo-crypto` — PKCE support for auth
- [x] `@tanstack/react-query` v5 — server state + caching
- [x] `react-hook-form` + `@hookform/resolvers` + `zod` — form state + validation
- [x] `nativewind` v4 + `tailwindcss` v3 — Tailwind styling for React Native
  - Note: Tailwind must stay on v3 — NativeWind v4 is not compatible with Tailwind v4

### Styling & Config
- [x] `tailwind.config.js` — NativeWind preset + custom bourbon color palette
- [x] `global.css` — Tailwind directives
- [x] `babel.config.js` — NativeWind babel preset
- [x] `metro.config.js` — NativeWind metro plugin

### App Structure (Expo Router)
- [x] `app/_layout.tsx` — root layout with `QueryClientProvider` and auth guard
- [x] `app/(auth)/_layout.tsx` — auth stack layout
- [x] `app/(auth)/login.tsx` — login screen with Google + Apple OAuth buttons
- [x] `app/(tabs)/_layout.tsx` — bottom tab navigator (bourbon-themed dark UI)
- [x] `app/(tabs)/index.tsx` — Collection tab (lists user's bottles)
- [x] `app/(tabs)/explore.tsx` — Explore tab (search + add to collection)
- [x] `app/(tabs)/tastings.tsx` — Tastings tab (placeholder)
- [x] `app/(tabs)/profile.tsx` — Profile tab (shows email, sign out button)

### Lib & Hooks
- [x] `lib/supabase.ts` — Supabase client with SecureStore token persistence
- [x] `lib/query-client.ts` — TanStack Query client (5min stale time, 2 retries)
- [x] `hooks/use-auth.ts` — session state, auth listener, `signOut()`
- [x] `hooks/use-bourbons.ts` — `useBourbons(search?)` and `useBourbon(id)`
- [x] `hooks/use-collection.ts` — `useCollection`, `useAddToCollection`, `useUpdateBottleStatus`

### Types
- [x] `types/database.ts` — manually written TypeScript types matching Supabase schema

### Supabase / Database
- [x] Created Supabase project (`bourbon-app`, US East, nano plan)
- [x] Configured `.env.local` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - Using the **Publishable key** (not the Secret key)
- [x] Ran initial schema migration via SQL editor
- [x] Schema includes:
  - `profiles` — auto-created on signup via `handle_new_user` trigger
  - `bourbons` — master list of bourbon bottles
  - `user_collection` — bottles owned (sealed / open / empty)
  - `user_wishlist` — bottles on the wishlist (priority 1–10)
  - `tastings` — tasting notes + 0–100 rating (nose, palate, finish)
  - Row Level Security enabled on all tables
- [x] Installed Supabase CLI (`brew install supabase/tap/supabase`)
- [x] Logged in and linked CLI to project (`supabase link --project-ref dmudeosnwcizorotxlrs`)
- [x] Renamed migration to timestamp format (`20240101000000_initial_schema.sql`)
- [x] Marked initial migration as applied (`supabase migration repair`)
- [x] Local and remote migrations are in sync (`supabase migration list`)

### Git / GitHub
- [x] Generated SSH key (`ed25519`) and added to GitHub account
- [x] Set remote to SSH (`git@github.com:Ryankolsen/bourbon-app.git`)
- [x] Pushed all code to `main` branch
- [x] `README.md` written with setup instructions, stack table, schema docs, migration workflow

---

## To Do

### Auth (High Priority)
- [ ] Enable Google OAuth provider in Supabase dashboard (Authentication → Providers)
  - Requires a Google Cloud project with OAuth client ID + secret
- [ ] Enable Apple OAuth provider in Supabase dashboard
  - Required for App Store apps that offer any social login
- [ ] Test full sign-in flow end-to-end on a device or simulator
- [ ] Handle auth edge cases: token expiry, network errors, sign-in cancellation

### Data
- [ ] Seed `bourbons` table with real data so Explore tab is useful
  - Could write a seed SQL file at `supabase/seed.sql`
- [ ] Auto-generate `types/database.ts` from live schema:
  ```bash
  supabase gen types typescript --project-ref dmudeosnwcizorotxlrs > types/database.ts
  ```

### Tasting Notes Screen
- [ ] Build tasting form with React Hook Form + Zod
  - Fields: bourbon picker, rating (0–100), nose, palate, finish, overall notes, date
- [ ] List past tastings with rating display
- [ ] Link tastings to collection entries

### Wishlist
- [ ] Build wishlist tab or section (schema is ready, no UI yet)
- [ ] Add "Add to Wishlist" button on Explore screen

### Bourbon Detail Screen
- [ ] `app/bourbon/[id].tsx` — detail view for a single bourbon
  - Show all metadata, average community rating, add to collection/wishlist buttons

### UI / UX Polish
- [ ] Install and wire up `react-native-reusables` components (shadcn/ui for RN)
- [ ] Replace raw `TouchableOpacity` buttons with reusable `Button` component
- [ ] Add loading skeletons instead of spinner
- [ ] Empty state illustrations
- [ ] Pull-to-refresh on Collection and Explore tabs

### Collection Improvements
- [ ] Allow updating bottle status (sealed → open → empty) inline
- [ ] Add purchase price / date / location when adding to collection (form)
- [ ] Remove from collection

### Production Readiness
- [ ] Configure Expo EAS Build for iOS and Android
- [ ] Set up environment variables in EAS (`eas secret:create`)
- [ ] Submit to App Store and Google Play
- [ ] Set up Supabase backups and monitoring
