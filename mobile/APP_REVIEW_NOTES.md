# House Spades — App Review Notes (v2.1.0 / iOS build 37)

Thank you for reviewing House Spades. This update directly addresses the prior 4.2 (Minimum Functionality) feedback by clearly differentiating the app from a web browser experience.

## This is a fully native React Native (Expo) app, not a webview wrapper.

It uses the following native iOS APIs and SDKs that are not available in a standard web browser:

- **Haptic feedback** (Core Haptics via `expo-haptics`) — fires on bid placement, card play, trick win, share action, and game-over moments.
- **Native share sheet** (`UIActivityViewController` via React Native's `Share` API) — players can share match results from the game-over screen.
- **Secure Keychain storage** (`expo-secure-store`) — session credentials stored in iOS Keychain, not cookies.
- **AdMob SDK** (`react-native-google-mobile-ads`) — native banner and interstitial ads with App Tracking Transparency (`NSUserTrackingUsageDescription` shown in-context). Family-friendly settings: `maxAdContentRating: G`, `tagForChildDirectedTreatment: true`.
- **Native WebSocket** for real-time multiplayer (game state, matchmaking, live opponent moves) — not HTTP polling.
- **App Tracking Transparency** prompt with proper usage description.
- **Native gestures** via `react-native-gesture-handler` and reanimated card animations.
- **Offline solo play** — full Spades logic runs entirely on-device with no network required (try airplane mode + tap Play).

## Distinctive features beyond a generic browser experience

- Two complete game modes with different rule engines: **Ace High** (classic Spades) and **Joker Joker Deuce Deuce** (custom variant with jokers, 2♠, and 2♦ in a custom trump hierarchy).
- ELO-based ranking and matchmaking (8-tier bot AI scales with player rating).
- Persistent local game state — solo games are saved automatically and resume after backgrounding.
- Disconnection recovery overlay during multiplayer.
- In-app account deletion (Guideline 5.1.1(v)).
- Privacy Policy: https://house-spades.com/privacy
- Terms of Service: https://house-spades.com/terms

## How to test online multiplayer

1. Sign in (or create a free account).
2. From the home screen, tap **Online**.
3. Pick a mode and point goal.
4. Bots fill any empty seats after ~30 seconds so you can experience a full match without needing other reviewers online.

## Demo account

Username: `appreviewer`
Password: (provided in App Store Connect "App Review Information" notes)

If a demo account is not provisioned, please create one — the registration flow is one screen and email verification is not required.

Thanks again for your time.
