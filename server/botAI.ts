import type { GameState, Card, Suit } from "@shared/schema";
import { getCardPower, isTrump } from "@shared/schema";
import { GameEngine } from "./gameEngine";

export class BotAI {
  // Calculate bid based on hand strength
  static calculateBid(hand: Card[], mode: string): number {
    let bid = 0;

    hand.forEach((card) => {
      // High cards
      if (card.value === "A") bid += 1;
      if (card.value === "K") bid += 0.5;
      if (card.value === "Q") bid += 0.25;
      
      // Spades are trump
      if (card.suit === "spades") bid += 0.5;
      
      // Jokers in JJDD mode
      if (card.value === "BJ") bid += 2;
      if (card.value === "LJ") bid += 1.5;
      
      // 2 of spades in JJDD mode
      if (card.suit === "spades" && card.value === "2" && mode === "joker_joker_deuce_deuce") {
        bid += 1.5;
      }
    });

    // Count spades
    const spadeCount = hand.filter(
      (c) => c.suit === "spades" || c.value === "LJ" || c.value === "BJ"
    ).length;
    bid += Math.max(0, spadeCount - 2) * 0.5;

    // Add some randomness
    bid += (Math.random() - 0.5);

    return Math.max(1, Math.min(6, Math.round(bid)));
  }

  // Select the best card to play
  static selectCard(state: GameState, botIndex: number): Card {
    const bot = state.players[botIndex];
    const hand = bot.hand;
    const playableCards = GameEngine.getPlayableCards(state, botIndex);
    
    if (playableCards.length === 1) {
      return playableCards[0];
    }

    const trick = state.currentTrick;
    const leadSuit = trick.leadSuit;
    const isLeading = !leadSuit;
    const partner = state.players[(botIndex + 2) % 4];
    const partnerCard = trick.cards.find((tc) => tc.playerId === partner.id);

    // Sort by power
    const sorted = [...playableCards].sort(
      (a, b) => getCardPower(a, state.mode, leadSuit) - getCardPower(b, state.mode, leadSuit)
    );

    // Leading strategy
    if (isLeading) {
      // If we have a lot of a suit, lead with it
      const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
      hand.forEach((c) => {
        if (c.suit in suitCounts) suitCounts[c.suit]++;
      });

      // Lead with longest non-trump suit
      const nonTrumpSuits = (["hearts", "diamonds", "clubs"] as Suit[]).filter(
        (s) => suitCounts[s] > 0
      );
      
      if (nonTrumpSuits.length > 0) {
        const longestSuit = nonTrumpSuits.reduce((a, b) => 
          suitCounts[a] >= suitCounts[b] ? a : b
        );
        const suitCards = playableCards.filter((c) => c.suit === longestSuit);
        if (suitCards.length > 0) {
          // Lead with highest if we have good cards, otherwise middle
          const highCards = suitCards.filter((c) => 
            ["A", "K", "Q"].includes(c.value)
          );
          if (highCards.length > 0) {
            return highCards[0];
          }
          return suitCards[Math.floor(suitCards.length / 2)];
        }
      }

      // Fall back to mid-range card
      return sorted[Math.floor(sorted.length / 2)];
    }

    // Following strategy
    const currentWinningPower = trick.cards.reduce((max, { card }) => {
      return Math.max(max, getCardPower(card, state.mode, leadSuit));
    }, 0);

    // Check if partner is winning
    let partnerIsWinning = false;
    if (partnerCard) {
      const partnerPower = getCardPower(partnerCard.card, state.mode, leadSuit);
      partnerIsWinning = partnerPower >= currentWinningPower;
    }

    // Find cards that can win
    const winningCards = sorted.filter(
      (c) => getCardPower(c, state.mode, leadSuit) > currentWinningPower
    );

    // If partner is winning with a good card, play low
    if (partnerIsWinning && trick.cards.length === 3) {
      return sorted[0];
    }

    // Try to win if we can
    if (winningCards.length > 0) {
      // Play lowest winning card
      return winningCards[0];
    }

    // Can't win, play lowest
    return sorted[0];
  }

  // Decide if bot should break spades
  static shouldBreakSpades(hand: Card[], mode: string): boolean {
    // Break spades if we have many of them
    const spadeCount = hand.filter(
      (c) => c.suit === "spades" || c.value === "LJ" || c.value === "BJ"
    ).length;
    
    return spadeCount >= 5;
  }
}
