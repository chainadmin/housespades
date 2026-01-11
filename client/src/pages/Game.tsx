import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameTable } from "@/components/GameTable";
import { GameResultsModal } from "@/components/GameResultsModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { GameState, Card, Player, Team, Suit, GameMode, PointGoal } from "@shared/schema";
import { getCardPower } from "@shared/schema";
import { generateStandardDeck, generateJJDDDeck, shuffleArray, sortHand } from "@/lib/gameUtils";

export default function Game() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const mode = (searchParams.get("mode") as GameMode) || "ace_high";
  const pointGoal = (searchParams.get("points") as PointGoal) || "300";
  const pointGoalNum = parseInt(pointGoal, 10);
  const gameType = searchParams.get("type") || "solo";
  const playerName = searchParams.get("name") || "Player";

  const isMultiplayer = gameType === "multiplayer";

  const [localGameState, setLocalGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [winningTeamIndex, setWinningTeamIndex] = useState<number>(-1);
  const [playerId, setPlayerId] = useState<string>("player-1");

  const gameStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    gameStateRef.current = localGameState;
  }, [localGameState]);

  const {
    connect,
    isConnected,
    gameState: wsGameState,
    playCard: wsPlayCard,
    placeBid: wsPlaceBid,
    leaveLobby,
  } = useWebSocket({
    autoConnect: isMultiplayer,
    onGameStateUpdate: (state) => {
      if (state.players) {
        const me = state.players.find((p: Player) => p.name === playerName);
        if (me) setPlayerId(me.id);
      }
    },
  });

  const gameState = isMultiplayer ? wsGameState : localGameState;

  const initializeLocalGame = useCallback(() => {
    const deck = mode === "ace_high" ? generateStandardDeck() : generateJJDDDeck();
    const shuffled = shuffleArray(deck);

    const botNames = ["Bot Alice", "Bot Bob", "Bot Carol"];
    const players: Player[] = [
      {
        id: "player-1",
        name: playerName,
        position: "south",
        hand: sortHand(shuffled.slice(0, 13), mode),
        bid: null,
        tricks: 0,
        isBot: false,
        isReady: true,
      },
      {
        id: "bot-1",
        name: botNames[0],
        position: "west",
        hand: sortHand(shuffled.slice(13, 26), mode),
        bid: null,
        tricks: 0,
        isBot: true,
        isReady: true,
      },
      {
        id: "bot-2",
        name: botNames[1],
        position: "north",
        hand: sortHand(shuffled.slice(26, 39), mode),
        bid: null,
        tricks: 0,
        isBot: true,
        isReady: true,
      },
      {
        id: "bot-3",
        name: botNames[2],
        position: "east",
        hand: sortHand(shuffled.slice(39, 52), mode),
        bid: null,
        tricks: 0,
        isBot: true,
        isReady: true,
      },
    ];

    const teams: Team[] = [
      {
        id: "team-1",
        players: ["player-1", "bot-2"],
        score: 0,
        bags: 0,
        tricksWon: 0,
        totalBid: null,
      },
      {
        id: "team-2",
        players: ["bot-1", "bot-3"],
        score: 0,
        bags: 0,
        tricksWon: 0,
        totalBid: null,
      },
    ];

    const newGameState: GameState = {
      id: `game-${Date.now()}`,
      mode,
      pointGoal,
      phase: "bidding",
      players,
      teams,
      currentPlayerIndex: 0,
      dealerIndex: 3,
      currentTrick: { cards: [], leadSuit: null, winnerId: null },
      roundNumber: 1,
      winningScore: pointGoalNum,
      spadesBroken: false,
    };

    setLocalGameState(newGameState);
    setPlayerId("player-1");
    setShowResults(false);
    setWinningTeamIndex(-1);
  }, [mode, pointGoal, pointGoalNum, playerName]);

  useEffect(() => {
    if (!isMultiplayer) {
      initializeLocalGame();
    }
  }, [isMultiplayer, initializeLocalGame]);

  const calculateBotBid = useCallback((hand: Card[]): number => {
    let bid = 0;
    
    const spades = hand.filter((c) => c.suit === "spades");
    bid += Math.floor(spades.length / 3);
    
    hand.forEach((card) => {
      if (card.value === "A") bid += 1;
      if (card.value === "K") bid += 0.5;
      if (card.value === "BJ" || card.value === "LJ") bid += 1.5;
    });
    
    bid = Math.max(1, Math.min(13, Math.round(bid)));
    return bid;
  }, []);

  const selectBotCard = useCallback((state: GameState, botIndex: number): Card | null => {
    const bot = state.players[botIndex];
    if (!bot || bot.hand.length === 0) return null;

    const leadSuit = state.currentTrick.leadSuit;
    const hand = bot.hand;

    if (!leadSuit) {
      if (!state.spadesBroken) {
        const nonSpades = hand.filter((c) => c.suit !== "spades");
        if (nonSpades.length > 0) {
          return nonSpades[Math.floor(Math.random() * nonSpades.length)];
        }
      }
      return hand[Math.floor(Math.random() * hand.length)];
    }

    const suitCards = hand.filter((c) => c.suit === leadSuit);
    if (suitCards.length > 0) {
      return suitCards[Math.floor(Math.random() * suitCards.length)];
    }

    const spades = hand.filter((c) => c.suit === "spades");
    if (spades.length > 0 && Math.random() > 0.3) {
      return spades[0];
    }

    return hand[Math.floor(Math.random() * hand.length)];
  }, []);

  const handleBid = useCallback((bid: number) => {
    if (isMultiplayer) {
      wsPlaceBid(bid);
      return;
    }

    setLocalGameState((prev) => {
      if (!prev) return prev;

      const newPlayers = prev.players.map((p, i) =>
        i === prev.currentPlayerIndex ? { ...p, bid } : p
      );

      const allBid = newPlayers.every((p) => p.bid !== null);

      let newTeams = prev.teams;
      if (allBid) {
        newTeams = prev.teams.map((team) => {
          const teamBid = team.players.reduce((sum, pid) => {
            const player = newPlayers.find((p) => p.id === pid);
            return sum + (player?.bid || 0);
          }, 0);
          return { ...team, totalBid: teamBid };
        });
      }

      return {
        ...prev,
        players: newPlayers,
        teams: newTeams,
        currentPlayerIndex: allBid ? 0 : (prev.currentPlayerIndex + 1) % 4,
        phase: allBid ? "playing" : "bidding",
      };
    });
  }, [isMultiplayer, wsPlaceBid]);

  const handlePlayCard = useCallback((card: Card) => {
    if (isMultiplayer) {
      wsPlayCard(card.id);
      return;
    }

    setLocalGameState((prev) => {
      if (!prev || prev.phase !== "playing") return prev;
      
      const currentPlayer = prev.players[prev.currentPlayerIndex];
      if (!currentPlayer) return prev;
      
      const hasCard = currentPlayer.hand.some((c) => c.id === card.id);
      if (!hasCard) return prev;
      
      const newPlayers = prev.players.map((p, i) =>
        i === prev.currentPlayerIndex
          ? { ...p, hand: p.hand.filter((c) => c.id !== card.id) }
          : p
      );
      
      const leadSuit = prev.currentTrick.leadSuit || card.suit;
      const newTrickCards = [
        ...prev.currentTrick.cards,
        { playerId: currentPlayer.id, card },
      ];
      
      let spadesBroken = prev.spadesBroken;
      if (card.suit === "spades") {
        spadesBroken = true;
      }
      
      if (newTrickCards.length === 4) {
        let winningIndex = 0;
        let winningPower = -1;
        
        newTrickCards.forEach((tc, i) => {
          const power = getCardPower(tc.card, prev.mode, leadSuit as Suit);
          if (power > winningPower) {
            winningPower = power;
            winningIndex = i;
          }
        });
        
        const winnerId = newTrickCards[winningIndex].playerId;
        const winnerPlayerIndex = prev.players.findIndex((p) => p.id === winnerId);
        
        const updatedPlayers = newPlayers.map((p) =>
          p.id === winnerId ? { ...p, tricks: p.tricks + 1 } : p
        );
        
        const updatedTeams = prev.teams.map((team) => {
          if (team.players.includes(winnerId)) {
            return { ...team, tricksWon: team.tricksWon + 1 };
          }
          return team;
        });
        
        const roundOver = updatedPlayers.every((p) => p.hand.length === 0);
        
        if (roundOver) {
          const finalTeams = updatedTeams.map((team) => {
            const teamBid = team.totalBid || 0;
            const teamTricks = team.tricksWon;
            let roundScore = 0;
            let newBags = team.bags;
            
            if (teamTricks >= teamBid) {
              roundScore = teamBid * 10;
              const overtricks = teamTricks - teamBid;
              roundScore += overtricks;
              newBags += overtricks;
              
              if (newBags >= 10) {
                roundScore -= 100;
                newBags -= 10;
              }
            } else {
              roundScore = -teamBid * 10;
            }
            
            return {
              ...team,
              score: team.score + roundScore,
              bags: newBags,
              tricksWon: 0,
              totalBid: null,
            };
          });
          
          const gameOver = finalTeams.some((t) => t.score >= prev.winningScore);
          
          if (gameOver) {
            return {
              ...prev,
              players: updatedPlayers,
              teams: finalTeams,
              currentTrick: { cards: newTrickCards, leadSuit, winnerId },
              phase: "game_over" as const,
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
  }, [isMultiplayer, wsPlayCard]);

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
  }, [gameState?.phase, gameState?.teams, gameState?.winningScore]);

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed header with back button and controls */}
      <header className="flex items-center justify-between p-3 border-b bg-background/95 backdrop-blur-sm z-50 shrink-0">
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

      {/* Game table takes remaining space */}
      <div className="flex-1 relative overflow-hidden">
        <GameTable
          gameState={gameState}
          playerId={playerId}
          onPlayCard={handlePlayCard}
          onBid={handleBid}
          selectedCard={selectedCard}
          onSelectCard={setSelectedCard}
        />
      </div>

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
