# House Spades

A real-time multiplayer Spades card game with web and mobile (Expo) versions.

## Overview

House Spades is an online Spades card game featuring:
- **Two Game Modes**: 
  - "Ace High" (classic Spades)
  - "Joker Joker Deuce Deuce" (custom variant with jokers and modified trump order)
- **Time Controls**: Blitz (10s), Standard (30s), Long (60s) per turn
- **Play Options**: Solo vs bots or matchmaking with real players (bots fill empty slots)
- **Full Game Logic**: Bidding, trick-taking, scoring with bags penalty
- **Ranking System**: ELO-based matchmaking that pairs similar skill levels

## Project Structure

```
client/                          # Web app (React)
├── src/
│   ├── components/              # UI components
│   └── pages/                   # Page routes

mobile/                          # Mobile app (Expo/React Native)
├── app/                         # Expo Router pages
│   ├── auth/                    # Login, signup, forgot password
│   ├── _layout.tsx              # Root layout
│   ├── index.tsx                # Home screen
│   ├── game.tsx                 # Game screen
│   ├── matchmaking.tsx          # Matchmaking screen
│   ├── profile.tsx              # User profile
│   ├── settings.tsx             # App settings, delete account
│   └── match-history.tsx        # Player match history
├── components/                  # Mobile UI components
│   ├── PlayingCard.tsx
│   ├── PlayerHand.tsx
│   ├── PlayerZone.tsx
│   ├── TrickArea.tsx
│   ├── BiddingPanel.tsx
│   └── Scoreboard.tsx
├── app.json                     # Expo configuration
└── package.json                 # Mobile dependencies

server/
├── routes.ts                    # API endpoints (auth, lobbies, matchmaking)
├── storage.ts                   # Database storage (PostgreSQL)
├── matchmaking.ts               # Skill-based matchmaking algorithm
├── gameEngine.ts                # Game logic
├── websocket.ts                 # Real-time communication
└── db.ts                        # Database connection

shared/
└── schema.ts                    # Drizzle ORM models and Zod schemas
```

## Database Schema

PostgreSQL with Drizzle ORM:
- **users**: id, username, email, passwordHash, rating, gamesPlayed, gamesWon
- **password_resets**: token-based password reset
- **match_history**: completed games with scores
- **match_players**: player participation and rating changes

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password` - Reset password
- `DELETE /api/auth/account` - Delete user account (requires authentication)

### User Profile
- `GET /api/user/profile` - Get user profile data
- `GET /api/user/match-history` - Get user's match history (last 50 games)

### Matchmaking
- `POST /api/matchmaking/join` - Join queue
- `POST /api/matchmaking/leave` - Leave queue
- `GET /api/matchmaking/status` - Queue status

### Lobbies
- `GET /api/lobbies` - List active lobbies
- `POST /api/lobbies` - Create lobby
- `POST /api/lobbies/:id/join` - Join lobby
- `POST /api/lobbies/:id/bot` - Add bot

## Game Modes

### Ace High (Classic)
- Standard 52-card deck
- Spades are trump
- Ace is highest in each suit

### Joker Joker Deuce Deuce
- 52 cards + 2 Jokers, minus 2♥ and 2♣
- Trump power order (weakest to strongest):
  3♠ → 4♠ → ... → A♠ → 2♦ → 2♠ → Little Joker → Big Joker

## Matchmaking Algorithm

- Players grouped by rating tier (300 points per tier)
- Team balancing: highest + lowest rated vs middle two
- Bots fill empty slots with similar rating
- ELO rating changes after each match

## Technical Stack

### Web App
- React 18, TypeScript, Wouter, TanStack Query
- Tailwind CSS, Shadcn/UI, Framer Motion

### Mobile App
- Expo SDK 52, React Native 0.76
- Expo Router for navigation
- expo-secure-store for auth tokens

### Backend
- Express.js, PostgreSQL, Drizzle ORM
- WebSocket for real-time gameplay
- bcrypt for password hashing

## Running the Project

### Web App
```bash
npm run dev          # Runs on port 5000
npm run db:push      # Push schema changes
```

### Mobile App (requires separate setup)
```bash
cd mobile
npm install          # Install dependencies
npx expo start       # Start Expo dev server
```

### Building for iOS/Android
Use EAS Build (Expo Application Services):
```bash
cd mobile
npx eas build --platform ios
npx eas build --platform android
```

Note: EAS Build handles iOS builds in the cloud without needing Xcode locally.

## Environment Variables

### Backend (Web)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `EMAIL_API_KEY` - Email service API key (optional, for password resets)
- `EMAIL_FROM` - From email address (default: noreply@housespades.com)
- `EMAIL_DOMAIN` - Email domain (for Mailgun)

### Mobile App (Expo)
- AdMob App IDs configured in `app.json`:
  - iOS: `ca-app-pub-1580761947831808~5230227983`
  - Android: `ca-app-pub-1580761947831808~4819164448`
- RevenueCat will be added post-launch for "remove ads" purchase ($5.99)

## User Preferences

- Dark/light theme persisted in localStorage (web) / secure storage (mobile)
- Game mode and time control remembered between sessions

## Recent Changes (January 2026)

### Guest Access & Match History (Latest)
- **Guest Access**: Users can browse home and play solo games without logging in
  - Home screen shows "Playing as Guest" banner for unauthenticated users
  - Online multiplayer requires registration (button shows "Sign In to Play")
  - Layout no longer redirects unauthenticated users to login
- **Match History Screen**: View past games with win/loss, scores, rating changes
  - GET `/api/user/match-history` endpoint returns last 50 games
  - Win/loss determined by ratingChange (winners: +25, losers: -20)
  - gameMode values: 'joker_joker_deuce_deuce' and 'ace_high'
- **Settings Screen**: Account management and app settings
  - Delete account with confirmation (type "delete" to confirm)
  - "Remove Ads" button (Coming Soon - awaiting RevenueCat integration)
  - Links to Privacy Policy and Terms of Service

### Session Management Fixes
- **PostgreSQL Session Store**: Switched from MemoryStore to `connect-pg-simple` for persistent sessions
  - Sessions now survive Railway container restarts
  - Session table created via `migrate.ts` (not auto-created to avoid production build issues)
- **Explicit Session Save**: Login and register endpoints now call `req.session.save()` before responding
  - Fixes race condition where session wasn't persisted before mobile app made next request
  - Ensures `/api/user/profile` check succeeds immediately after login
- **Added /api/user/profile endpoint**: Alias to /api/auth/me for mobile compatibility
- **Mobile Auth Race Condition Fix (v2.0.16)**: Removed `clearAuth()` from `checkAuthStatus()`
  - Previously: If user logged in quickly after app launch, the initial auth check (with no cookie) would return 401 and call `clearAuth()`, wiping the freshly stored login cookie
  - Now: `checkAuthStatus()` only reads/reports auth status without modifying it
  - Auth invalidation still happens via `authenticatedFetch()` on real 401s during API usage

### Mobile Auth Architecture
- Event-based auth state management with `subscribeToAuthState()` and `notifyAuthStateChange()`
- `clearAuth()` emits false → RootLayout updates immediately → navigation to login
- `storeUser()` emits true → RootLayout updates immediately → navigation to home
- `authenticatedFetch()` throws `AuthError` on 401 to halt stale execution
- Session cookies stored in SecureStore (React Native doesn't auto-persist cookies like browsers)
- App version 2.0.20 (build 22)

### Server CORS Configuration
- CORS enabled with origin allowlist for mobile app compatibility
- Mobile apps send requests without Origin header, which is handled specially
- Session cookie `sameSite: "none"` in production for cross-origin mobile requests
- `Set-Cookie` header exposed for mobile apps to extract session cookies

### Game Logic Synchronization
- Added shared game functions to `shared/schema.ts`: `actsAsSpade()`, `generateStandardDeck()`, `generateJJDDDeck()`, `shuffleArray()`, `sortHand()`, `getPlayableCards()`, `getCardPower()`, `isTrump()`
- Mobile `gameUtils.ts` uses same logic with dual-format support for joker suits ('spades' for server, 'joker' for legacy)
- `PlayerHand.tsx` now uses `getPlayableCards()` instead of inline logic
- Bot AI in `game.tsx` uses `getPlayableCards()` for consistent JJDD trump rules
- JJDD mode: Jokers (BJ, LJ), 2♠, and 2♦ all count as spades for following-suit purposes
- Jokers created with `suit: "spades"` in JJDD deck generation to match server

### App Store Readiness (Latest)
- Added Privacy Policy page at `/privacy` with email collection, matchmaking, ads disclosures
- Added Terms of Service page at `/terms` with gameplay rules, IAP, user conduct
- Added Settings page with account deletion (type "delete" to confirm)
- DELETE `/api/auth/account` endpoint for account deletion
- Footer links to Privacy/Terms on Login and Home pages
- Settings icon in Home header for quick access

### Mobile App Store Features
- App Tracking Transparency (ATT) for iOS ad personalization consent
- Google Mobile Ads (AdMob) with banner and interstitial ads:
  - Banner ads on game screen
  - Interstitial ads after every 1 completed game OR when backing out mid-game
  - iOS Banner: `ca-app-pub-1580761947831808/4571752434`
  - iOS Interstitial: `ca-app-pub-1580761947831808/8594757928`
  - Android Banner: `ca-app-pub-1580761947831808/2983516207`
  - Android Interstitial: `ca-app-pub-1580761947831808/3258670768`
- EAS Build configuration for iOS/Android production builds
- RevenueCat integration deferred to post-launch update

### AdMob Fixes (v2.0.19 - v2.0.20)
- **SDK Initialization**: Moved `mobileAds().initialize()` into useEffect with run-once guard for proper timing on both iOS and Android
- **iOS Static Frameworks**: Added `expo-build-properties` plugin with `useFrameworks: "static"` for iOS compatibility
- **iOS Foreground Fix**: AdBanner now uses `useForeground` hook to reload ads when app returns from background
- **SKAdNetwork Identifiers**: Added 46 SKAdNetwork identifiers required for iOS ad networks to serve ads
- **Error Logging**: Added console logging for ad load success/failure for debugging
- **Matchmaking Session Auth**: Server now uses `req.session.userId` for matchmaking endpoints (no mobile changes needed)

### Card Sorting in JJDD Mode
- Trumps now appear first: Big Joker, Little Joker, 2♠, 2♦, A♠...3♠
- 2♦ grouped with spades/trumps, not with diamonds
- Bidding display moved to center to avoid overlapping north player

### Multiplayer WebSocket Integration
- Updated `useWebSocket` hook with auto-reconnect, game state management
- Game page now supports both solo (local) and multiplayer (WebSocket) modes
- Pass `?type=multiplayer` to Game page URL to use WebSocket
- Bots run on server via `BotAI` when playing via WebSocket

### Password Reset Flow (Fixed)
- Forgot password now generates reset token and sends email
- Reset password endpoint actually updates the password in database
- Session is invalidated after password reset for security
- Dev mode shows reset link in response for testing

### Game Statistics
- Match history saved to database when games complete
- **Stats and rankings only count for multiplayer games** (2+ authenticated human players)
- Solo games vs bots do not affect user stats or ELO ratings
- Stats saved only once per game (guard against duplicate broadcasts)
- Recording includes game mode, scores, and player participation

### Email Utility
- `server/email.ts` ready for Cloudflare Email or Resend/Mailgun
- Dev mode logs emails to console with reset link
- Configure `EMAIL_API_KEY` for production email delivery

## Deployment Notes

### Railway Deployment
- Railway works well for Node.js + PostgreSQL + WebSocket
- Add PostgreSQL database in Railway dashboard
- Set environment variables: DATABASE_URL, SESSION_SECRET, EMAIL_API_KEY

### Cloudflare Domain
- Set DNS record to "DNS only" (grey cloud), not "Proxied"
- This ensures WebSocket connections work properly
- SSL certificates are handled by Railway
