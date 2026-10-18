# Bourbon Dojo — Marketing Brief

This brief was written from the codebase as of v1.2.4 (2026-10-17). Items marked "(inferred)" are guesses rather than facts confirmed in the code.

## 0. The name
The name is decided: **Bourbon Dojo**. It is used on the login screen, share cards, privacy policy and in the app's config. Internal identifiers keep the old name: iOS bundle ID `com.ryankolsen.bourbonvault` and link scheme `bourbonvault://`. The Android package is `com.ryankolsen.bourbondojo`.

## 1. Elevator summary
A free iOS and Android app for bourbon fans. You track your bottle collection (the "vault"), keep a wishlist, and log tasting notes (nose, palate, finish) with 1–5 star ratings, using a catalog of about 1,860 bourbons and ryes. Around that sits a social layer: follow friends, a feed, likes and comments, and groups with shared ratings and **sale alerts** for bottles spotted at local stores. What makes it different is the **martial-arts "Dojo" game layer**: 10 belts named after bourbon terms (from White Dog up to Pappy), XP, daily streaks, 40 achievements with joke names, and two daily mini-games.

## 2. Target audiences
- **Collectors and bottle hunters.** It tracks purchase price, date and place, and wishlist priority from 1–10. Sale alerts include store, price and notes like "Limit 1 per customer". Achievements include "Hoarder (We Mean Collector)", "Barrel Proof or Bust" and "Old Money".
- **Friend groups and tasting clubs.** Groups have owner and member roles and invites. Example group names in the test data are "The Barrel Room", "Whiskey Underground" and "Friday Night Pours".
- **Newer drinkers who want to learn.** The mini-games teach proof, age, mashbill and flavor words, and there is an easy "Training" difficulty.
- **Adults 21+.** The privacy policy says so, but there's no age check in the app.
- **People with a sense of humor.** The copy is punny and self-aware.

## 3. Core value propositions
1. Bottles, wishlist and tasting journal in one place, with structured nose, palate and finish notes.
2. A catalog of about 1,860 bourbons that the community helps correct.
3. Hunting together: friends' tastings, group ratings, and live sale alerts with directions to the store.
4. A game that turns logging into a habit: belts, XP, streaks, achievements and daily mini-games.
5. Belt and achievement cards built for sharing on social media.
6. Light, dark and high-contrast accessible themes.

## 4. Feature inventory

**Navigation.** Bottom tabs are Home 🏠, Explore 🔍, Tastings 📓, Groups 🥃, Dojo 🥋 and Profile 👤. A 🔔 bell opens notifications.

**Home** has three views:
- **Feed:** tastings from people you follow, with likes, comments and each author's belt badge.
- **My Collection:** the vault, with filters. "Remove from Vault" asks for confirmation.
- **Wishlist.**

**Explore:**
- Search ("Search bourbons…").
- Filter by type, age (including No Age Statement) and distillery, and sort, including by social activity.
- A "friends who tasted this" filter, and trending bottles among people you follow.
- Add a bottle to your collection or wishlist, or use "+ Add a Bourbon" to submit a missing one.

**Bourbon detail page:**
- Proof, age, MSRP and mashbill.
- Average rating and number of ratings, plus ratings within each of your groups.
- A comment thread.
- Buttons: Add to Collection, Log Tasting, Recommend to Group, and Suggest Edit.

**Tasting log:**
- 1–5 stars labeled Poor, Fair, Good, Great, Exceptional.
- Nose ("Aromas you detect on the nose…"), Palate ("Flavors on the palate…"), Finish ("How does it finish?") and Overall Notes ("General impressions, food pairings, context…").
- After your first tasting, a "Share Your First Tasting" prompt appears.
- Tastings can be shared to a group.

**Adding a bourbon:**
- Name, distillery and proof are required.
- Optional: type, age statement, mashbill (for example "75% corn, 13% rye, 12% barley"), MSRP, description, and distillery location (country, state, city).

**Community editing:**
- Users can fill in blank fields directly.
- Changes to existing values go to admins for approval.

**Social:**
- Follow people, search users, and view public profiles with their tastings, collection, achievements and XP.
- Likes, comments and a notification tray ("All caught up!").

**Groups:**
- Create a group, invite by @username or email, and set it public or private.
- A group feed, shared ratings and comments, and bourbon recommendations.
- **Sale Alerts:** post a bottle with its price, the store (picked with Google Places), the address and a note. The alert gets Directions, +Add and Remove buttons.

**The Dojo (game layer):**
- **10 belts, unlocked by XP:**

| Belt | XP needed |
|---|---|
| White Dog | 0 |
| Corn Whiskey | 200 |
| New Oak | 600 |
| Bonded | 1,500 |
| Single Barrel | 3,500 |
| Small Batch | 8,000 |
| Barrel Proof (Senpai) | 16,000 |
| Wheated (Senpai) | 30,000 |
| Single Malt (Senpai) | 50,000 |
| **Pappy (Sensei)** | 80,000 |

- **Earning XP:**

| Action | XP |
|---|---|
| Log a tasting | 25 |
| First tasting of a bottle | +15 |
| Add to collection | 10 |
| Add to wishlist | 5 |
| Share to a group | 15 |
| Create a group | 50 |
| Join a group | 20 |
| Post a comment | 10 |
| Get a like | 5 |
| Follow someone | 5 |
| Gain a follower | 10 |
| Share an achievement (first time) | 100 |
| Mini-games | varies |

- **Daily streak:** day N earns N XP, with a +20 bonus on day 7 and +75 on day 30. A Daily Bonus "Claim" screen counts up the reward.
- **Feedback:** XP toasts with a sparkle effect, a progress bar, a belt-up celebration with a share button, and a Dojo Guide explainer.
- **40 achievements** in five groups: Tasting, Collection, Social, Dojo and Explorer. Example titles: "First Impressions", "Pretentious in the Best Way", "Send Help", "Champagne Taste, Bourbon Budget", "Squad Goals", "Never Shuts Up", "You're Kind of a Big Deal", "Disturbingly Consistent", "Sweep the Leg", "Rye Curious", "Wheated Wonder", "Single Barrel Snob", "Old Money", "Passport Sipper", "The Legend".

**Mini-games** (5 plays per game per day, with Training, Standard and Challenge difficulty):
- **Dojo Duel:** "3 rounds of bourbon knowledge against a ghost opponent". The ghost is a recording of another player's run near your belt level. Rounds: identify a bourbon from partial clues, compare stats, and spot the fake tasting note. Includes health bars and a recap, plus about 100 sarcastic "Sensei" quotes and about 300 fake tasting notes.
- **Pour or Faker:** "Real bourbon or faker? Build your streak." You decide whether a name is real or invented, such as "Uncle Bob's Brown Liquor" or "Grandma's Secret Recipe Bourbon". Streak emojis go 💀 → ⚡ at 5 → 🔥 at 10 → 🏆 at 20.

**Sharing:**
- A branded belt or achievement image card, shared to Instagram Stories, Bluesky, Facebook, or the phone's share sheet. Share cards link to https://rko-design.netlify.app/bourbon-dojo (the landing page) with "Come train with me 🥋" copy.
- Example copy: "Bottled in Bond and loving it 🔖 Earned my Bonded belt in the Bourbon Dojo. Come train with me 🥋" and "LEGENDARY. The Sensei has arrived 👑 Earned Pappy status in the Bourbon Dojo."

**Profile:**
- Avatar, display name, username, and follower and following counts.
- Appearance: System, Light, Dark or Accessible.
- Edit Profile, Sign Out, and Delete Account (with a 30-day grace period to cancel).

**Not in the app (don't claim these):** barcode or label scanning, bottle photos, AI recognition, data export, offline mode, a web app, any paid features, analytics.

## 5. User journey
1. The login screen shows 🥃 **Bourbon Dojo** with the tagline *"Track your collection, tastings & wishlist."* Sign in with Apple, Google or email.
2. The Daily Bonus "Claim" screen appears right away. There's no tutorial; the empty screens point you to Explore.
3. Add a bottle, log a first tasting, get the share prompt, and earn XP until the first belt-up.
4. From there: follow friends, join groups, play the daily games, and share belt cards.

## 6. Data tracked
- **Bottle:** name, distillery, mashbill, age (or No Age Statement), proof, type, MSRP, description, and distillery city, state and country.
- **Types:** traditional, small batch, single barrel, wheated, cask strength, high rye, rye, bottled-in-bond, straight, blended.
- **Collection entry:** purchase price, date, place and notes.
- **Wishlist entry:** priority 1–10 and notes.
- **Tasting:** rating 1–5, nose, palate, finish, overall notes and date.
- **Community data:** average ratings and counts, group ratings, XP history, streaks, achievements, and sale alerts.

## 7. Brand and vibe
- **Concept:** bourbon meets martial-arts dojo, with a Sensei and Senpai ranks and a sardonic Sensei character in the games.
- **Tone:** playful, punny and self-aware, never stuffy. Real copy:
  - "Raw potential awaits. Welcome to the Dojo."
  - "Full strength, Senpai. No water added."
  - "First time in the barrel — keep aging, distiller."
  - Belt lines: "Raw and unaged — every master starts here", "You've got the grain, now learn the craft", "Meeting the standard, bottled in bond", "Few reach this mash", "Legendary. The Sensei has arrived."
- **Bourbon words used throughout:** proof, mashbill, nose, palate, finish, NAS, wheated, high rye, bottled-in-bond, cask strength, single barrel, small batch, MSRP.
- **Themes:**
  - **Charcoal** (dark): near-black #0a0a0a and #1a1a1a, blue accents #0284c7 and #38bdf8, amber stars #f59e0b.
  - **Navy & Flax** (light): warm flax #eae6de, white cards, navy text #0a1624, accent #1e4080.
  - **High Contrast**: black with gold #ffd700, meeting the WCAG AAA accessibility standard.
- **Belt colors:**

| Belt | Color |
|---|---|
| White Dog | #E5E7EB |
| Corn Whiskey | #FCD34D |
| New Oak | #FB923C |
| Bonded | #22C55E |
| Single Barrel | #3B82F6 |
| Small Batch | #A855F7 |
| Barrel Proof | #92400E |
| Wheated | #EF4444 |
| Single Malt | #374151 |
| Pappy | #F59E0B |

- **Icon:** the Android icon background is a dark bourbon brown, #3D2010. Tab icons are emoji, and the app uses the phone's system font.
- **Brand gap:** the main dark theme is blue and black, not warm bourbon tones.

## 8. Monetization
- Completely free: no subscriptions, in-app purchases, ads or paywall.
- The privacy policy says: *"We do not sell your personal information. We do not use your data for advertising."* That's a usable trust message.

## 9. Privacy, accounts and social
- **Sign-in:** Apple, Google or email. No guest mode.
- **Privacy:** each user's data is locked to them at the database level. Data is encrypted in transit and at rest.
- **Visibility:**
  - Collection and wishlist: private.
  - Profiles and achievements: public.
  - Tastings: shown in followers' feeds and on public profiles. Whether they're private by default isn't clear, so confirm before making privacy claims.
- **Account deletion:** in the app, with a 30-day grace period to cancel.
- **Privacy policy:** current, at https://rko-design.netlify.app/bourbon-dojo/privacy. Linked from the Login and Profile screens. The login screen also links to the RKO Design website.

## 10. Platforms and history
- iOS (including iPad) and Android, portrait only. Fixes can ship over the air without a store update.
- Current version is **1.2.4**. App Store Connect ID is 6762319810.
- **History:** first commit April 10, 2026; 307 commits since.

| Date | Milestone |
|---|---|
| Apr 12 | Groups |
| Apr 18 | Social feed |
| Apr 23–25 | Dojo XP, belts and streaks; sale alerts |
| Apr 25 | Renamed to Bourbon Dojo |
| May 1 | Achievement sharing |
| May 2 | Dojo Duel |
| May 4 | Pour or Faker (v1.0.1) |
| May 16 | 40 achievements (v1.1.0) |
| May 31 | Daily Bonus screen (v1.2.0) |
| Sep 27 | Maintenance hardening (v1.2.4) |

## 11. Trust and quality points
- Syncs across devices through the cloud, with live XP and achievement updates.
- Logins are stored in the phone's secure storage.
- Database-level privacy rules and daily automated backups.
- A large automated test suite (an engineering story more than a user one).
- An accessibility theme that meets WCAG AAA.
- Needs an internet connection, so **don't market it as offline**.

## 12. Differentiators and positioning ideas
- Bourbon learning plus progression through belts named after bourbon terms. This seems rare among trackers like Distiller and BarrelBook, but the comparison wasn't researched, so verify it.
- Hunting together: group sale alerts for hard-to-find bottles.
- Personality: the Sensei, fake tasting notes, and achievement names that sound like jokes.
- Built-in word of mouth: every shared belt card carries the app name.
- Taglines to try: **"Duolingo for bourbon"**, **"Earn your belt"**, **"Hunt together"**, **"Your bourbon journal with a sense of humor"**, **"From White Dog to Pappy."**

## 13. Coming next
- **Achievements XP is live.** The `achievements_live` flag has been on in production since mid-May 2026, and achievements pay out XP and send bell notifications. This is safe to advertise.
- **Push notifications:** the server side exists, but the app doesn't seem to register for them yet. Confirm before advertising notifications.
- **Possible future features:** leaderboards, live multiplayer, game reminders, and new games ("Price Whisperer", "Mash Pit" were brainstormed).
- The only open GitHub issues are about a dependency and Expo SDK upgrade.

## 14. Weak spots a marketer should know
- The catalog is patchy: many bottles have no proof or distillery, and there are no bottle images.
- No barcode scanning, export or photos. Competitors may have these.
- No onboarding tutorial.
- A 21+ audience is stated but there's no age check.
- It looks like a single-developer project (inferred). That could be an indie, built-by-a-fan story.

## 15. Raw facts
- **Name:** Bourbon Dojo.
- **App IDs:** iOS bundle `com.ryankolsen.bourbonvault`, Android package `com.ryankolsen.bourbondojo`, link scheme `bourbonvault://`.
- **Version:** 1.2.4. **App Store Connect ID:** 6762319810.
- **Privacy policy:** https://rko-design.netlify.app/bourbon-dojo/privacy
- **Landing page:** https://rko-design.netlify.app/bourbon-dojo
- **Contact:** rkolsen.design@gmail.com. The Google Play account is under "RKO Design".
- **Outside services:** Google Places (store lookup in sale alerts), Apple and Google sign-in, Supabase (backend).
