import type { 
  GameState, 
  Card, 
  Player, 
  Team, 
  Trick, 
  GameMode, 
  PointGoal, 
  Position,
  Suit 
} from "@shared/schema";
import { getCardPower, isTrump, POINT_GOAL_VALUES } from "@shared/schema";
import { randomUUID } from "crypto";

const POSITIONS: Position[] = ["south", "west", "north", "east"];

// Generate a standard 52-card deck
function generateStandardDeck(): Card[] {
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
function generateJJDDDeck(): Card[] {
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
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if a card is a trump in JJDD mode (for sorting purposes)
function isTrumpInJJDD(card: Card): boolean {
  if (card.suit === "spades") return true;
  if (card.value === "LJ" || card.value === "BJ") return true;
  if (card.suit === "diamonds" && card.value === "2") return true;
  return false;
}

// Sort hand by suit then value
function sortHand(hand: Card[], mode: GameMode): Card[] {
  const suitOrder: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
  
  if (mode === "joker_joker_deuce_deuce") {
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

export class GameEngine {
  // Create a new game
  static createGame(
    players: { id: string; name: string; isBot: boolean; userId?: number }[],
    mode: GameMode,
    pointGoal: PointGoal
  ): GameState {
    if (players.length !== 4) {
      throw new Error("Spades requires exactly 4 players");
    }

    const deck = mode === "ace_high" ? generateStandardDeck() : generateJJDDDeck();
    const shuffledDeck = shuffleArray(deck);

    const gamePlayers: Player[] = players.map((p, index) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      position: POSITIONS[index],
      hand: sortHand(shuffledDeck.slice(index * 13, (index + 1) * 13), mode),
      bid: null,
      tricks: 0,
      isReady: true,
      userId: p.userId,
    }));

    const teams: Team[] = [
      {
        id: "team-1",
        players: [gamePlayers[0].id, gamePlayers[2].id],
        score: 0,
        bags: 0,
        totalBid: null,
        tricksWon: 0,
      },
      {
        id: "team-2",
        players: [gamePlayers[1].id, gamePlayers[3].id],
        score: 0,
        bags: 0,
        totalBid: null,
        tricksWon: 0,
      },
    ];

    return {
      id: randomUUID(),
      mode,
      pointGoal,
      phase: "bidding",
      players: gamePlayers,
      teams,
      currentTrick: {
        cards: [],
        leadSuit: null,
        winnerId: null,
      },
      currentPlayerIndex: 0,
      dealerIndex: 0,
      roundNumber: 1,
      spadesBroken: false,
      winningScore: POINT_GOAL_VALUES[pointGoal],
    };
  }

  // Helper to check if a card acts as a spade (for play restrictions)
  static actsAsSpade(card: Card, mode: GameMode): boolean {
    if (card.suit === "spades") return true;
    if (mode === "joker_joker_deuce_deuce") {
      // In JJDD mode, 2♦, jokers all act as spades for play restrictions
      if (card.value === "LJ" || card.value === "BJ") return true;
      if (card.suit === "diamonds" && card.value === "2") return true;
    }
    return false;
  }

  // Get playable cards for a player
  static getPlayableCards(state: GameState, playerIndex: number): Card[] {
    const player = state.players[playerIndex];
    if (!player) return [];

    const hand = player.hand;
    const leadSuit = state.currentTrick.leadSuit;

    if (!leadSuit) {
      // Leading - can play anything if spades broken, or non-trumps otherwise
      if (!state.spadesBroken) {
        // Filter out all cards that act as spades (including 2♦ in JJDD mode)
        const nonTrumps = hand.filter((c) => !this.actsAsSpade(c, state.mode));
        if (nonTrumps.length > 0) return nonTrumps;
      }
      return hand;
    }

    // If spades lead, can play any trump (spades, 2♦, jokers in JJDD)
    if (leadSuit === "spades") {
      const trumpCards = hand.filter((c) => this.actsAsSpade(c, state.mode));
      if (trumpCards.length > 0) return trumpCards;
      // No trumps, can play anything
      return hand;
    }

    // Non-spade suit leads - must follow suit if possible (2♦ doesn't count as diamonds!)
    const suitCards = hand.filter((c) => {
      // In JJDD mode, 2♦ acts as a spade, not a diamond
      if (state.mode === "joker_joker_deuce_deuce" && c.suit === "diamonds" && c.value === "2") {
        return false;
      }
      return c.suit === leadSuit;
    });
    if (suitCards.length > 0) return suitCards;

    // Can't follow suit, can play anything
    return hand;
  }

  // Process a bid
  static placeBid(state: GameState, playerId: string, bid: number): GameState {
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error("Player not found");
    if (state.phase !== "bidding") throw new Error("Not in bidding phase");
    if (playerIndex !== state.currentPlayerIndex) throw new Error("Not your turn");

    const newPlayers = state.players.map((p, i) =>
      i === playerIndex ? { ...p, bid } : p
    );

    const allBid = newPlayers.every((p) => p.bid !== null);

    let newTeams = state.teams;
    let newPhase: "waiting" | "bidding" | "playing" | "round_end" | "game_over" = state.phase;

    if (allBid) {
      newTeams = state.teams.map((team) => {
        const teamBid = team.players.reduce((sum, pid) => {
          const player = newPlayers.find((p) => p.id === pid);
          return sum + (player?.bid || 0);
        }, 0);
        return { ...team, totalBid: teamBid };
      });
      newPhase = "playing";
    }

    return {
      ...state,
      players: newPlayers,
      teams: newTeams,
      phase: newPhase,
      currentPlayerIndex: allBid ? 0 : (state.currentPlayerIndex + 1) % 4,
    };
  }

  // Process a card play
  static playCard(state: GameState, playerId: string, cardId: string): GameState {
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error("Player not found");
    if (state.phase !== "playing") throw new Error("Not in playing phase");
    if (playerIndex !== state.currentPlayerIndex) throw new Error("Not your turn");

    const player = state.players[playerIndex];
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) throw new Error("Card not in hand");

    const playableCards = this.getPlayableCards(state, playerIndex);
    if (!playableCards.some((c) => c.id === cardId)) {
      throw new Error("Card is not playable");
    }

    // Remove card from hand
    const newPlayers = state.players.map((p, i) => {
      if (i === playerIndex) {
        return {
          ...p,
          hand: p.hand.filter((c) => c.id !== cardId),
        };
      }
      return p;
    });

    // Add card to trick
    const newTrickCards = [
      ...state.currentTrick.cards,
      { playerId, card },
    ];

    const leadSuit = state.currentTrick.leadSuit || card.suit;

    // Check if spades broken
    let spadesBroken = state.spadesBroken;
    if (isTrump(card, state.mode)) {
      spadesBroken = true;
    }

    // Trick complete?
    if (newTrickCards.length === 4) {
      return this.completeTrick(
        state,
        newPlayers,
        newTrickCards,
        leadSuit,
        spadesBroken
      );
    }

    // Not complete, next player
    return {
      ...state,
      players: newPlayers,
      currentTrick: { cards: newTrickCards, leadSuit, winnerId: null },
      currentPlayerIndex: (state.currentPlayerIndex + 1) % 4,
      spadesBroken,
    };
  }

  // Complete a trick and determine winner
  private static completeTrick(
    state: GameState,
    newPlayers: Player[],
    trickCards: { playerId: string; card: Card }[],
    leadSuit: Suit,
    spadesBroken: boolean
  ): GameState {
    // Determine winner
    let winningIndex = 0;
    let highestPower = 0;

    trickCards.forEach(({ card }, index) => {
      const power = getCardPower(card, state.mode, leadSuit);
      if (power > highestPower) {
        highestPower = power;
        winningIndex = index;
      }
    });

    const winnerId = trickCards[winningIndex].playerId;
    const winnerPlayerIndex = newPlayers.findIndex((p) => p.id === winnerId);

    // Update tricks won
    const updatedPlayers = newPlayers.map((p) => {
      if (p.id === winnerId) {
        return { ...p, tricks: p.tricks + 1 };
      }
      return p;
    });

    // Update team tricks
    const updatedTeams = state.teams.map((team) => {
      if (team.players.includes(winnerId)) {
        return { ...team, tricksWon: team.tricksWon + 1 };
      }
      return team;
    });

    // Check if round is over
    const cardsRemaining = updatedPlayers.reduce((sum, p) => sum + p.hand.length, 0);

    if (cardsRemaining === 0) {
      return this.completeRound(state, updatedPlayers, updatedTeams, winnerId, winnerPlayerIndex);
    }

    // Trick complete but round continues
    return {
      ...state,
      players: updatedPlayers,
      teams: updatedTeams,
      currentTrick: { cards: trickCards, leadSuit, winnerId },
      currentPlayerIndex: winnerPlayerIndex,
      spadesBroken,
    };
  }

  // Complete a round and calculate scores
  private static completeRound(
    state: GameState,
    players: Player[],
    teams: Team[],
    lastWinnerId: string,
    lastWinnerIndex: number
  ): GameState {
    // Calculate scores including nil bid handling
    const finalTeams = teams.map((team) => {
      const teamBid = team.totalBid || 0;
      const tricksWon = team.tricksWon;

      let points = 0;
      let newBags = team.bags;

      // Check for nil bids
      const teamPlayers = team.players.map((pid) => players.find((p) => p.id === pid)!);
      let nilBonus = 0;
      
      teamPlayers.forEach((player) => {
        if (player.bid === 0) {
          // Nil bid: +100 if made, -100 if busted
          if (player.tricks === 0) {
            nilBonus += 100;
          } else {
            nilBonus -= 100;
            newBags += player.tricks; // Nil busted tricks count as bags
          }
        }
      });

      // Calculate regular bid score (excluding nil bids)
      const regularBid = teamPlayers.reduce((sum, p) => sum + (p.bid === 0 ? 0 : (p.bid || 0)), 0);
      const regularTricks = tricksWon - teamPlayers.reduce((sum, p) => sum + (p.bid === 0 ? p.tricks : 0), 0);

      if (regularBid > 0) {
        if (regularTricks >= regularBid) {
          const overtricks = regularTricks - regularBid;
          points = regularBid * 10 + overtricks;
          newBags += overtricks;
        } else {
          points = -regularBid * 10;
        }
      }

      // Apply bag penalty
      if (newBags >= 10) {
        points -= 100;
        newBags = newBags % 10;
      }

      // Add nil bonus/penalty
      points += nilBonus;

      return {
        ...team,
        score: team.score + points,
        bags: newBags,
        tricksWon: 0,
        totalBid: null,
      };
    });

    // Check for game over
    const winnerIndex = finalTeams.findIndex((t) => t.score >= state.winningScore);
    if (winnerIndex !== -1) {
      return {
        ...state,
        players: players.map((p) => ({ ...p, bid: null, tricks: 0 })),
        teams: finalTeams,
        currentTrick: { cards: [], leadSuit: null, winnerId: lastWinnerId },
        phase: "game_over",
        currentPlayerIndex: lastWinnerIndex,
      };
    }

    // Start new round
    const deck = state.mode === "ace_high" ? generateStandardDeck() : generateJJDDDeck();
    const shuffled = shuffleArray(deck);
    const newDealtPlayers = players.map((p, i) => ({
      ...p,
      hand: sortHand(shuffled.slice(i * 13, (i + 1) * 13), state.mode),
      bid: null,
      tricks: 0,
    }));

    return {
      ...state,
      players: newDealtPlayers,
      teams: finalTeams,
      currentTrick: { cards: [], leadSuit: null, winnerId: null },
      phase: "bidding",
      currentPlayerIndex: (state.dealerIndex + 1) % 4,
      dealerIndex: (state.dealerIndex + 1) % 4,
      roundNumber: state.roundNumber + 1,
      spadesBroken: false,
    };
  }

  // Clear trick for next round
  static clearTrick(state: GameState): GameState {
    return {
      ...state,
      currentTrick: { cards: [], leadSuit: null, winnerId: null },
    };
  }
}
