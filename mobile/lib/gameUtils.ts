import { Card, Suit, GameMode } from '@/constants/game';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function generateStandardDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;

  for (const suit of SUITS) {
    for (let i = 0; i < VALUES.length; i++) {
      deck.push({
        id: `card-${id++}`,
        suit,
        value: VALUES[i],
        numericValue: i + 2,
      });
    }
  }

  return deck;
}

export function generateJJDDDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;

  for (const suit of SUITS) {
    const startIndex = (suit === 'hearts' || suit === 'clubs') ? 1 : 0;
    for (let i = startIndex; i < VALUES.length; i++) {
      deck.push({
        id: `card-${id++}`,
        suit,
        value: VALUES[i],
        numericValue: i + 2,
      });
    }
  }

  deck.push({
    id: `card-${id++}`,
    suit: 'joker',
    value: 'LJ',
    numericValue: 16,
  });

  deck.push({
    id: `card-${id++}`,
    suit: 'joker',
    value: 'BJ',
    numericValue: 17,
  });

  return deck;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function sortHand(hand: Card[], mode: GameMode): Card[] {
  const suitOrder: Record<Suit, number> = {
    spades: 0,
    hearts: 1,
    diamonds: 2,
    clubs: 3,
    joker: -1,
  };

  return [...hand].sort((a, b) => {
    if (a.suit === 'joker' && b.suit === 'joker') {
      return b.numericValue - a.numericValue;
    }
    if (a.suit === 'joker') return -1;
    if (b.suit === 'joker') return 1;

    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return b.numericValue - a.numericValue;
  });
}

export function isTrump(card: Card, mode: GameMode): boolean {
  if (card.suit === 'joker') return true;
  if (card.suit === 'spades') return true;
  if (mode === 'joker_joker_deuce_deuce' && card.suit === 'diamonds' && card.value === '2') {
    return true;
  }
  return false;
}

export function getCardPower(card: Card, mode: GameMode, leadSuit: Suit | null): number {
  if (card.suit === 'joker') {
    return card.value === 'BJ' ? 1000 : 999;
  }

  if (mode === 'joker_joker_deuce_deuce') {
    if (card.suit === 'spades' && card.value === '2') return 998;
    if (card.suit === 'diamonds' && card.value === '2') return 997;
  }

  let power = card.numericValue;

  if (card.suit === 'spades') {
    power += 100;
  } else if (leadSuit && card.suit === leadSuit) {
    power += 50;
  }

  return power;
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
