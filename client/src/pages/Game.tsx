import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { GameTable } from "@/components/GameTable";
import { GameResultsModal } from "@/components/GameResultsModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import type { GameState, Card, Player, Team, GameMode, PointGoal, Position } from "@shared/schema";
import { getCardPower, isTrump, POINT_GOAL_VALUES } from "@shared/schema";
import { generateStandardDeck, generateJJDDDeck, shuffleArray, sortHand } from "@/lib/gameUtils";
import { ArrowLeft, Wifi, WifiOff } from "lucide-react";

const BOT_NAMES = ["SpadeMaster", "TrickTaker", "CardShark", "AceHunter"];
const POSITIONS: Position[] = ["south", "west", "north", "east"];

export default function Game() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const { toast } = useToast();
  
  const mode = (params.get("mode") as GameMode) || "ace_high";
  const pointGoal = (params.get("points") as PointGoal) || "300";
  const gameType = params.get("type") || "solo";
  const playerName = params.get("name") || "You";
  
  const isMultiplayer = gameType === "multiplayer";
  
  const [localGameState, setLocalGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [winningTeamIndex, setWinningTeamIndex] = useState<number | null>(null);
  
  const [localPlayerId, setLocalPlayerId] = useState("player-1");
  const gameStateRef = useRef<GameState | null>(null);
  
  const {
    connect,
    disconnect,
    isConnected,
    playerId: wsPlayerId,
    gameState: wsGameState,
    startGame: wsStartGame,
    placeBid: wsPlaceBid,
    playCard: wsPlayCard,
    leaveLobby,
  } = useWebSocket({
    onError: (message) => {
      toast({
        title: "Game Error",
        description: message,
        variant: "destructive",
      });
    },
    onPlayerJoined: (id) => {
      setLocalPlayerId(id);
    },
  });

  const gameState = isMultiplayer && wsGameState ? wsGameState : localGameState;
  const playerId = isMultiplayer && wsPlayerId ? wsPlayerId : localPlayerId;

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (isMultiplayer) {
      connect();
      return () => {
        leaveLobby();
        disconnect();
      };
    } else {
      initializeLocalGame();
    }
  }, [isMultiplayer, mode, pointGoal]);

  useEffect(() => {
    if (isMultiplayer && isConnected && wsPlayerId && !wsGameState) {
      const players = [
        { id: wsPlayerId, name: playerName, isBot: false },
        { id: "bot-1", name: BOT_NAMES[0], isBot: true },
        { id: "bot-2", name: BOT_NAMES[1], isBot: true },
        { id: "bot-3", name: BOT_NAMES[2], isBot: true },
      ];
      wsStartGame(mode, pointGoal, players);
    }
  }, [isMultiplayer, isConnected, wsPlayerId, wsGameState, mode, pointGoal, playerName]);

  const initializeLocalGame = () => {
    const deck = mode === "ace_high" ? generateStandardDeck() : generateJJDDDeck();
    const shuffledDeck = shuffleArray(deck);
    
    const players: Player[] = POSITIONS.map((position, index) => ({
      id: index === 0 ? localPlayerId : `bot-${index}`,
      name: index === 0 ? playerName : BOT_NAMES[index - 1],
      isBot: index !== 0,
      position,
      hand: [],
      bid: null,
      tricks: 0,
      isReady: true,
    }));

    const cardsPerPlayer = 13;
    players.forEach((player, index) => {
      player.hand = shuffledDeck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer);
      player.hand = sortHand(player.hand, mode);
    });

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

    setLocalGameState(initialState);
    setShowResults(false);
    setWinningTeamIndex(null);
    setSelectedCard(null);
  };

  const calculateBotBid = useCallback((hand: Card[]): number => {
    let bid = 0;
    
    hand.forEach((card) => {
      if (card.value === "A") bid += 1;
      if (card.value === "K") bid += 0.5;
      if (card.value === "Q") bid += 0.25;
      if (card.suit === "spades") bid += 0.5;
      if (card.value === "BJ") bid += 2;
      if (card.value === "LJ") bid += 1.5;
      if (card.suit === "spades" && card.value === "2") bid += 1.5;
    });
    
    const spadeCount = hand.filter((c) => c.suit === "spades" || c.value === "LJ" || c.value === "BJ").length;
    bid += Math.max(0, spadeCount - 2) * 0.5;
    
    return Math.max(1, Math.min(6, Math.round(bid)));
  }, []);

  const selectBotCard = useCallback((state: GameState, botIndex: number): Card => {
    const bot = state.players[botIndex];
    const hand = bot.hand;
    const trick = state.currentTrick;
    const leadSuit = trick.leadSuit;
    
    let playable = hand;
    if (leadSuit) {
      const suitCards = hand.filter((c) => c.suit === leadSuit);
      if (suitCards.length > 0) playable = suitCards;
    } else if (!state.spadesBroken) {
      const nonSpades = hand.filter((c) => !isTrump(c, state.mode));
      if (nonSpades.length > 0) playable = nonSpades;
    }
    
    const sorted = [...playable].sort((a, b) => 
      getCardPower(a, state.mode, leadSuit) - getCardPower(b, state.mode, leadSuit)
    );
    
    if (!leadSuit) {
      return sorted[Math.floor(sorted.length / 2)];
    }
    
    const currentWinningPower = trick.cards.reduce((max, { card }) => {
      return Math.max(max, getCardPower(card, state.mode, leadSuit));
    }, 0);
    
    const winningCards = sorted.filter(
      (c) => getCardPower(c, state.mode, leadSuit) > currentWinningPower
    );
    
    if (winningCards.length > 0 && Math.random() > 0.3) {
      return winningCards[0];
    }
    
    return sorted[0];
  }, []);

  const handleBid = useCallback((bid: number) => {
    if (isMultiplayer) {
      wsPlaceBid(bid);
      return;
    }
    
    if (!localGameState) return;
    
    setLocalGameState((prev) => {
      if (!prev) return prev;
      
      const newPlayers = prev.players.map((p, i) => 
        i === prev.currentPlayerIndex ? { ...p, bid } : p
      );
      
      const allBid = newPlayers.every((p) => p.bid !== null);
      
      let newTeams = prev.teams;
      let newPhase = prev.phase;
      
      if (allBid) {
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
        currentPlayerIndex: allBid ? (prev.dealerIndex + 1) % 4 : (prev.currentPlayerIndex + 1) % 4,
      };
    });
  }, [isMultiplayer, localGameState, wsPlaceBid]);

  const handlePlayCard = useCallback((card: Card) => {
    if (isMultiplayer) {
      wsPlayCard(card.id);
      return;
    }
    
    if (!localGameState) return;
    
    setLocalGameState((prev) => {
      if (!prev) return prev;
      
      const currentPlayer = prev.players[prev.currentPlayerIndex];
      if (!currentPlayer) return prev;
      
      const newPlayers = prev.players.map((p, i) => {
        if (i === prev.currentPlayerIndex) {
          return {
            ...p,
            hand: p.hand.filter((c) => c.id !== card.id),
          };
        }
        return p;
      });
      
      const newTrickCards = [
        ...prev.currentTrick.cards,
        { playerId: currentPlayer.id, card },
      ];
      
      const leadSuit = prev.currentTrick.leadSuit || card.suit;
      
      let spadesBroken = prev.spadesBroken;
      if (isTrump(card, prev.mode)) {
        spadesBroken = true;
      }
      
      if (newTrickCards.length === 4) {
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
        
        const updatedPlayers = newPlayers.map((p) => {
          if (p.id === winnerId) {
            return { ...p, tricks: p.tricks + 1 };
          }
          return p;
        });
        
        const updatedTeams = prev.teams.map((team) => {
          if (team.players.includes(winnerId)) {
            return { ...team, tricksWon: team.tricksWon + 1 };
          }
          return team;
        });
        
        const cardsRemaining = updatedPlayers.reduce((sum, p) => sum + p.hand.length, 0);
        
        if (cardsRemaining === 0) {
          const finalTeams = updatedTeams.map((team) => {
            const tricksWon = team.tricksWon;
            let points = 0;
            let newBags = team.bags;
            
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
            
            if (newBags >= 10) {
              points -= 100;
              newBags = newBags % 10;
            }
            
            points += nilBonus;
            
            return { ...team, score: team.score + points, bags: newBags, tricksWon: 0, totalBid: null };
          });
          
          const winnerIdx = finalTeams.findIndex((t) => t.score >= prev.winningScore);
          if (winnerIdx !== -1) {
            return {
              ...prev,
              players: updatedPlayers.map((p) => ({ ...p, bid: null, tricks: 0 })),
              teams: finalTeams,
              currentTrick: { cards: [], leadSuit: null, winnerId },
              phase: "game_over" as const,
              currentPlayerIndex: winnerPlayerIndex,
            };
          }
          
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
        
        setTimeout(() => {
          setLocalGameState((state) => {
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
      
      return {
        ...prev,
        players: newPlayers,
        currentTrick: { cards: newTrickCards, leadSuit, winnerId: null },
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % 4,
        spadesBroken,
      };
    });
  }, [isMultiplayer, localGameState, wsPlayCard]);

  const handleBidRef = useRef(handleBid);
  const handlePlayCardRef = useRef(handlePlayCard);
  
  useEffect(() => {
    handleBidRef.current = handleBid;
    handlePlayCardRef.current = handlePlayCard;
  }, [handleBid, handlePlayCard]);

  useEffect(() => {
    if (isMultiplayer) return;
    if (!localGameState) return;
    if (localGameState.phase !== "bidding" && localGameState.phase !== "playing") return;
    
    const currentPlayer = localGameState.players[localGameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isBot) return;
    
    if (localGameState.currentTrick.cards.length === 4) return;
    
    const delay = 600 + Math.random() * 400;
    
    const timer = setTimeout(() => {
      const state = gameStateRef.current;
      if (!state) return;
      
      const botPlayer = state.players[state.currentPlayerIndex];
      if (!botPlayer || !botPlayer.isBot) return;
      
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
  }, [isMultiplayer, localGameState?.currentPlayerIndex, localGameState?.phase, localGameState?.currentTrick.cards.length, calculateBotBid, selectBotCard]);

  useEffect(() => {
    if (gameState?.phase === "game_over") {
      const winnerIdx = gameState.teams.findIndex((t) => t.score >= gameState.winningScore);
      setWinningTeamIndex(winnerIdx);
      setTimeout(() => setShowResults(true), 1000);
    }
  }, [gameState?.phase]);

  const handlePlayAgain = () => {
    if (isMultiplayer) {
      leaveLobby();
      navigate(`/game?mode=${mode}&points=${pointGoal}&type=multiplayer&name=${encodeURIComponent(playerName)}`);
      window.location.reload();
    } else {
      initializeLocalGame();
    }
  };

  const handleReturnToLobby = () => {
    if (isMultiplayer) {
      leaveLobby();
    }
    navigate("/");
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
        {isMultiplayer && (
          <div className="flex items-center gap-2 text-muted-foreground">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span>Connected - Setting up game...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span>Connecting to server...</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={handleReturnToLobby} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {isMultiplayer && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/50 text-xs">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">Offline</span>
                </>
              )}
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      <GameTable
        gameState={gameState}
        playerId={playerId}
        onPlayCard={handlePlayCard}
        onBid={handleBid}
        selectedCard={selectedCard}
        onSelectCard={setSelectedCard}
      />

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
