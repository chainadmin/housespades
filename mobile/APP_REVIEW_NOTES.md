# House Spades — App Review Notes (v2.1.1 / iOS build 41)

Thank you for reviewing House Spades. This update responds directly to the Guideline 5.6 feedback by making every automated behavior in the app fully transparent to users. Nothing in the app is conditional on review status, account, region, date, or any remote flag — the build behaves identically for reviewers and for the public.

## Transparency changes in this build

- **Computer opponents are clearly labeled.** Every computer-controlled player shows a visible "BOT" badge next to their name in the game UI, in both offline solo play and online multiplayer.
- **Matchmaking discloses bot seat-filling up front.** The matchmaking screen tells players that if no human opponents are found, empty seats are filled by computer players (labeled "BOT") after about 10 seconds. This matches the actual server behavior.
- **Turn timer is escalated transparently.** In online games, if a player doesn't act within 60 seconds their turn is auto-completed once; if they miss two consecutive turns, their seat is handed to a bot — keeping their name and gaining the visible "BOT" badge.
- **Disconnections are visible.** If a human player disconnects mid-game, their seat is taken over by a bot after a short grace period. The player's original name stays visible and the seat gains the "BOT" badge, so everyone at the table can see exactly what happened.
- **No purchases.** The in-app purchase endpoint has been disabled server-side; the app currently sells nothing and grants no entitlements. Ads are provided by AdMob with family-safe settings (`maxAdContentRating: G`, child-directed treatment) and an in-context App Tracking Transparency prompt.

## What the app is

A fully native React Native (Expo) Spades card game — not a webview wrapper. Native iOS capabilities include haptic feedback (`expo-haptics`), the native share sheet, Keychain storage (`expo-secure-store`), native WebSocket multiplayer, native gestures/animations, and full offline solo play (works in airplane mode).

Game features:
- Two rule engines: **Ace High** (classic Spades) and **Joker Joker Deuce Deuce** (custom variant).
- ELO-based ranking and matchmaking; bot AI scales with player rating.
- Persistent local game state with automatic resume.
- In-app account deletion (Guideline 5.1.1(v)).
- Privacy Policy: https://house-spades.com/privacy
- Terms of Service: https://house-spades.com/terms

## How to test online multiplayer

1. Sign in (or create a free account — one screen, no email verification).
2. From the home screen, tap **Online**.
3. Pick a mode and point goal.
4. If no other humans are queued, seats are filled with clearly labeled bots after ~10 seconds, so you can experience a full match at any time.

## Demo account

Username: `appreviewer`
Password: (provided in App Store Connect "App Review Information" notes)

Thanks again for your time.
