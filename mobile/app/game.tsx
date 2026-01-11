import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { 
  GameState, Card, Player, Team, Trick, 
  GameMode, PointGoal, Position,
  POINT_GOAL_VALUES, BOT_NAMES, POSITIONS 
} from '@/constants/game';
import { 
  generateStandardDeck, generateJJDDDeck, shuffleArray, sortHand,
  getCardPower, isTrump 
} from '@/lib/gameUtils';
import { PlayingCard } from '@/components/PlayingCard';
import { PlayerHand } from '@/components/PlayerHand';
import { PlayerZone } from '@/components/PlayerZone';
import { TrickArea } from '@/components/TrickArea';
import { BiddingPanel } from '@/components/BiddingPanel';
import { Scoreboard } from '@/components/Scoreboard';
import { AdBanner } from '@/components/AdBanner';
import { useAds } from '@/hooks/useAds';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: GameMode; points: PointGoal; type: string }>();
  const colors = useColors();
  const { showInterstitialAd, recordGameCompleted, shouldShowAd, hasRemoveAds, isTrackingAllowed } = useAds();
  
  const mode = params.mode || 'ace_high';
  const pointGoal = params.points || '300';
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  
  const playerId = 'player-1';
  const botThinkingRef = useRef(false);
  const gameStateRef = useRef<GameState | null>(null);
  const previousPhaseRef = useRef<string | null>(null);
  const gameCompletedRef = useRef(false);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    initializeGame();
  }, [mode, pointGoal]);

  const initializeGame = () => {
    const deck = mode === 'ace_high' ? generateStandardDeck() : generateJJDDDeck();
    const shuffledDeck = shuffleArray(deck);
    
    const players: Player[] = POSITIONS.map((position, index) => ({
      id: index === 0 ? playerId : `bot-${index}`,
      name: index === 0 ? 'You' : BOT_NAMES[index - 1],
      isBot: index !== 0,
      position,
      hand: [],
      bid: null,
      tricks: 0,
      isReady: true,
    }));

    players.forEach((player, index) => {
      player.hand = shuffledDeck.slice(index * 13, (index + 1) * 13);
      player.hand = sortHand(player.hand, mode);
    });

    const teams: Team[] = [
      { id: 0, name: 'Your Team', players: [players[0].id, players[2].id], score: 0, bags: 0, tricksWon: 0, totalBid: null },
      { id: 1, name: 'Opponents', players: [players[1].id, players[3].id], score: 0, bags: 0, tricksWon: 0, totalBid: null },
    ];

    setGameState({
      id: `game-${Date.now()}`,
      mode,
      phase: 'bidding',
      players,
      teams,
      currentPlayerIndex: 0,
      dealerIndex: 3,
      currentTrick: { cards: [], leadSuit: null, winnerId: null },
      spadesBroken: false,
      roundNumber: 1,
      winningScore: POINT_GOAL_VALUES[pointGoal],
    });
  };

  const calculateBotBid = useCallback((hand: Card[]): number => {
    let bid = 0;
    hand.forEach((card) => {
      if (card.suit === 'joker') bid += 1;
      else if (card.suit === 'spades' && card.numericValue >= 12) bid += 1;
      else if (card.numericValue === 14) bid += 0.8;
      else if (card.numericValue === 13) bid += 0.5;
    });
    return Math.max(1, Math.min(13, Math.round(bid + Math.random() * 2 - 1)));
  }, []);

  const selectBotCard = useCallback((state: GameState, playerIndex: number): Card => {
    const player = state.players[playerIndex];
    const hand = player.hand;
    const leadSuit = state.currentTrick.leadSuit;

    if (!leadSuit) {
      if (!state.spadesBroken) {
        const nonSpades = hand.filter((c) => c.suit !== 'spades' && c.suit !== 'joker');
        if (nonSpades.length > 0) return nonSpades[Math.floor(Math.random() * nonSpades.length)];
      }
      return hand[Math.floor(Math.random() * hand.length)];
    }

    const matchingSuit = hand.filter((c) => c.suit === leadSuit);
    if (matchingSuit.length > 0) {
      return matchingSuit[Math.floor(Math.random() * matchingSuit.length)];
    }

    const trumps = hand.filter((c) => isTrump(c, state.mode));
    if (trumps.length > 0) return trumps[0];

    return hand[0];
  }, []);

  const handleBid = useCallback((bid: number) => {
    if (!gameState) return;
    
    setGameState((prev) => {
      if (!prev) return prev;
      
      const newPlayers = prev.players.map((p, i) => 
        i === prev.currentPlayerIndex ? { ...p, bid } : p
      );
      
      const allBid = newPlayers.every((p) => p.bid !== null);
      
      let newTeams = prev.teams;
      let newPhase: typeof prev.phase = prev.phase;
      
      if (allBid) {
        newTeams = prev.teams.map((team) => {
          const teamBid = team.players.reduce((sum, pid) => {
            const player = newPlayers.find((p) => p.id === pid);
            return sum + (player?.bid || 0);
          }, 0);
          return { ...team, totalBid: teamBid };
        });
        newPhase = 'playing';
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

  const handlePlayCard = useCallback((card: Card) => {
    if (!gameState) return;
    
    setGameState((prev) => {
      if (!prev) return prev;
      
      const currentPlayer = prev.players[prev.currentPlayerIndex];
      if (!currentPlayer) return prev;
      
      const newPlayers = prev.players.map((p, i) => {
        if (i === prev.currentPlayerIndex) {
          return { ...p, hand: p.hand.filter((c) => c.id !== card.id) };
        }
        return p;
      });
      
      const newTrickCards = [...prev.currentTrick.cards, { playerId: currentPlayer.id, card }];
      const leadSuit = prev.currentTrick.leadSuit || card.suit;
      
      let spadesBroken = prev.spadesBroken;
      if (isTrump(card, prev.mode)) spadesBroken = true;
      
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
        
        const updatedPlayers = newPlayers.map((p) => 
          p.id === winnerId ? { ...p, tricks: p.tricks + 1 } : p
        );
        
        const updatedTeams = prev.teams.map((team) => 
          team.players.includes(winnerId) ? { ...team, tricksWon: team.tricksWon + 1 } : team
        );
        
        const cardsRemaining = updatedPlayers.reduce((sum, p) => sum + p.hand.length, 0);
        
        if (cardsRemaining === 0) {
          const finalTeams = updatedTeams.map((team) => {
            let points = 0;
            let newBags = team.bags;
            const teamPlayers = updatedPlayers.filter((p) => team.players.includes(p.id));
            
            teamPlayers.forEach((player) => {
              if (player.bid === 0) {
                points += player.tricks === 0 ? 100 : -100;
                if (player.tricks > 0) newBags += player.tricks;
              }
            });
            
            const regularBid = teamPlayers.reduce((sum, p) => sum + (p.bid === 0 ? 0 : (p.bid || 0)), 0);
            if (regularBid > 0) {
              if (team.tricksWon >= regularBid) {
                const overtricks = team.tricksWon - regularBid;
                points += regularBid * 10 + overtricks;
                newBags += overtricks;
              } else {
                points -= regularBid * 10;
              }
            }
            
            if (newBags >= 10) {
              points -= 100;
              newBags %= 10;
            }
            
            return { ...team, score: team.score + points, bags: newBags, tricksWon: 0, totalBid: null };
          });
          
          const winnerIndex = finalTeams.findIndex((t) => t.score >= prev.winningScore);
          if (winnerIndex !== -1) {
            return { ...prev, players: updatedPlayers, teams: finalTeams, phase: 'game_over', currentTrick: { cards: [], leadSuit: null, winnerId } };
          }
          
          const deck = prev.mode === 'ace_high' ? generateStandardDeck() : generateJJDDDeck();
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
            phase: 'bidding',
            currentPlayerIndex: (prev.dealerIndex + 1) % 4,
            dealerIndex: (prev.dealerIndex + 1) % 4,
            roundNumber: prev.roundNumber + 1,
            spadesBroken: false,
          };
        }
        
        setTimeout(() => {
          setGameState((state) => {
            if (!state) return state;
            return { ...state, currentTrick: { cards: [], leadSuit: null, winnerId: null }, currentPlayerIndex: winnerPlayerIndex };
          });
        }, 1500);
        
        return { ...prev, players: updatedPlayers, teams: updatedTeams, currentTrick: { cards: newTrickCards, leadSuit, winnerId }, spadesBroken };
      }
      
      return { ...prev, players: newPlayers, currentTrick: { cards: newTrickCards, leadSuit, winnerId: null }, currentPlayerIndex: (prev.currentPlayerIndex + 1) % 4, spadesBroken };
    });
    
    setSelectedCard(null);
  }, [gameState]);

  const handleBidRef = useRef(handleBid);
  const handlePlayCardRef = useRef(handlePlayCard);
  
  useEffect(() => {
    handleBidRef.current = handleBid;
    handlePlayCardRef.current = handlePlayCard;
  }, [handleBid, handlePlayCard]);

  useEffect(() => {
    const currentPhase = gameState?.phase;
    const wasGameOver = previousPhaseRef.current === 'game_over';
    const isGameOver = currentPhase === 'game_over';
    
    if (isGameOver && !wasGameOver && !gameCompletedRef.current) {
      gameCompletedRef.current = true;
      recordGameCompleted();
      if (shouldShowAd) {
        showInterstitialAd();
      }
    }
    
    if (currentPhase === 'bidding' && previousPhaseRef.current !== 'bidding') {
      gameCompletedRef.current = false;
    }
    
    previousPhaseRef.current = currentPhase || null;
  }, [gameState?.phase, shouldShowAd]);

  useEffect(() => {
    if (!gameState || botThinkingRef.current) return;
    if (gameState.phase !== 'bidding' && gameState.phase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isBot) return;
    
    botThinkingRef.current = true;
    
    const timer = setTimeout(() => {
      const state = gameStateRef.current;
      if (!state) {
        botThinkingRef.current = false;
        return;
      }
      
      const botPlayer = state.players[state.currentPlayerIndex];
      if (!botPlayer || !botPlayer.isBot) {
        botThinkingRef.current = false;
        return;
      }
      
      if (state.phase === 'bidding') {
        handleBidRef.current(calculateBotBid(botPlayer.hand));
      } else if (state.phase === 'playing') {
        handlePlayCardRef.current(selectBotCard(state, state.currentPlayerIndex));
      }
      
      botThinkingRef.current = false;
    }, 600 + Math.random() * 400);
    
    return () => clearTimeout(timer);
  }, [gameState?.currentPlayerIndex, gameState?.phase, calculateBotBid, selectBotCard]);

  if (!gameState) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const partner = gameState.players.find((p) => p.position === 'north');
  const westPlayer = gameState.players.find((p) => p.position === 'west');
  const eastPlayer = gameState.players.find((p) => p.position === 'east');

  const getTeamColor = (player: Player) => {
    const teamIndex = gameState.teams.findIndex((t) => t.players.includes(player.id));
    return teamIndex === 0 ? '#4f46e5' : '#f59e0b';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Scoreboard teams={gameState.teams} players={gameState.players} winningScore={gameState.winningScore} />
      </View>

      <View style={styles.gameArea}>
        {partner && (
          <View style={styles.northPlayer}>
            <PlayerZone player={partner} position="north" isCurrentTurn={currentPlayer?.id === partner.id} teamColor={getTeamColor(partner)} />
          </View>
        )}

        <View style={styles.middleRow}>
          {westPlayer && (
            <View style={styles.westPlayer}>
              <PlayerZone player={westPlayer} position="west" isCurrentTurn={currentPlayer?.id === westPlayer.id} teamColor={getTeamColor(westPlayer)} />
            </View>
          )}

          <View style={styles.centerArea}>
            {gameState.phase === 'bidding' && isMyTurn ? (
              <BiddingPanel
                onBid={handleBid}
                isMyTurn={isMyTurn}
                partnerBid={partner?.bid || null}
                teamCurrentBid={partner?.bid || 0}
              />
            ) : (
              <TrickArea currentTrick={gameState.currentTrick} players={gameState.players} />
            )}
          </View>

          {eastPlayer && (
            <View style={styles.eastPlayer}>
              <PlayerZone player={eastPlayer} position="east" isCurrentTurn={currentPlayer?.id === eastPlayer.id} teamColor={getTeamColor(eastPlayer)} />
            </View>
          )}
        </View>
      </View>

      {myPlayer && (
        <View style={styles.handContainer}>
          <PlayerHand
            hand={myPlayer.hand}
            gameState={gameState}
            selectedCard={selectedCard}
            onSelectCard={setSelectedCard}
            onPlayCard={handlePlayCard}
            isMyTurn={isMyTurn && gameState.phase === 'playing'}
          />
        </View>
      )}

      {!hasRemoveAds && (
        <View style={styles.bannerContainer}>
          <AdBanner hasRemoveAds={hasRemoveAds} isTrackingAllowed={isTrackingAllowed} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    gap: 8,
  },
  backButton: {
    padding: 8,
  },
  gameArea: {
    flex: 1,
    padding: 8,
  },
  northPlayer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  middleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  westPlayer: {
    width: 100,
  },
  eastPlayer: {
    width: 100,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handContainer: {
    paddingBottom: 8,
  },
  bannerContainer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
});
