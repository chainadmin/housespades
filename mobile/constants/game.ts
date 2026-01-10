export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';
export type GameMode = 'ace_high' | 'joker_joker_deuce_deuce';
export type PointGoal = '100' | '300' | '500';
export type Position = 'north' | 'south' | 'east' | 'west';

export interface Card {
  id: string;
  suit: Suit;
  value: string;
  numericValue: number;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  position: Position;
  hand: Card[];
  bid: number | null;
  tricks: number;
  isReady: boolean;
  rating?: number;
}

export interface Team {
  id: number;
  name: string;
  players: string[];
  score: number;
  bags: number;
  tricksWon: number;
  totalBid: number | null;
}

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface Trick {
  cards: PlayedCard[];
  leadSuit: Suit | null;
  winnerId: string | null;
}

export interface GameState {
  id: string;
  mode: GameMode;
  phase: 'waiting' | 'bidding' | 'playing' | 'round_end' | 'game_over';
  players: Player[];
  teams: Team[];
  currentPlayerIndex: number;
  dealerIndex: number;
  currentTrick: Trick;
  spadesBroken: boolean;
  roundNumber: number;
  winningScore: number;
}

export const POINT_GOAL_VALUES: Record<PointGoal, number> = {
  '100': 100,
  '300': 300,
  '500': 500,
};

export const BOT_NAMES = ['SpadeMaster', 'TrickTaker', 'CardShark', 'AceHunter'];
export const POSITIONS: Position[] = ['south', 'west', 'north', 'east'];
