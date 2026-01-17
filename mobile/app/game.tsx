import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions, Modal, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useColors } from '@/hooks/useColorScheme';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  GameState, Card, Player, Team, Trick, 
  GameMode, PointGoal, Position,
  POINT_GOAL_VALUES, BOT_NAMES, POSITIONS 
} from '@/constants/game';
import { 
  generateStandardDeck, generateJJDDDeck, shuffleArray, sortHand,
  getCardPower, isTrump, getPlayableCards, actsAsSpade
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
  const params = useLocalSearchParams<{ mode: GameMode; points: PointGoal; type: string; gameId?: string }>();
  const colors = useColors();
  const { showInterstitialAd, recordGameCompleted, recordGameAbandoned, shouldShowAd, hasRemoveAds, isTrackingAllowed } = useAds();
  
  const mode = params.mode || 'ace_high';
  const pointGoal = params.points || '300';
  const isMultiplayer = params.type === 'multiplayer' || params.type === 'online';
  
  const [localGameState, setLocalGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  
  const localPlayerId = 'player-1';
  const gameStateRef = useRef<GameState | null>(null);
  const previousPhaseRef = useRef<string | null>(null);
  const gameCompletedRef = useRef(false);
  const isMountedRef = useRef(true);
  const gameOverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket for multiplayer
  const {
    connect,
    disconnect,
    isConnected,
    playerId: wsPlayerId,
    gameState: wsGameState,
    placeBid: wsPlaceBid,
    playCard: wsPlayCard,
    leaveLobby,
    startGame: wsStartGame,
  } = useWebSocket({
    onError: (message) => {
      console.error('WebSocket error:', message);
    },
  });

  // Use WebSocket state for multiplayer, local state for solo
  const gameState = isMultiplayer && wsGameState ? wsGameState as unknown as GameState : localGameState;
  const playerId = isMultiplayer && wsPlayerId ? wsPlayerId : localPlayerId;

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (gameOverTimeoutRef.current) {
        clearTimeout(gameOverTimeoutRef.current);
      }
    };
  }, []);

  const GAME_STATE_KEY = 'house_spades_game_state';

  const saveGameState = useCallback(async (state: GameState | null) => {
    if (!state || state.phase === 'game_over' || state.phase === 'waiting' || isMultiplayer) {
      await SecureStore.deleteItemAsync(GAME_STATE_KEY);
      return;
    }
    try {
      const saveData = {
        gameState: state,
        selectedCard,
        mode,
        pointGoal,
        savedAt: Date.now(),
      };
      await SecureStore.setItemAsync(GAME_STATE_KEY, JSON.stringify(saveData));
      console.log('[Game] Saved game state');
    } catch (err) {
      console.error('[Game] Failed to save game state:', err);
    }
  }, [isMultiplayer, selectedCard, mode, pointGoal]);

  const loadGameState = useCallback(async (): Promise<boolean> => {
    if (isMultiplayer) return false;
    try {
      const savedData = await SecureStore.getItemAsync(GAME_STATE_KEY);
      if (!savedData) return false;
      
      const parsed = JSON.parse(savedData);
      if (parsed.mode !== mode || parsed.pointGoal !== pointGoal) {
        await SecureStore.deleteItemAsync(GAME_STATE_KEY);
        return false;
      }
      
      const savedAt = parsed.savedAt || 0;
      const age = Date.now() - savedAt;
      if (age > 30 * 60 * 1000) {
        await SecureStore.deleteItemAsync(GAME_STATE_KEY);
        return false;
      }
      
      console.log('[Game] Restoring saved game state');
      setLocalGameState(parsed.gameState);
      if (parsed.selectedCard) setSelectedCard(parsed.selectedCard);
      return true;
    } catch (err) {
      console.error('[Game] Failed to load game state:', err);
      return false;
    }
  }, [isMultiplayer, mode, pointGoal]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (gameStateRef.current && !isMultiplayer) {
          saveGameState(gameStateRef.current);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [saveGameState, isMultiplayer]);

  useEffect(() => {
    if (isMultiplayer) {
      connect();
      return () => {
        leaveLobby();
        disconnect();
      };
    } else {
      loadGameState().then((restored) => {
        if (!restored) {
          initializeLocalGame();
        }
      });
    }
  }, [isMultiplayer, mode, pointGoal]);

  const initializeLocalGame = () => {
    const deck = mode === 'ace_high' ? generateStandardDeck() : generateJJDDDeck();
    const shuffledDeck = shuffleArray(deck);
    
    const players: Player[] = POSITIONS.map((position, index) => ({
      id: index === 0 ? localPlayerId : `bot-${index}`,
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

    // Random starter for first round (0-3)
    const randomStarter = Math.floor(Math.random() * 4);
    // Dealer is clockwise behind the starter
    const dealerIndex = (randomStarter + 3) % 4;

    setLocalGameState({
      id: `game-${Date.now()}`,
      mode,
      phase: 'bidding',
      players,
      teams,
      currentPlayerIndex: randomStarter,
      dealerIndex: dealerIndex,
      roundStarterIndex: randomStarter,
      currentTrick: { cards: [], leadSuit: null, winnerId: null },
      spadesBroken: false,
      roundNumber: 1,
      winningScore: POINT_GOAL_VALUES[pointGoal],
    });
  };

  const calculateBotBid = useCallback((hand: Card[], gameMode: GameMode): number => {
    let bid = 0;
    hand.forEach((card) => {
      // Jokers are now suit 'spades' with value 'BJ' or 'LJ'
      if (card.value === 'BJ') bid += 1.5;
      else if (card.value === 'LJ') bid += 1.2;
      else if (card.suit === 'spades' && card.value === '2' && gameMode === 'joker_joker_deuce_deuce') bid += 1;
      else if (card.suit === 'diamonds' && card.value === '2' && gameMode === 'joker_joker_deuce_deuce') bid += 1;
      else if (card.suit === 'spades' && card.numericValue >= 12) bid += 1;
      else if (card.numericValue === 14) bid += 0.8;
      else if (card.numericValue === 13) bid += 0.5;
    });
    return Math.max(1, Math.min(13, Math.round(bid + Math.random() * 2 - 1)));
  }, []);

  const selectBotCard = useCallback((state: GameState, playerIndex: number): Card => {
    const player = state.players[playerIndex];
    const hand = player.hand;
    
    // Use the shared getPlayableCards function - same logic as server
    const playableCards = getPlayableCards(hand, state.currentTrick.leadSuit, state.spadesBroken, state.mode);
    
    if (playableCards.length === 0) {
      // Fallback - shouldn't happen
      return hand[0];
    }
    
    // Simple bot strategy: pick a random playable card
    // Could be improved with smarter AI later
    return playableCards[Math.floor(Math.random() * playableCards.length)];
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
        currentPlayerIndex: allBid ? (prev.roundStarterIndex ?? 0) : (prev.currentPlayerIndex + 1) % 4,
      };
    });
  }, [localGameState, isMultiplayer, wsPlaceBid]);

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
          return { ...p, hand: p.hand.filter((c) => c.id !== card.id) };
        }
        return p;
      });
      
      const newTrickCards = [...prev.currentTrick.cards, { playerId: currentPlayer.id, card }];
      // When a joker leads, treat it as spades lead (jokers are trump)
      const leadSuit = prev.currentTrick.leadSuit || (card.suit === 'joker' ? 'spades' : card.suit);
      
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
          
          // Rotate starter clockwise from previous round's starter
          const prevStarter = prev.roundStarterIndex ?? 0;
          const nextStarter = (prevStarter + 1) % 4;
          const nextDealer = (nextStarter + 3) % 4;
          
          return {
            ...prev,
            players: newDealtPlayers,
            teams: finalTeams,
            currentTrick: { cards: [], leadSuit: null, winnerId: null },
            phase: 'bidding',
            currentPlayerIndex: nextStarter,
            dealerIndex: nextDealer,
            roundStarterIndex: nextStarter,
            roundNumber: prev.roundNumber + 1,
            spadesBroken: false,
          };
        }
        
        setTimeout(() => {
          setLocalGameState((state) => {
            if (!state) return state;
            return { ...state, currentTrick: { cards: [], leadSuit: null, winnerId: null }, currentPlayerIndex: winnerPlayerIndex };
          });
        }, 1500);
        
        return { ...prev, players: updatedPlayers, teams: updatedTeams, currentTrick: { cards: newTrickCards, leadSuit, winnerId }, spadesBroken };
      }
      
      return { ...prev, players: newPlayers, currentTrick: { cards: newTrickCards, leadSuit, winnerId: null }, currentPlayerIndex: (prev.currentPlayerIndex + 1) % 4, spadesBroken };
    });
    
    setSelectedCard(null);
  }, [localGameState, isMultiplayer, wsPlayCard]);

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
      
      // Show interstitial ad after game completion, then show game over modal
      const handleGameOver = async () => {
        // Check if still mounted before proceeding
        if (!isMountedRef.current) return;
        
        // Always try to show interstitial after game completion
        // The hook handles hasRemoveAds check internally
        if (!hasRemoveAds) {
          try {
            await showInterstitialAd();
          } catch (err) {
            console.log('Interstitial ad failed, continuing to game over modal');
          }
        }
        // Only set state if still mounted
        if (isMountedRef.current) {
          setShowGameOverModal(true);
        }
      };
      
      // Small delay to let the final trick display, then show ad/modal
      // Store timeout ref for cleanup
      gameOverTimeoutRef.current = setTimeout(handleGameOver, 1500);
    }
    
    if (currentPhase === 'bidding' && previousPhaseRef.current !== 'bidding') {
      gameCompletedRef.current = false;
      setShowGameOverModal(false);
    }
    
    previousPhaseRef.current = currentPhase || null;
  }, [gameState?.phase, hasRemoveAds, showInterstitialAd, recordGameCompleted]);

  // Bot AI for solo mode
  useEffect(() => {
    if (isMultiplayer) return;
    if (!gameState) return;
    if (gameState.phase !== 'bidding' && gameState.phase !== 'playing') return;
    
    // Don't act if trick is complete (waiting for animation/clear)
    if (gameState.phase === 'playing' && gameState.currentTrick.cards.length === 4) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isBot) return;
    
    // Schedule bot action with a delay
    const timer = setTimeout(() => {
      const state = gameStateRef.current;
      if (!state) return;
      
      // Re-check conditions with fresh state
      if (state.phase === 'playing' && state.currentTrick.cards.length === 4) return;
      
      const botPlayer = state.players[state.currentPlayerIndex];
      if (!botPlayer || !botPlayer.isBot) return;
      
      if (state.phase === 'bidding') {
        handleBidRef.current(calculateBotBid(botPlayer.hand, state.mode));
      } else if (state.phase === 'playing') {
        handlePlayCardRef.current(selectBotCard(state, state.currentPlayerIndex));
      }
    }, 600 + Math.random() * 400);
    
    return () => clearTimeout(timer);
  }, [gameState?.currentPlayerIndex, gameState?.phase, gameState?.currentTrick.cards.length, calculateBotBid, selectBotCard, isMultiplayer]);

  if (!gameState) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text, fontSize: 18 }}>
            {isMultiplayer ? 'Connecting to game...' : 'Loading...'}
          </Text>
          {isMultiplayer && !isConnected && (
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>
              Establishing connection...
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const myPlayer = gameState.players.find((p) => p.id === playerId) || gameState.players.find((p) => p.position === 'south');
  const partner = gameState.players.find((p) => p.position === 'north');
  const westPlayer = gameState.players.find((p) => p.position === 'west');
  const eastPlayer = gameState.players.find((p) => p.position === 'east');

  const getTeamColor = (player: Player) => {
    const teamIndex = gameState.teams.findIndex((t) => t.players.includes(player.id));
    return teamIndex === 0 ? colors.primary : colors.accent;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={async () => {
            if (gameState.phase !== 'game_over' && gameState.phase !== 'waiting') {
              await recordGameAbandoned();
            }
            await SecureStore.deleteItemAsync(GAME_STATE_KEY);
            router.back();
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Scoreboard teams={gameState.teams} players={gameState.players} winningScore={gameState.winningScore} />
        {isMultiplayer && (
          <View style={[styles.connectionStatus, { backgroundColor: isConnected ? '#22c55e20' : '#ef444420' }]}>
            <Ionicons 
              name={isConnected ? 'wifi' : 'wifi-outline'} 
              size={14} 
              color={isConnected ? colors.success : colors.error} 
            />
            <Text style={{ color: isConnected ? colors.success : colors.error, fontSize: 11 }}>
              {isConnected ? 'Live' : 'Offline'}
            </Text>
          </View>
        )}
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

      {/* Game Over Modal */}
      <Modal
        visible={showGameOverModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons 
              name="trophy" 
              size={64} 
              color={colors.primary} 
              style={{ marginBottom: 16 }} 
            />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Game Over!</Text>
            {gameState && (() => {
              const winningTeamIndex = gameState.teams.findIndex(t => t.score >= gameState.winningScore);
              const winningTeam = winningTeamIndex !== -1 ? gameState.teams[winningTeamIndex] : null;
              const isPlayerWinner = winningTeam?.players.includes(playerId);
              return (
                <>
                  <Text style={[styles.modalSubtitle, { color: isPlayerWinner ? colors.success : colors.error }]}>
                    {isPlayerWinner ? 'You Win!' : 'You Lose'}
                  </Text>
                  <View style={styles.finalScoreContainer}>
                    {gameState.teams.map((team, idx) => (
                      <View key={idx} style={styles.teamScoreRow}>
                        <Text style={[styles.teamName, { color: colors.textSecondary }]}>
                          {team.name}:
                        </Text>
                        <Text style={[styles.teamScore, { color: colors.text }]}>
                          {team.score}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={async () => {
                setShowGameOverModal(false);
                await SecureStore.deleteItemAsync(GAME_STATE_KEY);
                router.back();
              }}
            >
              <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>
                Return Home
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
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
    minWidth: 75,
    zIndex: 1,
  },
  eastPlayer: {
    minWidth: 75,
    zIndex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
  },
  finalScoreContainer: {
    width: '100%',
    marginBottom: 24,
  },
  teamScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  teamName: {
    fontSize: 16,
  },
  teamScore: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
