# Auth Setup Checklist

Code changes are done. The steps below require manual configuration in external dashboards.

---

## Before you start

Replace `com.ryankolsen.bourbonvault` in `app.json` with your actual reverse-domain identifier
(e.g. `com.ryankolsen.bourbonvault`). Use the same value everywhere in this doc.

---

## Supabase Dashboard

**Authentication → URL Configuration**

Add both of these to the "Redirect URLs" list:
- `bourbonvault://auth/callback` — production / dev builds
- `exp://localhost:8081/--/auth/callback` — Expo Go on simulator
- `exp://YOUR_LOCAL_IP:8081/--/auth/callback` — Expo Go on a physical device (e.g. `exp://192.168.1.5:8081/--/auth/callback`)

---
 
## Google OAuth

1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Create three OAuth 2.0 Client IDs:

   **Web** (required by Supabase server-side)
   - Application type: Web application
   - Authorized redirect URI: `https://dmudeosnwcizorotxlrs.supabase.com/auth/v1/callback`
   - Copy the Client ID and Client Secret → paste into Supabase → Authentication → Providers → Google

   **iOS**
   - Application type: iOS
   - Bundle ID: `com.ryankolsen.bourbonvault`

   **Android**
   - Application type: Android
   - Package name: `com.ryankolsen.bourbonvault`
   - SHA-1 certificate fingerprint: run `eas credentials` or `keytool -list -v -keystore your.keystore`

3. In Supabase → Authentication → Providers → Google:
   - Toggle enabled
   - Paste the **Web** Client ID and Client Secret
   - Save

---

## Apple Sign In (iOS only)

1. Apple Developer → Certificates, Identifiers & Profiles → Identifiers
   - Select your App ID → enable **Sign In with Apple** → Save

2. Create a **Services ID** (used as the OAuth client ID for Supabase):
   - Identifier: e.g. `com.ryankolsen.bourbonvault.web`
   - Enable Sign In with Apple → Configure
   - Return URL: `https://dmudeosnwcizorotxlrs.supabase.com/auth/v1/callback`

3. Create a **Key**:
   - Enable Sign In with Apple → Configure → select your primary App ID
   - Download the `.p8` key file (you only get one chance)
   - Note the Key ID and your Team ID (top-right of the developer portal)

4. In Supabase → Authentication → Providers → Apple:
   - Toggle enabled
   - Client ID: the Services ID from step 2 (e.g. `com.ryankolsen.bourbonvault.web`)
   - Team ID: from your Apple Developer account
   - Key ID: from step 3
   - Private Key: paste the contents of the `.p8` file
   - Save

---

## Done

Once all providers are configured, build a development client:

```
npx expo prebuild
npx expo run:ios   # or run:android
```

Expo Go does not support custom URL schemes for OAuth redirects — you need a dev build or production build to test the full flow.
