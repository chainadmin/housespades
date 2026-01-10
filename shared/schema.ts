import { z } from "zod";
import { pgTable, text, integer, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Database tables for PostgreSQL (using Drizzle ORM)

// Users table with authentication and ranking
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rating: integer("rating").notNull().default(1000),
  gamesPlayed: integer("games_played").notNull().default(0),
  gamesWon: integer("games_won").notNull().default(0),
  removeAds: boolean("remove_ads").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  rating: true,
  gamesPlayed: true,
  gamesWon: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type DbUser = typeof users.$inferSelect;

// Password reset tokens
export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
});

// Match history for tracking games
export const matchHistory = pgTable("match_history", {
  id: serial("id").primaryKey(),
  gameMode: text("game_mode").notNull(),
  pointGoal: text("point_goal").notNull(),
  winningTeamScore: integer("winning_team_score").notNull(),
  losingTeamScore: integer("losing_team_score").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

// Player participation in matches
export const matchPlayers = pgTable("match_players", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matchHistory.id),
  userId: integer("user_id").references(() => users.id),
  isBot: boolean("is_bot").notNull().default(false),
  teamIndex: integer("team_index").notNull(),
  ratingChange: integer("rating_change").notNull().default(0),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  matchPlayers: many(matchPlayers),
  passwordResets: many(passwordResets),
}));

export const matchHistoryRelations = relations(matchHistory, ({ many }) => ({
  players: many(matchPlayers),
}));

export const matchPlayersRelations = relations(matchPlayers, ({ one }) => ({
  match: one(matchHistory, {
    fields: [matchPlayers.matchId],
    references: [matchHistory.id],
  }),
  user: one(users, {
    fields: [matchPlayers.userId],
    references: [users.id],
  }),
}));

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

// Point goals for winning
export const POINT_GOALS = ["100", "300", "500"] as const;
export type PointGoal = (typeof POINT_GOALS)[number];

export const POINT_GOAL_VALUES: Record<PointGoal, number> = {
  "100": 100,
  "300": 300,
  "500": 500,
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
  pointGoal: z.enum(POINT_GOALS),
  phase: z.enum(GAME_PHASES),
  players: z.array(playerSchema),
  teams: z.array(teamSchema),
  currentTrick: trickSchema,
  currentPlayerIndex: z.number(),
  dealerIndex: z.number(),
  roundNumber: z.number(),
  spadesBroken: z.boolean(),
  winningScore: z.number(),
});
export type GameState = z.infer<typeof gameStateSchema>;

// Lobby/matchmaking state
export const lobbySchema = z.object({
  id: z.string(),
  mode: z.enum(GAME_MODES),
  pointGoal: z.enum(POINT_GOALS),
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

// User schema (for API responses - excludes password)
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  rating: z.number(),
  gamesPlayed: z.number(),
  gamesWon: z.number(),
  removeAds: z.boolean(),
});
export type User = z.infer<typeof userSchema>;

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
