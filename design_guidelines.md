# House Spades - Design Guidelines

## Design Approach
**System-Based Design** using Material Design principles adapted for card game interfaces. Drawing inspiration from chess.com's clean, focused game interface and established online card game patterns.

## Core Design Principles
1. **Clarity First**: Game state, cards, and actions must be immediately understandable
2. **Minimal Distraction**: Interface fades into background during gameplay
3. **Fast Recognition**: Quick visual scanning for suits, values, and game state
4. **Progressive Disclosure**: Show only relevant information for current game phase

---

## Typography
- **Primary Font**: Inter (Google Fonts)
- **Display**: 600 weight for headings, game titles
- **Body**: 400 weight for general text
- **UI Elements**: 500 weight for buttons, labels
- **Card Values**: 700 weight, larger sizing for immediate recognition

**Hierarchy**:
- H1: text-3xl font-semibold (page titles, "House Spades")
- H2: text-2xl font-semibold (game mode headers)
- Body: text-base (descriptions, chat)
- UI Labels: text-sm font-medium (buttons, status indicators)
- Card Text: text-lg font-bold (card values on player's hand)

---

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 8, 12, 16 consistently
- Tight spacing: p-2, gap-2 (card layouts, compact UI)
- Standard spacing: p-4, gap-4 (buttons, form elements)
- Section spacing: p-8, gap-8 (game areas, player zones)
- Page margins: p-12 to p-16 (outer containers)

**Container Strategy**:
- Game table: max-w-6xl centered
- Lobby/matchmaking: max-w-4xl
- Menus: max-w-md for focused interactions

---

## Core Layouts

### 1. Home/Lobby Screen
- Centered layout with game mode selection cards
- Two primary buttons: "Play vs Bots" | "Find Match"
- Game mode selector below: Grid of 2 cards (Ace High | Joker Joker Deuce Deuce)
- Each mode card shows: title, brief rules summary, "Play" button
- Quick stats panel: Games played, Win rate (subtle, top-right)

### 2. Matchmaking Screen
- Centered status card showing: "Finding opponents..." with animated indicator
- Player slots (4 total): Show filled slots with avatars/names, empty with placeholder
- Cancel button at bottom
- Time elapsed counter

### 3. Game Table Interface
**Layout Structure**:
```
┌─────────────────────────────────┐
│   Top Opponent (North)          │
├──────────┬──────────┬───────────┤
│ Left     │  Trick   │   Right   │
│ Opp.     │  Area    │   Opp.    │
│ (West)   │ (Center) │  (East)   │
├──────────┴──────────┴───────────┤
│   Player Hand (South)            │
│   [Card][Card][Card]...          │
└─────────────────────────────────┘
```

**Player Zones** (4 quadrants):
- Each opponent shows: Name, card back stack (count), bid/books indicator
- Player (bottom): Full hand of cards displayed face-up
- All zones include score badge

**Center Trick Area**:
- 4 card positions arranged in compass layout (N/S/E/W)
- Currently played cards shown here
- Subtle indication of winning card during trick

**Sidebar (Collapsible)**:
- Current round info: Round number, trump suit
- Bidding phase: Input for bid amount, confirm button
- Scoreboard: Team scores, individual books
- Game log: Recent actions (compact)

---

## Component Library

### Cards
- **Opponent Card Backs**: Fixed size (80x112px), subtle shadow, rounded-lg
- **Player Cards**: Larger (100x140px), hover lift effect (translate-y-1), clickable indication
- **Card Stack Display**: Overlapping cards with count badge
- **Playing Animation**: Smooth translate to center trick area

### Game Mode Selection Cards
- Card-style containers (rounded-xl, border, p-6)
- Icon or visual indicator for each mode
- Title + 2-line description
- Prominent "Select" button
- Active state: border highlight

### Buttons
- **Primary Actions**: rounded-lg, px-6 py-3, font-medium
- **Secondary Actions**: outline variant
- **In-game Actions**: Compact (px-4 py-2), positioned near player hand
- Examples: "Play Card", "Pass", "Confirm Bid"

### Status Indicators
- **Bid Display**: Pill-shaped badge (rounded-full, px-3 py-1, text-sm)
- **Books Counter**: "X/Y books" format
- **Turn Indicator**: Subtle glow or border on active player zone
- **Timer**: Circular progress indicator for timed moves

### Modals/Overlays
- **Game Results**: Centered card showing winner, final scores, "Play Again" / "Return to Lobby"
- **Rules Reference**: Slide-in panel with game rules, accessible via icon
- **Settings**: Dropdown or modal for sound, animations, preferences

### Navigation
- **Top Bar**: Logo left, user avatar/menu right, minimal height
- **In-Game Header**: Subtle bar with game ID, leave/settings icons
- No heavy navigation during active gameplay

---

## Interaction Patterns

### Card Selection
- Hover: Slight lift (transform: translateY(-4px))
- Selected: Stronger lift (translateY(-8px)) + subtle outline
- Disabled/Unplayable: Reduced opacity (0.5), no hover
- Play animation: Smooth transition to trick center

### Bidding Phase
- Number selector (stepper or slider) with large +/- buttons
- Clear "0" (nil bid) option prominently displayed
- Confirm button only enables when valid bid selected

### Matchmaking
- Animated dots or spinner for "searching"
- Player slots fill with smooth fade-in animation
- Ready indicators for each player

---

## Game Flow Screens

1. **Landing**: Logo, tagline, primary CTA buttons
2. **Lobby**: Mode selection, player stats, leaderboard access
3. **Matchmaking**: Status + player slots
4. **Game Table**: Primary gameplay interface (detailed above)
5. **Results**: Score summary, rematch options

---

## Accessibility
- Keyboard navigation: Tab through cards, arrow keys to select, Enter to play
- Card alt text: Full card name (e.g., "Ace of Spades")
- High contrast mode option for card suits
- Screen reader announcements for game state changes

---

## Images
No hero images needed. This is a game interface focused on functionality.

**Visual Assets Required**:
- Card deck graphics (52 cards + 2 jokers for custom mode)
- Card back design (single, repeatable graphic)
- Suit icons (♠♥♦♣) for UI elements
- User avatar placeholders/defaults
- Logo/branding for "House Spades"

Use icon library (Heroicons) for UI icons: settings, help, menu, logout, etc.

---

## Animations
**Minimal and purposeful**:
- Card dealing: Quick cascade effect (200ms delays)
- Card playing: Smooth slide to center (300ms)
- Turn transitions: Subtle fade/highlight on active player
- Victory celebration: Confetti or brief animation on win screen
- NO continuous animations during gameplay (distraction)