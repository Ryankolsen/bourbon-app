---
name: start-emulator
description: Start the BourbonVault dev environment for iOS Simulator or Android emulator, including local Supabase. Checks Supabase status, starts it if needed, builds and installs the native app, then launches Metro. Use when the user wants to run the app, start the simulator, start the emulator, start dev, or boot the app.
---

# Start Emulator

## Step 1 — Ask platform

If the user didn't specify, ask: **iOS Simulator or Android emulator?**

## Step 2 — Check and start Supabase

```bash
npx supabase status
```

If output contains `DB URL`, already running — skip start. Otherwise:

```bash
npx supabase start
```

## Step 3a — iOS: find or boot a Simulator

```bash
xcrun simctl list devices booted | grep -i iphone
```

If nothing is booted:
```bash
xcrun simctl boot 01DF1BA4-0491-44C5-980C-5479D7D04C25  # iPhone 17
# To list all: xcrun simctl list devices available | grep -i iphone
```

## Step 3b — iOS: build (~1 min — tell the user)

> `npx expo run:ios` is broken under Xcode 26 (devicectl bug) — use xcodebuild directly.
> Skip this step if only JS changed; Metro hot-reloads JS without a rebuild.

```bash
xcodebuild \
  -workspace ios/bourbonapp.xcworkspace \
  -scheme bourbonapp \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=<UDID from 3a>" \
  build 2>&1 | grep -E "error:|BUILD"
```

## Step 3c — iOS: install and launch

```bash
APP=$(find ~/Library/Developer/Xcode/DerivedData -name "bourbonapp.app" \
  -path "*iphonesimulator*" | head -1)

xcrun simctl install booted "$APP"
xcrun simctl launch booted com.ryankolsen.bourbonvault
```

## Step 3d — iOS: start Metro

```bash
npx expo start --port 8081
```

## Step 4 — Android emulator

Ensure an emulator is booted in Android Studio first, then:

```bash
npx expo run:android
```

Metro starts automatically.