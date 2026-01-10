# House Spades

A real-time multiplayer Spades card game built with React, TypeScript, and WebSockets.

## Overview

House Spades is an online Spades card game featuring:
- **Two Game Modes**: 
  - "Ace High" (classic Spades)
  - "Joker Joker Deuce Deuce" (custom variant with jokers and modified trump order)
- **Time Controls**: Blitz (10s), Standard (30s), Long (60s) per turn
- **Play Options**: Solo vs bots or matchmaking with real players (bots fill empty slots)
- **Full Game Logic**: Bidding, trick-taking, scoring with bags penalty

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── PlayingCard.tsx      # Card face component
│   │   ├── CardBack.tsx         # Card back with pattern
│   │   ├── PlayerZone.tsx       # Opponent display area
│   │   ├── PlayerHand.tsx       # Player's hand of cards
│   │   ├── TrickArea.tsx        # Center area for played cards
│   │   ├── GameTable.tsx        # Main game layout
│   │   ├── BiddingPanel.tsx     # Bid selection UI
│   │   ├── Scoreboard.tsx       # Team scores display
│   │   ├── GameModeCard.tsx     # Mode selection card
│   │   ├── TimeControlSelector.tsx
│   │   ├── MatchmakingScreen.tsx
│   │   ├── GameResultsModal.tsx
│   │   ├── ThemeProvider.tsx    # Dark/light mode
│   │   └── ThemeToggle.tsx
│   ├── pages/
│   │   ├── Home.tsx             # Lobby/mode selection
│   │   ├── Game.tsx             # Main game page
│   │   └── Matchmaking.tsx      # Finding opponents
│   └── lib/
│       └── gameUtils.ts         # Card utilities
server/
├── routes.ts                    # API endpoints
└── storage.ts                   # In-memory storage
shared/
└── schema.ts                    # Game types and schemas
```

## Game Modes

### Ace High (Classic)
- Standard 52-card deck
- Spades are trump
- Ace is highest in each suit
- Standard bidding and scoring

### Joker Joker Deuce Deuce
- 52 cards + 2 Jokers, minus 2♥ and 2♣
- Modified trump power order (weakest to strongest):
  3♠ → 4♠ → ... → A♠ → 2♦ → 2♠ → Little Joker → Big Joker

## Technical Stack

- **Frontend**: React 18, TypeScript, Wouter (routing), TanStack Query
- **Styling**: Tailwind CSS, Shadcn/UI components, Framer Motion
- **Backend**: Express.js with in-memory storage
- **Real-time**: Ready for WebSocket integration

## Running the Project

The app runs on port 5000 with `npm run dev`. Both frontend and backend are served from the same origin.

## User Preferences

- Dark/light theme persisted in localStorage
- Game mode and time control remembered between sessions
