# House Spades

## Overview

House Spades is an online multiplayer Spades card game with both web and mobile (Expo) versions. It offers two distinct game modes: "Ace High" (classic Spades) and "Joker Joker Deuce Deuce" (a custom variant with jokers and a modified trump order). Players can choose from various time controls for turns (Blitz, Standard, Long) and engage in solo play against bots or competitive matchmaking with real players, where bots fill empty slots. The game includes full Spades logic, encompassing bidding, trick-taking, and scoring with a bags penalty system. A key feature is its ELO-based ranking and matchmaking system, designed to pair players of similar skill levels. The project aims to provide a comprehensive and engaging Spades experience across multiple platforms.

## User Preferences

- Dark/light theme persisted in localStorage (web) / secure storage (mobile)
- Game mode and time control remembered between sessions

## System Architecture

**UI/UX Decisions:**
- **Web App:** Uses React 18, TypeScript, Wouter for routing, TanStack Query for data fetching, Tailwind CSS, Shadcn/UI for components, and Framer Motion for animations.
- **Mobile App:** Built with Expo SDK 52 and React Native 0.76. Expo Router handles navigation, and `expo-secure-store` manages authentication tokens.
- **Theming:** Supports dark/light themes, with preferences persisted locally.

**Technical Implementations & Feature Specifications:**
- **Game Modes:**
    - **Ace High (Classic):** Standard 52-card deck, Spades are trump, Ace is highest.
    - **Joker Joker Deuce Deuce:** 52 cards + 2 Jokers, minus 2♥ and 2♣. Features a complex trump hierarchy including Jokers, 2♠, 2♦, and standard Spades.
- **Matchmaking:**
    - ELO-based system groups players by rating tiers (300 points).
    - Team balancing ensures competitive matches (highest + lowest rated vs. middle two).
    - Bots fill empty slots, matching the rating of waiting players.
    - Match notifications are WebSocket-only, replacing HTTP polling.
    - Bots fill empty slots after a 30-second wait if a match is not full.
    - If a player disconnects mid-game, a bot replaces them, and the disconnected player incurs a rating penalty.
    - An idle timer (60 seconds) automatically plays for human players who become unresponsive.
- **Real-time Communication:** Utilizes WebSockets for live gameplay, chat, and matchmaking updates. The mobile WebSocket hook (`mobile/hooks/useWebSocket.ts`) uses an `intentionalDisconnectRef` flag to prevent zombie auto-reconnect when `disconnect()` is called explicitly (e.g., matchmaking→game screen transition). The server (`server/websocket.ts`) verifies the disconnecting WebSocket is the active client before removing from the game room, preventing stale connections from evicting real players.
- **Authentication & User Management:**
    - Standard registration, login, password reset flow.
    - Account deletion functionality is provided.
    - Guest access allows playing solo games without registration; online multiplayer requires login.
    - Persistent sessions are managed using `connect-pg-simple` with PostgreSQL.
    - Mobile authentication handles session cookies via SecureStore and uses an event-based state management system.
- **Bot AI Difficulty System:** 8 difficulty tiers (easy, easy+, medium, medium+, hard, hard+, expert, expert+) implemented server-side in `server/botAI.ts`. Solo games always use hard+ bots. Online matchmaking bots scale with player rating (<900=easy, 900-1049=easy+, 1050-1199=medium, 1200-1349=medium+, 1350-1499=hard, 1500-1649=hard+, 1650-1799=expert, 1800+=expert+). Higher tiers feature better bidding (void/short suit awareness), smarter card play (card tracking, trump management, partner coordination), and reduced randomness. All bot logic is server-side so updates don't require new app builds.
- **Game Logic:** Shared game functions for card generation, shuffling, sorting, trump evaluation, and playable card determination ensure consistency between client and server.
- **Ad Integration:** Google Mobile Ads (AdMob) for banner and interstitial ads on the mobile app, with specific placements (game screen banners, interstitials after games or on matchmaking cancel). Includes App Tracking Transparency (ATT) for iOS.
  - **Family-friendly ads configured:** `maxAdContentRating: G`, `tagForChildDirectedTreatment: true`, `tagForUnderAgeOfConsent: true` set globally before AdMob initialization.
- **Game Statistics:** Match history is recorded for multiplayer games, including scores, game mode, and ELO changes. Solo games do not affect rankings.
- **Native iOS APIs (App Store 4.2 compliance):** App uses Core Haptics (`expo-haptics`) on bid/play/game-over, local notifications (`expo-notifications`) for "your turn" alerts when multiplayer game is backgrounded, native share sheet (`Share` API) on multiplayer game-over, and a felt-textured `ImageBackground` on the game table. Reviewer notes live in `mobile/APP_REVIEW_NOTES.md`. Notification permission is requested in-context only when needed.
- **Mobile home screen layout:** Single bottom-anchored options card with mode segmented control (Ace High / JJDD), point goal segmented control (100/300/500), and a primary Play button (solo) plus secondary Online/Sign In button. Hero greeting + collapsible "How to Play" sit above. No more stacked play cards.

**System Design Choices:**
- **Monorepo Structure:** Divided into `client/` (web), `mobile/` (Expo), `server/`, and `shared/` directories.
- **Database:** PostgreSQL with Drizzle ORM for schema definition and interaction.
    - Key tables: `users`, `password_resets`, `match_history`, `match_players`.
- **Backend:** Express.js for API, PostgreSQL for storage, Drizzle ORM, WebSockets for real-time, and bcrypt for password hashing.
- **CORS:** Configured for cross-origin mobile app requests, with `sameSite: "none"` for session cookies in production.
- **Deployment:** Optimized for Railway, supporting Node.js, PostgreSQL, and WebSockets. Cloudflare DNS is configured to allow WebSocket traffic.

## External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** bcrypt (for password hashing)
- **Web Framework:** Express.js
- **Frontend Libraries (Web):** React, Wouter, TanStack Query, Tailwind CSS, Shadcn/UI, Framer Motion
- **Frontend Libraries (Mobile):** Expo SDK, React Native, Expo Router, `expo-secure-store`
- **Real-time Communication:** WebSockets
- **Email Service:** Configurable for services like Cloudflare Email, Resend, or Mailgun (requires `EMAIL_API_KEY`).
- **Advertising (Mobile):** Google Mobile Ads (AdMob). AdMob App IDs are configured for iOS and Android.
- **Session Management:** `connect-pg-simple` (for PostgreSQL session store).
- **Future Integration:** RevenueCat (for in-app purchases like "remove ads").