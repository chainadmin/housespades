import type { GameState, Card, Suit, GameMode } from "@shared/schema";
import { getCardPower, isTrump } from "@shared/schema";
import { GameEngine } from "./gameEngine";

export type BotDifficulty = 'easy' | 'easy_plus' | 'medium' | 'medium_plus' | 'hard' | 'hard_plus' | 'expert' | 'expert_plus';

function difficultyLevel(d: BotDifficulty): number {
  const levels: Record<BotDifficulty, number> = {
    easy: 0, easy_plus: 1, medium: 2, medium_plus: 3,
    hard: 4, hard_plus: 5, expert: 6, expert_plus: 7,
  };
  return levels[d];
}

export function getDifficultyFromRating(rating: number): BotDifficulty {
  if (rating < 900) return 'easy';
  if (rating < 1050) return 'easy_plus';
  if (rating < 1200) return 'medium';
  if (rating < 1350) return 'medium_plus';
  if (rating < 1500) return 'hard';
  if (rating < 1650) return 'hard_plus';
  if (rating < 1800) return 'expert';
  return 'expert_plus';
}

export class BotAI {
  private static playedCards: Map<string, Card[]> = new Map();

  static resetTracking(gameId: string) {
    this.playedCards.set(gameId, []);
  }

  static trackCard(gameId: string, card: Card) {
    const played = this.playedCards.get(gameId) || [];
    played.push(card);
    this.playedCards.set(gameId, played);
  }

  static getPlayedCards(gameId: string): Card[] {
    return this.playedCards.get(gameId) || [];
  }

  static cleanupGame(gameId: string) {
    this.playedCards.delete(gameId);
  }

  static calculateBid(hand: Card[], mode: string, difficulty: BotDifficulty = 'medium'): number {
    const level = difficultyLevel(difficulty);
    let bid = 0;

    const suitCounts: Record<string, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
    const suitHighCards: Record<string, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };

    hand.forEach((card) => {
      if (card.suit && card.suit in suitCounts) {
        suitCounts[card.suit]++;
      }

      if (card.value === "A") {
        bid += 1;
        if (card.suit && card.suit in suitHighCards) suitHighCards[card.suit]++;
      }
      if (card.value === "K") {
        bid += level >= 4 ? 0.7 : 0.5;
        if (card.suit && card.suit in suitHighCards) suitHighCards[card.suit]++;
      }
      if (card.value === "Q") {
        bid += level >= 4 ? 0.35 : 0.25;
        if (card.suit && card.suit in suitHighCards) suitHighCards[card.suit]++;
      }

      if (card.suit === "spades") bid += 0.5;

      if (card.value === "BJ") bid += 2;
      if (card.value === "LJ") bid += 1.5;

      if (card.suit === "spades" && card.value === "2" && mode === "joker_joker_deuce_deuce") {
        bid += 1.5;
      }
    });

    const spadeCount = hand.filter(
      (c) => c.suit === "spades" || c.value === "LJ" || c.value === "BJ"
    ).length;
    bid += Math.max(0, spadeCount - 2) * 0.5;

    if (level >= 3) {
      const voidSuits = (["hearts", "diamonds", "clubs"] as Suit[]).filter(s => suitCounts[s] === 0);
      bid += voidSuits.length * 0.5;

      const shortSuits = (["hearts", "diamonds", "clubs"] as Suit[]).filter(s => suitCounts[s] === 1);
      bid += shortSuits.length * 0.25;
    }

    if (level >= 4) {
      for (const suit of ["hearts", "diamonds", "clubs"] as Suit[]) {
        if (suitHighCards[suit] >= 2 && suitCounts[suit] >= 3) {
          bid += 0.25;
        }
      }
    }

    if (level >= 6) {
      if (spadeCount >= 4) bid += 0.5;
      for (const suit of ["hearts", "diamonds", "clubs"] as Suit[]) {
        if (suitCounts[suit] >= 4 && suitHighCards[suit] >= 1) {
          bid += 0.3;
        }
      }
    }

    const randomFactors: Record<number, number> = {
      0: 2.0, 1: 1.5, 2: 1.0, 3: 0.7, 4: 0.5, 5: 0.3, 6: 0.2, 7: 0.1,
    };
    const randomRange = randomFactors[level] ?? 1.0;
    bid += (Math.random() - 0.5) * randomRange;

    const maxBid = level >= 6 ? 8 : level >= 4 ? 7 : 6;
    return Math.max(1, Math.min(maxBid, Math.round(bid)));
  }

  static selectCard(state: GameState, botIndex: number, difficulty: BotDifficulty = 'medium'): Card {
    const level = difficultyLevel(difficulty);
    const bot = state.players[botIndex];
    const hand = bot.hand;
    const playableCards = GameEngine.getPlayableCards(state, botIndex);

    if (playableCards.length === 1) {
      return playableCards[0];
    }

    if (level <= 1 && Math.random() < (level === 0 ? 0.35 : 0.25)) {
      return playableCards[Math.floor(Math.random() * playableCards.length)];
    }

    const trick = state.currentTrick;
    const leadSuit = trick.leadSuit;
    const isLeading = !leadSuit;
    const partner = state.players[(botIndex + 2) % 4];
    const partnerCard = trick.cards.find((tc) => tc.playerId === partner.id);

    const sorted = [...playableCards].sort(
      (a, b) => getCardPower(a, state.mode, leadSuit) - getCardPower(b, state.mode, leadSuit)
    );

    const tricksBid = bot.bid || 0;
    const tricksWon = bot.tricks || 0;
    const tricksNeeded = Math.max(0, tricksBid - tricksWon);
    const tricksRemaining = hand.length;

    if (isLeading) {
      return this.selectLeadCard(state, botIndex, sorted, playableCards, hand, level, tricksNeeded, tricksRemaining);
    }

    return this.selectFollowCard(state, botIndex, sorted, playableCards, hand, level, trick, leadSuit, partnerCard, tricksNeeded, tricksRemaining);
  }

  private static selectLeadCard(
    state: GameState, botIndex: number, sorted: Card[], playableCards: Card[],
    hand: Card[], level: number, tricksNeeded: number, tricksRemaining: number
  ): Card {
    const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
    hand.forEach((c) => {
      if (c.suit in suitCounts) suitCounts[c.suit]++;
    });

    if (level >= 5) {
      const played = this.getPlayedCards(state.id);
      const trumpPlayed = played.filter(c => isTrump(c, state.mode)).length;
      const totalTrump = state.mode === 'joker_joker_deuce_deuce' ? 15 : 13;
      const myTrump = hand.filter(c => isTrump(c, state.mode));

      if (myTrump.length >= 3 && trumpPlayed >= totalTrump * 0.4 && state.spadesPlayed) {
        const highTrump = myTrump.sort((a, b) =>
          getCardPower(b, state.mode, null) - getCardPower(a, state.mode, null)
        );
        if (highTrump.length > 0) return highTrump[0];
      }
    }

    if (level >= 4 && tricksNeeded > 0) {
      for (const suit of ["hearts", "diamonds", "clubs"] as Suit[]) {
        const suitCards = playableCards.filter(c => c.suit === suit);
        const highCards = suitCards.filter(c => ["A", "K"].includes(c.value));
        if (highCards.length > 0 && suitCards.length >= 2) {
          const cardsByPower = highCards.sort((a, b) =>
            getCardPower(b, state.mode, suit) - getCardPower(a, state.mode, suit)
          );
          return cardsByPower[0];
        }
      }
    }

    if (level >= 4) {
      const shortSuits = (["hearts", "diamonds", "clubs"] as Suit[]).filter(
        s => suitCounts[s] === 1 || suitCounts[s] === 2
      );
      if (shortSuits.length > 0) {
        const shortestSuit = shortSuits.reduce((a, b) => suitCounts[a] <= suitCounts[b] ? a : b);
        const suitCards = playableCards.filter(c => c.suit === shortestSuit);
        if (suitCards.length > 0) {
          const lowCards = suitCards.filter(c => !["A", "K", "Q"].includes(c.value));
          if (lowCards.length > 0) return lowCards[0];
          return suitCards[0];
        }
      }
    }

    const nonTrumpSuits = (["hearts", "diamonds", "clubs"] as Suit[]).filter(
      (s) => suitCounts[s] > 0
    );

    if (nonTrumpSuits.length > 0) {
      const longestSuit = nonTrumpSuits.reduce((a, b) =>
        suitCounts[a] >= suitCounts[b] ? a : b
      );
      const suitCards = playableCards.filter((c) => c.suit === longestSuit);
      if (suitCards.length > 0) {
        const highCards = suitCards.filter((c) =>
          ["A", "K", "Q"].includes(c.value)
        );
        if (highCards.length > 0) {
          return highCards[0];
        }
        return suitCards[Math.floor(suitCards.length / 2)];
      }
    }

    return sorted[Math.floor(sorted.length / 2)];
  }

  private static selectFollowCard(
    state: GameState, botIndex: number, sorted: Card[], playableCards: Card[],
    hand: Card[], level: number, trick: GameState['currentTrick'],
    leadSuit: Suit | null, partnerCard: { card: Card; playerId: string } | undefined,
    tricksNeeded: number, tricksRemaining: number
  ): Card {
    const currentWinningPower = trick.cards.reduce((max, { card }) => {
      return Math.max(max, getCardPower(card, state.mode, leadSuit));
    }, 0);

    let partnerIsWinning = false;
    if (partnerCard) {
      const partnerPower = getCardPower(partnerCard.card, state.mode, leadSuit);
      partnerIsWinning = partnerPower >= currentWinningPower;
    }

    const winningCards = sorted.filter(
      (c) => getCardPower(c, state.mode, leadSuit) > currentWinningPower
    );

    if (level >= 2 && partnerIsWinning && trick.cards.length >= 2) {
      return sorted[0];
    } else if (level < 2 && partnerIsWinning && trick.cards.length === 3) {
      return sorted[0];
    }

    if (level >= 6 && tricksNeeded <= 0 && tricksRemaining > 2) {
      return sorted[0];
    }

    if (winningCards.length > 0) {
      if (level >= 5) {
        const isLastPlayer = trick.cards.length === 3;
        if (isLastPlayer) {
          return winningCards[0];
        }

        const followSuitWinners = winningCards.filter(c => c.suit === leadSuit);
        const trumpWinners = winningCards.filter(c => isTrump(c, state.mode) && c.suit !== leadSuit);

        if (followSuitWinners.length > 0) {
          if (level >= 7 && tricksNeeded <= 1 && followSuitWinners.length > 1) {
            return followSuitWinners[0];
          }
          const highFollowWinners = followSuitWinners.filter(c => ["A", "K"].includes(c.value));
          if (highFollowWinners.length > 0 && tricksNeeded > 0) {
            return highFollowWinners[highFollowWinners.length - 1];
          }
          return followSuitWinners[0];
        }

        if (trumpWinners.length > 0) {
          if (level >= 7 && tricksNeeded <= 0) {
            return sorted[0];
          }
          return trumpWinners[0];
        }
      }

      return winningCards[0];
    }

    if (level >= 3) {
      const offSuitCards = sorted.filter(c => !isTrump(c, state.mode));
      if (offSuitCards.length > 0) {
        return offSuitCards[0];
      }
    }

    return sorted[0];
  }

  static shouldBreakSpades(hand: Card[], mode: string, difficulty: BotDifficulty = 'medium'): boolean {
    const level = difficultyLevel(difficulty);
    const spadeCount = hand.filter(
      (c) => c.suit === "spades" || c.value === "LJ" || c.value === "BJ"
    ).length;

    if (level >= 6) return spadeCount >= 4;
    if (level >= 4) return spadeCount >= 4;
    return spadeCount >= 5;
  }
}
