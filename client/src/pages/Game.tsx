import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { GameTable } from "@/components/GameTable";
import { GameResultsModal } from "@/components/GameResultsModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import type { GameState, Card, Player, Team, Trick, GameMode, PointGoal, Position } from "@shared/schema";
import { getCardPower, isTrump, POINT_GOAL_VALUES } from "@shared/schema";
import { generateStandardDeck, generateJJDDDeck, shuffleArray, sortHand } from "@/lib/gameUtils";
import { ArrowLeft, Settings } from "lucide-react";

const BOT_NAMES = ["SpadeMaster", "TrickTaker", "CardShark", "AceHunter"];
const POSITIONS: Position[] = ["south", "west", "north", "east"];

export default function Game() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  
  const mode = (params.get("mode") as GameMode) || "ace_high";
  const pointGoal = (params.get("points") as PointGoal) || "300";
  const gameType = params.get("type") || "solo";
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [winningTeamIndex, setWinningTeamIndex] = useState<number | null>(null);
  
  const playerId = "player-1";
  const botThinkingRef = useRef(false);
  const gameStateRef = useRef<GameState | null>(null);
  
  // Keep ref updated with latest state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Initialize game
  useEffect(() => {
    initializeGame();
  }, [mode, pointGoal]);

  const initializeGame = () => {
    const deck = mode === "ace_high" ? generateStandardDeck() : generateJJDDDeck();
    const shuffledDeck = shuffleArray(deck);
    
    // Create players
    const players: Player[] = POSITIONS.map((position, index) => ({
      id: index === 0 ? playerId : `bot-${index}`,
      name: index === 0 ? "You" : BOT_NAMES[index - 1],
      isBot: index !== 0,
      position,
      hand: [],
      bid: null,
      tricks: 0,
      isReady: true,
    }));

    // Deal cards (13 each for standard, 13 for JJDD mode)
    const cardsPerPlayer = mode === "ace_high" ? 13 : 13;
    players.forEach((player, index) => {
      player.hand = shuffledDeck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer);
      player.hand = sortHand(player.hand, mode);
    });

    // Create teams (partners: 0&2, 1&3)
    const teams: Team[] = [
      {
        id: "team-1",
        players: [players[0].id, players[2].id],
        score: 0,
        bags: 0,
        totalBid: null,
        tricksWon: 0,
      },
      {
        id: "team-2",
        players: [players[1].id, players[3].id],
        score: 0,
        bags: 0,
        totalBid: null,
        tricksWon: 0,
      },
    ];

    const initialState: GameState = {
      id: `game-${Date.now()}`,
      mode,
      pointGoal,
      phase: "bidding",
      players,
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

    setGameState(initialState);
    setShowResults(false);
    setWinningTeamIndex(null);
    setSelectedCard(null);
  };

  // Bot AI for bidding
  const calculateBotBid = useCallback((hand: Card[]): number => {
    let bid = 0;
    
    // Count high cards
    hand.forEach((card) => {
      if (card.value === "A") bid += 1;
      if (card.value === "K") bid += 0.5;
      if (card.value === "Q") bid += 0.25;
      if (card.suit === "spades") bid += 0.5;
      if (card.value === "BJ") bid += 2;
      if (card.value === "LJ") bid += 1.5;
      if (card.suit === "spades" && card.value === "2") bid += 1.5;
    });
    
    // Count spades
    const spadeCount = hand.filter((c) => c.suit === "spades" || c.value === "LJ" || c.value === "BJ").length;
    bid += Math.max(0, spadeCount - 2) * 0.5;
    
    return Math.max(1, Math.min(6, Math.round(bid)));
  }, []);

  // Bot AI for playing
  const selectBotCard = useCallback((state: GameState, botIndex: number): Card => {
    const bot = state.players[botIndex];
    const hand = bot.hand;
    const trick = state.currentTrick;
    const leadSuit = trick.leadSuit;
    
    // Filter playable cards
    let playable = hand;
    if (leadSuit) {
      const suitCards = hand.filter((c) => c.suit === leadSuit);
      if (suitCards.length > 0) playable = suitCards;
    } else if (!state.spadesBroken) {
      const nonSpades = hand.filter((c) => !isTrump(c, state.mode));
      if (nonSpades.length > 0) playable = nonSpades;
    }
    
    // Simple strategy: play lowest card if possible, or highest if winning is likely
    const sorted = [...playable].sort((a, b) => 
      getCardPower(a, state.mode, leadSuit) - getCardPower(b, state.mode, leadSuit)
    );
    
    // If leading, play mid-range card
    if (!leadSuit) {
      return sorted[Math.floor(sorted.length / 2)];
    }
    
    // If following, try to win if it makes sense
    const currentWinningPower = trick.cards.reduce((max, { card }) => {
      return Math.max(max, getCardPower(card, state.mode, leadSuit));
    }, 0);
    
    // Find lowest card that can win
    const winningCards = sorted.filter(
      (c) => getCardPower(c, state.mode, leadSuit) > currentWinningPower
    );
    
    if (winningCards.length > 0 && Math.random() > 0.3) {
      return winningCards[0]; // Lowest winning card
    }
    
    return sorted[0]; // Lowest card
  }, []);

  // Handle bidding
  const handleBid = useCallback((bid: number) => {
    if (!gameState) return;
    
    setGameState((prev) => {
      if (!prev) return prev;
      
      const newPlayers = prev.players.map((p, i) => 
        i === prev.currentPlayerIndex ? { ...p, bid } : p
      );
      
      // Check if all players have bid
      const allBid = newPlayers.every((p) => p.bid !== null);
      
      let newTeams = prev.teams;
      let newPhase = prev.phase;
      
      if (allBid) {
        // Calculate team bids
        newTeams = prev.teams.map((team) => {
          const teamBid = team.players.reduce((sum, pid) => {
            const player = newPlayers.find((p) => p.id === pid);
            return sum + (player?.bid || 0);
          }, 0);
          return { ...team, totalBid: teamBid };
        });
        newPhase = "playing";
      }
      
      return {
        ...prev,
        players: newPlayers,
        teams: newTeams,
        phase: newPhase,
        currentPlayerIndex: allBid ? 0 : (prev.currentPlayerIndex + 1) % 4,
      };
    });
  }, [gameState]);

  // Handle playing a card
  const handlePlayCard = useCallback((card: Card) => {
    if (!gameState) return;
    
    setGameState((prev) => {
      if (!prev) return prev;
      
      const currentPlayer = prev.players[prev.currentPlayerIndex];
      if (!currentPlayer) return prev;
      
      // Remove card from hand
      const newPlayers = prev.players.map((p, i) => {
        if (i === prev.currentPlayerIndex) {
          return {
            ...p,
            hand: p.hand.filter((c) => c.id !== card.id),
          };
        }
        return p;
      });
      
      // Add card to trick
      const newTrickCards = [
        ...prev.currentTrick.cards,
        { playerId: currentPlayer.id, card },
      ];
      
      const leadSuit = prev.currentTrick.leadSuit || card.suit;
      
      // Check if spades broken
      let spadesBroken = prev.spadesBroken;
      if (isTrump(card, prev.mode)) {
        spadesBroken = true;
      }
      
      // Trick complete?
      if (newTrickCards.length === 4) {
        // Determine winner
        let winningIndex = 0;
        let highestPower = 0;
        
        newTrickCards.forEach(({ card: c }, index) => {
          const power = getCardPower(c, prev.mode, leadSuit);
          if (power > highestPower) {
            highestPower = power;
            winningIndex = index;
          }
        });
        
        const winnerId = newTrickCards[winningIndex].playerId;
        const winnerPlayerIndex = newPlayers.findIndex((p) => p.id === winnerId);
        
        // Update tricks won
        const updatedPlayers = newPlayers.map((p) => {
          if (p.id === winnerId) {
            return { ...p, tricks: p.tricks + 1 };
          }
          return p;
        });
        
        // Update team tricks
        const updatedTeams = prev.teams.map((team) => {
          if (team.players.includes(winnerId)) {
            return { ...team, tricksWon: team.tricksWon + 1 };
          }
          return team;
        });
        
        // Check if round is over (all cards played)
        const cardsRemaining = updatedPlayers.reduce((sum, p) => sum + p.hand.length, 0);
        
        if (cardsRemaining === 0) {
          // Round over - calculate scores including nil bid handling
          const finalTeams = updatedTeams.map((team) => {
            const tricksWon = team.tricksWon;
            let points = 0;
            let newBags = team.bags;
            
            // Check for nil bids
            const teamPlayers = team.players.map((pid) => updatedPlayers.find((p) => p.id === pid)!);
            let nilBonus = 0;
            
            teamPlayers.forEach((player) => {
              if (player.bid === 0) {
                if (player.tricks === 0) {
                  nilBonus += 100;
                } else {
                  nilBonus -= 100;
                  newBags += player.tricks;
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
            
            return { ...team, score: team.score + points, bags: newBags, tricksWon: 0, totalBid: null };
          });
          
          // Check for game over
          const winnerIndex = finalTeams.findIndex((t) => t.score >= prev.winningScore);
          if (winnerIndex !== -1) {
            return {
              ...prev,
              players: updatedPlayers.map((p) => ({ ...p, bid: null, tricks: 0 })),
              teams: finalTeams,
              currentTrick: { cards: [], leadSuit: null, winnerId },
              phase: "game_over" as const,
              currentPlayerIndex: winnerPlayerIndex,
            };
          }
          
          // Start new round
          const deck = prev.mode === "ace_high" ? generateStandardDeck() : generateJJDDDeck();
          const shuffled = shuffleArray(deck);
          const newDealtPlayers = updatedPlayers.map((p, i) => ({
            ...p,
            hand: sortHand(shuffled.slice(i * 13, (i + 1) * 13), prev.mode),
            bid: null,
            tricks: 0,
          }));
          
          return {
            ...prev,
            players: newDealtPlayers,
            teams: finalTeams,
            currentTrick: { cards: [], leadSuit: null, winnerId: null },
            phase: "bidding" as const,
            currentPlayerIndex: (prev.dealerIndex + 1) % 4,
            dealerIndex: (prev.dealerIndex + 1) % 4,
            roundNumber: prev.roundNumber + 1,
            spadesBroken: false,
          };
        }
        
        // Clear trick after delay and set winner as next player
        setTimeout(() => {
          setGameState((state) => {
            if (!state) return state;
            return {
              ...state,
              currentTrick: { cards: [], leadSuit: null, winnerId: null },
              currentPlayerIndex: winnerPlayerIndex,
            };
          });
        }, 1500);
        
        return {
          ...prev,
          players: updatedPlayers,
          teams: updatedTeams,
          currentTrick: { cards: newTrickCards, leadSuit, winnerId },
          spadesBroken,
        };
      }
      
      // Not complete, next player
      return {
        ...prev,
        players: newPlayers,
        currentTrick: { cards: newTrickCards, leadSuit, winnerId: null },
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % 4,
        spadesBroken,
      };
    });
  }, [gameState]);

  // Create stable refs for handlers to avoid effect re-triggering
  const handleBidRef = useRef(handleBid);
  const handlePlayCardRef = useRef(handlePlayCard);
  
  useEffect(() => {
    handleBidRef.current = handleBid;
    handlePlayCardRef.current = handlePlayCard;
  }, [handleBid, handlePlayCard]);

  // Handle bot turns using refs to access latest state
  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase !== "bidding" && gameState.phase !== "playing") return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isBot) return;
    
    // Skip if trick is complete (waiting for clear)
    if (gameState.currentTrick.cards.length === 4) return;
    
    const delay = 600 + Math.random() * 400;
    
    const timer = setTimeout(() => {
      const state = gameStateRef.current;
      if (!state) return;
      
      // Double-check it's still bot's turn
      const botPlayer = state.players[state.currentPlayerIndex];
      if (!botPlayer || !botPlayer.isBot) return;
      
      // Skip if trick is complete
      if (state.currentTrick.cards.length === 4) return;
      
      if (state.phase === "bidding" && botPlayer.bid === null) {
        const bid = calculateBotBid(botPlayer.hand);
        handleBidRef.current(bid);
      } else if (state.phase === "playing" && botPlayer.hand.length > 0) {
        const card = selectBotCard(state, state.currentPlayerIndex);
        if (card) {
          handlePlayCardRef.current(card);
        }
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [gameState?.currentPlayerIndex, gameState?.phase, gameState?.currentTrick.cards.length, calculateBotBid, selectBotCard]);

  // Check for game over
  useEffect(() => {
    if (gameState?.phase === "game_over") {
      const winnerIdx = gameState.teams.findIndex((t) => t.score >= gameState.winningScore);
      setWinningTeamIndex(winnerIdx);
      setTimeout(() => setShowResults(true), 1000);
    }
  }, [gameState?.phase]);

  const handlePlayAgain = () => {
    initializeGame();
  };

  const handleReturnToLobby = () => {
    navigate("/");
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={handleReturnToLobby} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </header>

      {/* Game table */}
      <GameTable
        gameState={gameState}
        playerId={playerId}
        onPlayCard={handlePlayCard}
        onBid={handleBid}
        selectedCard={selectedCard}
        onSelectCard={setSelectedCard}
      />

      {/* Results modal */}
      <GameResultsModal
        isOpen={showResults}
        teams={gameState.teams}
        players={gameState.players}
        winningTeamIndex={winningTeamIndex}
        onPlayAgain={handlePlayAgain}
        onReturnToLobby={handleReturnToLobby}
      />
    </div>
  );
}
