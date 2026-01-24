import type { Card, Suit, GameMode } from "@shared/schema";

// Suit symbols
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

// Suit colors - using explicit colors since cards have white backgrounds
export const SUIT_COLORS: Record<Suit, string> = {
  spades: "text-gray-900",
  hearts: "text-red-500",
  diamonds: "text-red-500",
  clubs: "text-gray-900",
};

// Get suit symbol
export function getSuitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit];
}

// Get suit color class
export function getSuitColor(suit: Suit): string {
  return SUIT_COLORS[suit];
}

// Format card value for display
export function formatCardValue(value: string): string {
  if (value === "LJ") return "J";
  if (value === "BJ") return "J";
  return value;
}

// Check if card is a joker
export function isJoker(card: Card): boolean {
  return card.value === "LJ" || card.value === "BJ";
}

// Generate a standard 52-card deck
export function generateStandardDeck(): Card[] {
  const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
  const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        suit,
        value,
        id: `${value}-${suit}`,
      });
    }
  }
  
  return deck;
}

// Generate deck for Joker Joker Deuce Deuce mode
export function generateJJDDDeck(): Card[] {
  const deck = generateStandardDeck();
  
  // Remove 2 of hearts and 2 of clubs
  const filteredDeck = deck.filter(
    card => !(card.value === "2" && (card.suit === "hearts" || card.suit === "clubs"))
  );
  
  // Add jokers (treat them as spades for suit purposes)
  filteredDeck.push(
    { suit: "spades", value: "LJ", id: "LJ-joker" },
    { suit: "spades", value: "BJ", id: "BJ-joker" }
  );
  
  return filteredDeck;
}

// Shuffle array using Fisher-Yates
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if a card acts as a spade for following-suit purposes
// In JJDD mode: jokers (LJ, BJ) and 2♦ all count as spades
export function actsAsSpade(card: Card, mode: GameMode): boolean {
  if (card.suit === "spades") return true;
  if (mode === "joker_joker_deuce_deuce") {
    if (card.value === "LJ" || card.value === "BJ") return true;
    if (card.suit === "diamonds" && card.value === "2") return true;
  }
  return false;
}

// Check if a card is a trump in JJDD mode (for sorting purposes)
function isTrumpInJJDD(card: Card): boolean {
  if (card.suit === "spades") return true;
  if (card.value === "LJ" || card.value === "BJ") return true;
  if (card.suit === "diamonds" && card.value === "2") return true;
  return false;
}

// Sort hand by suit then value
export function sortHand(hand: Card[], mode: GameMode): Card[] {
  const suitOrder: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
  
  if (mode === "joker_joker_deuce_deuce") {
    // JJDD mode: trumps first (Big Joker, Little Joker, 2♠, 2♦, A♠...3♠), then other suits
    // Trump order from highest to lowest: BJ, LJ, 2♠, 2♦, A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3
    return [...hand].sort((a, b) => {
      const aIsTrump = isTrumpInJJDD(a);
      const bIsTrump = isTrumpInJJDD(b);
      
      // Trumps come first
      if (aIsTrump && !bIsTrump) return -1;
      if (!aIsTrump && bIsTrump) return 1;
      
      if (aIsTrump && bIsTrump) {
        // Both are trumps - sort by power (highest first)
        // Order: BJ, LJ, 2♠, 2♦, A♠, K♠, Q♠, ... 3♠
        const trumpOrder = ["BJ", "LJ", "2♠", "2♦", "A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3"];
        
        const getJJDDTrumpRank = (card: Card): number => {
          if (card.value === "BJ") return 0;
          if (card.value === "LJ") return 1;
          if (card.suit === "spades" && card.value === "2") return 2;
          if (card.suit === "diamonds" && card.value === "2") return 3;
          // Regular spades: A=4, K=5, Q=6, etc.
          const spadeValues = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3"];
          return 4 + spadeValues.indexOf(card.value);
        };
        
        return getJJDDTrumpRank(a) - getJJDDTrumpRank(b);
      }
      
      // Neither is trump - sort by suit then value
      const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      
      // Value order for non-trumps (A is high)
      const valueOrder = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3"];
      return valueOrder.indexOf(a.value) - valueOrder.indexOf(b.value);
    });
  }
  
  // Ace High mode - standard sorting
  const valueOrder = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  
  return [...hand].sort((a, b) => {
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    return valueOrder.indexOf(a.value) - valueOrder.indexOf(b.value);
  });
}

// Get point goal display name
export function getPointGoalName(pointGoal: string): string {
  switch (pointGoal) {
    case "100": return "100 pts";
    case "300": return "300 pts";
    case "500": return "500 pts";
    default: return `${pointGoal} pts`;
  }
}

// Get game mode display name
export function getGameModeName(mode: GameMode): string {
  switch (mode) {
    case "ace_high": return "Ace High";
    case "joker_joker_deuce_deuce": return "Joker Joker Deuce Deuce";
    default: return mode;
  }
}

// Get game mode description
export function getGameModeDescription(mode: GameMode): string {
  switch (mode) {
    case "ace_high":
      return "Classic Spades. Ace is the highest card in each suit. Standard 52-card deck.";
    case "joker_joker_deuce_deuce":
      return "Two Jokers added, 2♥ and 2♣ removed. Trump order: 3-A, 2♦, 2♠, Little Joker, Big Joker.";
    default:
      return "";
  }
}

// Calculate team score for a round
export function calculateRoundScore(bid: number, tricks: number, currentBags: number): { points: number; bags: number } {
  if (bid === 0) {
    // Nil bid
    return tricks === 0 
      ? { points: 100, bags: 0 }
      : { points: -100, bags: tricks };
  }
  
  if (tricks >= bid) {
    const overtricks = tricks - bid;
    const newBags = currentBags + overtricks;
    const bagPenalty = Math.floor(newBags / 10) * 100;
    return {
      points: bid * 10 + overtricks - bagPenalty,
      bags: newBags % 10,
    };
  }
  
  // Didn't make bid
  return { points: -bid * 10, bags: currentBags };
}
