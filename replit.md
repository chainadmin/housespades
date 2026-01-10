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
│   └── profile.tsx              # User profile
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

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key

## User Preferences

- Dark/light theme persisted in localStorage (web) / secure storage (mobile)
- Game mode and time control remembered between sessions
