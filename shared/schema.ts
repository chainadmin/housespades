import { z } from "zod";

// Card suits and values
export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export type Suit = (typeof SUITS)[number];

// Standard card values (2-10, J, Q, K, A)
export const STANDARD_VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
export type StandardValue = (typeof STANDARD_VALUES)[number];

// Extended values for Joker Joker Deuce Deuce mode
export const EXTENDED_VALUES = [...STANDARD_VALUES, "LJ", "BJ"] as const;
export type ExtendedValue = (typeof EXTENDED_VALUES)[number];

// Game modes
export const GAME_MODES = ["ace_high", "joker_joker_deuce_deuce"] as const;
export type GameMode = (typeof GAME_MODES)[number];

// Time controls similar to chess.com
export const TIME_CONTROLS = ["blitz", "standard", "long"] as const;
export type TimeControl = (typeof TIME_CONTROLS)[number];

export const TIME_CONTROL_SECONDS: Record<TimeControl, number> = {
  blitz: 10,
  standard: 30,
  long: 60,
};

// Player positions at the table
export const POSITIONS = ["south", "west", "north", "east"] as const;
export type Position = (typeof POSITIONS)[number];

// Card schema
export const cardSchema = z.object({
  suit: z.enum(SUITS),
  value: z.string(),
  id: z.string(),
});
export type Card = z.infer<typeof cardSchema>;

// Player schema
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isBot: z.boolean(),
  position: z.enum(POSITIONS),
  hand: z.array(cardSchema),
  bid: z.number().nullable(),
  tricks: z.number(),
  isReady: z.boolean(),
});
export type Player = z.infer<typeof playerSchema>;

// Team schema
export const teamSchema = z.object({
  id: z.string(),
  players: z.array(z.string()), // player ids
  score: z.number(),
  bags: z.number(),
  totalBid: z.number().nullable(),
  tricksWon: z.number(),
});
export type Team = z.infer<typeof teamSchema>;

// Trick (the 4 cards played in a round)
export const trickSchema = z.object({
  cards: z.array(z.object({
    playerId: z.string(),
    card: cardSchema,
  })),
  leadSuit: z.enum(SUITS).nullable(),
  winnerId: z.string().nullable(),
});
export type Trick = z.infer<typeof trickSchema>;

// Game phases
export const GAME_PHASES = ["waiting", "bidding", "playing", "round_end", "game_over"] as const;
export type GamePhase = (typeof GAME_PHASES)[number];

// Game state schema
export const gameStateSchema = z.object({
  id: z.string(),
  mode: z.enum(GAME_MODES),
  timeControl: z.enum(TIME_CONTROLS),
  phase: z.enum(GAME_PHASES),
  players: z.array(playerSchema),
  teams: z.array(teamSchema),
  currentTrick: trickSchema,
  currentPlayerIndex: z.number(),
  dealerIndex: z.number(),
  roundNumber: z.number(),
  spadesBroken: z.boolean(),
  winningScore: z.number(),
  turnTimeRemaining: z.number().nullable(),
});
export type GameState = z.infer<typeof gameStateSchema>;

// Lobby/matchmaking state
export const lobbySchema = z.object({
  id: z.string(),
  mode: z.enum(GAME_MODES),
  timeControl: z.enum(TIME_CONTROLS),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    isBot: z.boolean(),
    isReady: z.boolean(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "starting", "in_game"]),
});
export type Lobby = z.infer<typeof lobbySchema>;

// User schema (for session tracking)
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  gamesPlayed: z.number(),
  gamesWon: z.number(),
});
export type User = z.infer<typeof userSchema>;

export const insertUserSchema = userSchema.omit({ id: true, gamesPlayed: true, gamesWon: true });
export type InsertUser = z.infer<typeof insertUserSchema>;

// WebSocket message types
export const WS_MESSAGE_TYPES = [
  "join_lobby",
  "leave_lobby",
  "start_game",
  "place_bid",
  "play_card",
  "game_state_update",
  "lobby_update",
  "error",
  "player_joined",
  "player_left",
  "chat_message",
] as const;
export type WSMessageType = (typeof WS_MESSAGE_TYPES)[number];

export const wsMessageSchema = z.object({
  type: z.enum(WS_MESSAGE_TYPES),
  payload: z.any(),
});
export type WSMessage = z.infer<typeof wsMessageSchema>;

// Card power rankings for each mode
export function getCardPower(card: Card, mode: GameMode, leadSuit: Suit | null): number {
  const isSpade = card.suit === "spades";
  const isLeadSuit = card.suit === leadSuit;
  
  if (mode === "ace_high") {
    // Standard Ace High: Spades trump, A is highest
    const valueOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const baseValue = valueOrder.indexOf(card.value);
    
    if (isSpade) return 100 + baseValue;
    if (isLeadSuit) return 50 + baseValue;
    return baseValue;
  } else {
    // Joker Joker Deuce Deuce mode
    // Trump power order (weakest to strongest): 3♠,4♠,...,K♠,A♠,2♦,2♠,Little Joker,Big Joker
    // Big Joker is the highest card in the game
    if (card.value === "BJ") return 200; // Big Joker (highest trump)
    if (card.value === "LJ") return 199; // Little Joker (second highest)
    
    // 2 of Spades beats 2 of Diamonds
    if (isSpade && card.value === "2") return 198; // 2♠ (third highest)
    
    // 2 of Diamonds is special trump (beats all regular spades)
    if (card.suit === "diamonds" && card.value === "2") return 197; // 2♦ (fourth highest)
    
    // Regular spades (3-A)
    if (isSpade) {
      const spadeOrder = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
      return 100 + spadeOrder.indexOf(card.value);
    }
    
    // Other suits (no 2s in hearts/clubs for this mode)
    const valueOrder = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const baseValue = valueOrder.indexOf(card.value);
    
    if (isLeadSuit) return 50 + baseValue;
    return baseValue;
  }
}

// Check if a card is a trump in the given mode
export function isTrump(card: Card, mode: GameMode): boolean {
  if (card.suit === "spades") return true;
  if (mode === "joker_joker_deuce_deuce") {
    if (card.value === "LJ" || card.value === "BJ") return true;
    if (card.suit === "diamonds" && card.value === "2") return true;
  }
  return false;
}

// Get display name for a card
export function getCardDisplayName(card: Card): string {
  if (card.value === "LJ") return "Little Joker";
  if (card.value === "BJ") return "Big Joker";
  
  const valueNames: Record<string, string> = {
    "J": "Jack",
    "Q": "Queen", 
    "K": "King",
    "A": "Ace",
  };
  
  const suitNames: Record<Suit, string> = {
    spades: "Spades",
    hearts: "Hearts",
    diamonds: "Diamonds",
    clubs: "Clubs",
  };
  
  const valueName = valueNames[card.value] || card.value;
  return `${valueName} of ${suitNames[card.suit]}`;
}
