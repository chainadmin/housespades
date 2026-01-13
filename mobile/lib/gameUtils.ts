// Re-export shared game utilities from the centralized schema
// This ensures mobile uses the exact same game logic as the server

// Note: Mobile can't directly import from @shared/schema, so we copy the logic here
// but keep it in sync with the server version

import { Card, Suit, GameMode } from '@/constants/game';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const STANDARD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Generate a standard 52-card deck
export function generateStandardDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const value of STANDARD_VALUES) {
      deck.push({
        id: `${value}-${suit}`,
        suit,
        value,
        numericValue: STANDARD_VALUES.indexOf(value) + 2,
      });
    }
  }
  return deck;
}

// Generate deck for Joker Joker Deuce Deuce mode
// Removes 2♥ and 2♣, adds jokers (as spades suit for following-suit purposes)
export function generateJJDDDeck(): Card[] {
  const deck = generateStandardDeck();
  
  // Remove 2 of hearts and 2 of clubs
  const filteredDeck = deck.filter(
    card => !(card.value === '2' && (card.suit === 'hearts' || card.suit === 'clubs'))
  );
  
  // Add jokers with suit "spades" so they follow spade-leading rules
  // This is the KEY difference - jokers are spades, not a separate suit!
  filteredDeck.push(
    { id: 'LJ-joker', suit: 'spades', value: 'LJ', numericValue: 16 },
    { id: 'BJ-joker', suit: 'spades', value: 'BJ', numericValue: 17 }
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

// Check if a card is a trump in JJDD mode (for sorting purposes)
// Note: Handles both joker suit formats for compatibility
function isTrumpInJJDD(card: Card): boolean {
  if (card.suit === 'spades') return true;
  if (card.suit === 'joker') return true;
  if (card.value === 'LJ' || card.value === 'BJ') return true;
  if (card.suit === 'diamonds' && card.value === '2') return true;
  return false;
}

// Sort hand by suit then value
export function sortHand(hand: Card[], mode: GameMode): Card[] {
  const suitOrder: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
  
  if (mode === 'joker_joker_deuce_deuce') {
    // JJDD mode: trumps first (Big Joker, Little Joker, 2♠, 2♦, A♠...3♠), then other suits
    return [...hand].sort((a, b) => {
      const aIsTrump = isTrumpInJJDD(a);
      const bIsTrump = isTrumpInJJDD(b);
      
      // Trumps come first
      if (aIsTrump && !bIsTrump) return -1;
      if (!aIsTrump && bIsTrump) return 1;
      
      if (aIsTrump && bIsTrump) {
        // Both are trumps - sort by power (highest first)
        const getJJDDTrumpRank = (card: Card): number => {
          if (card.value === 'BJ') return 0;
          if (card.value === 'LJ') return 1;
          if (card.suit === 'spades' && card.value === '2') return 2;
          if (card.suit === 'diamonds' && card.value === '2') return 3;
          // Regular spades: A=4, K=5, Q=6, etc.
          const spadeValues = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'];
          return 4 + spadeValues.indexOf(card.value);
        };
        
        return getJJDDTrumpRank(a) - getJJDDTrumpRank(b);
      }
      
      // Neither is trump - sort by suit then value
      const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      
      // Value order for non-trumps (A is high)
      const valueOrder = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'];
      return valueOrder.indexOf(a.value) - valueOrder.indexOf(b.value);
    });
  }
  
  // Ace High mode - standard sorting
  const valueOrder = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  return [...hand].sort((a, b) => {
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    return valueOrder.indexOf(a.value) - valueOrder.indexOf(b.value);
  });
}

// Check if a card acts as a spade for following-suit purposes
// In JJDD mode: jokers (LJ, BJ) and 2♦ all count as spades
// Note: Handles both joker suit formats (suit: 'spades' or suit: 'joker') for compatibility
export function actsAsSpade(card: Card, mode: GameMode): boolean {
  if (card.suit === 'spades') return true;
  // Handle legacy joker suit format from mobile
  if (card.suit === 'joker') return true;
  if (mode === 'joker_joker_deuce_deuce') {
    if (card.value === 'LJ' || card.value === 'BJ') return true;
    if (card.suit === 'diamonds' && card.value === '2') return true;
  }
  return false;
}

// Check if a card is a trump in the given mode
// Note: Handles both joker suit formats for compatibility
export function isTrump(card: Card, mode: GameMode): boolean {
  if (card.suit === 'spades') return true;
  if (card.suit === 'joker') return true;
  if (mode === 'joker_joker_deuce_deuce') {
    if (card.value === 'LJ' || card.value === 'BJ') return true;
    if (card.suit === 'diamonds' && card.value === '2') return true;
  }
  return false;
}

// Get playable cards for a player given the current game state
export function getPlayableCards(
  hand: Card[],
  leadSuit: Suit | null,
  spadesBroken: boolean,
  mode: GameMode
): Card[] {
  if (!leadSuit) {
    // Leading - can play anything if spades broken, or non-trumps otherwise
    if (!spadesBroken) {
      // Filter out all cards that act as spades (including 2♦ in JJDD mode)
      const nonTrumps = hand.filter((c) => !actsAsSpade(c, mode));
      if (nonTrumps.length > 0) return nonTrumps;
    }
    return hand;
  }

  // If spades lead, can play any trump (spades, 2♦, jokers in JJDD)
  if (leadSuit === 'spades') {
    const trumpCards = hand.filter((c) => actsAsSpade(c, mode));
    if (trumpCards.length > 0) return trumpCards;
    // No trumps, can play anything
    return hand;
  }

  // Non-spade suit leads - must follow suit if possible (2♦ doesn't count as diamonds!)
  const suitCards = hand.filter((c) => {
    // In JJDD mode, 2♦ acts as a spade, not a diamond
    if (mode === 'joker_joker_deuce_deuce' && c.suit === 'diamonds' && c.value === '2') {
      return false;
    }
    return c.suit === leadSuit;
  });
  if (suitCards.length > 0) return suitCards;

  // Can't follow suit, can play anything
  return hand;
}

// Card power rankings for each mode
// Note: Handles both joker suit formats for compatibility
export function getCardPower(card: Card, mode: GameMode, leadSuit: Suit | null): number {
  const isSpade = card.suit === 'spades' || card.suit === 'joker';
  const isLeadSuit = card.suit === leadSuit;
  
  if (mode === 'ace_high') {
    // Standard Ace High: Spades trump, A is highest
    const valueOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const baseValue = valueOrder.indexOf(card.value);
    
    if (isSpade) return 100 + baseValue;
    if (isLeadSuit) return 50 + baseValue;
    return baseValue;
  } else {
    // Joker Joker Deuce Deuce mode
    // Trump power order (weakest to strongest): 3♠,4♠,...,K♠,A♠,2♦,2♠,Little Joker,Big Joker
    if (card.value === 'BJ') return 200; // Big Joker (highest trump)
    if (card.value === 'LJ') return 199; // Little Joker (second highest)
    
    // 2 of Spades beats 2 of Diamonds
    if (card.suit === 'spades' && card.value === '2') return 198; // 2♠ (third highest)
    
    // 2 of Diamonds is special trump (beats all regular spades)
    if (card.suit === 'diamonds' && card.value === '2') return 197; // 2♦ (fourth highest)
    
    // Regular spades (3-A) and jokers with suit 'joker'
    if (isSpade) {
      const spadeOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
      return 100 + spadeOrder.indexOf(card.value);
    }
    
    // Other suits (no 2s in hearts/clubs for this mode)
    const valueOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const baseValue = valueOrder.indexOf(card.value);
    
    if (isLeadSuit) return 50 + baseValue;
    return baseValue;
  }
}

export function getCardColor(suit: Suit): 'red' | 'black' {
  if (suit === 'hearts' || suit === 'diamonds') return 'red';
  return 'black';
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spades': return '♠';
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'joker': return '★';
    default: return '';
  }
}
