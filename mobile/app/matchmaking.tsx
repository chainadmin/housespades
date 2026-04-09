import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  useSharedValue,
  Easing 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { GameMode, PointGoal } from '@/constants/game';
import { authenticatedFetch, getStoredUser } from '@/lib/auth';
import { AdBanner } from '@/components/AdBanner';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAds } from '@/hooks/useAds';

type MatchmakingPhase = 'connecting' | 'authenticating' | 'joining' | 'searching' | 'found' | 'error';

export default function MatchmakingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: GameMode; points: PointGoal }>();
  const colors = useColors();
  const { showInterstitialAd, hasRemoveAds } = useAds();
  
  const [phase, setPhase] = useState<MatchmakingPhase>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const rotation = useSharedValue(0);
  
  const inQueueRef = useRef(false);
  const matchFoundRef = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { connect, disconnect, isConnected } = useWebSocket({
    userId,
    onMatchFound: (gameId) => {
      if (matchFoundRef.current) return;
      matchFoundRef.current = true;
      inQueueRef.current = false;
      setPhase('found');
      
      setTimeout(() => {
        router.replace(`/game?mode=${params.mode}&points=${params.points}&type=multiplayer&gameId=${gameId}`);
      }, 1000);
    },
    onAuthenticated: () => {
      setIsAuthenticated(true);
    },
    onError: (message) => {
      if (__DEV__) console.error('[Matchmaking] WebSocket error:', message);
      setPhase('error');
      setErrorMessage(message || 'Connection error');
    },
  });

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    const initMatchmaking = async () => {
      const user = await getStoredUser();
      if (user) {
        setUserId(user.id);
      } else {
        setPhase('error');
        setErrorMessage('Sign in required for online play');
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);
      }
    };
    
    initMatchmaking();

    return () => {
      if (!matchFoundRef.current) {
        leaveMatchmaking();
      }
      disconnect();
    };
  }, [params.mode, params.points]);

  useEffect(() => {
    if (userId && !isConnected) {
      setPhase('connecting');
      connect(true);
    }
  }, [userId, isConnected, connect]);

  useEffect(() => {
    if (isConnected && !isAuthenticated) {
      setPhase('authenticating');
    }
  }, [isConnected, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !inQueueRef.current) {
      setPhase('joining');
      joinMatchmaking();
    }
  }, [isAuthenticated]);

  const joinMatchmaking = async () => {
    try {
      const response = await authenticatedFetch('/api/matchmaking/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameMode: params.mode,
          pointGoal: params.points,
        }),
      });

      if (response.ok) {
        inQueueRef.current = true;
        setPhase('searching');
      } else {
        const data = await response.json();
        setPhase('error');
        setErrorMessage(data.message || 'Failed to join queue');
      }
    } catch (err) {
      if (__DEV__) console.error('Failed to join matchmaking:', err);
      setPhase('error');
      setErrorMessage('Connection error. Please try again.');
    }
  };

  const leaveMatchmaking = async () => {
    inQueueRef.current = false;
    
    try {
      await authenticatedFetch('/api/matchmaking/leave', { method: 'POST' });
    } catch (err) {
      if (__DEV__) console.error('Failed to leave matchmaking:', err);
    }
  };

  const handleCancel = async () => {
    leaveMatchmaking();
    disconnect();
    
    if (!hasRemoveAds) {
      try {
        await showInterstitialAd();
      } catch (err) {
        if (__DEV__) console.log('[Matchmaking] Interstitial ad failed, continuing');
      }
    }
    
    router.back();
  };

  const getStatusText = () => {
    switch (phase) {
      case 'connecting': return 'Connecting to server...';
      case 'authenticating': return 'Authenticating...';
      case 'joining': return 'Joining matchmaking queue...';
      case 'searching': return 'Searching for opponents...';
      case 'found': return 'Match found! Starting game...';
      case 'error': return errorMessage || 'Something went wrong';
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
        <Ionicons name="close" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {phase !== 'found' && phase !== 'error' ? (
          <Animated.View style={[styles.spinner, animatedStyle]}>
            <View style={[styles.spinnerArc, { borderColor: colors.primary }]} />
          </Animated.View>
        ) : phase === 'found' ? (
          <View style={[styles.foundIcon, { backgroundColor: `${colors.success}20` }]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </View>
        ) : (
          <View style={[styles.foundIcon, { backgroundColor: `${colors.error}20` }]}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          </View>
        )}

        <Text style={styles.title}>
          {phase === 'found' ? 'Match Found!' : phase === 'error' ? 'Connection Issue' : 'Finding Match'}
        </Text>
        <Text style={styles.status}>{getStatusText()}</Text>

        <View style={styles.stepsContainer}>
          <StepIndicator
            label="Connected"
            isComplete={isConnected || phase === 'found'}
            isActive={phase === 'connecting'}
            colors={colors}
          />
          <StepIndicator
            label="Authenticated"
            isComplete={isAuthenticated || phase === 'found'}
            isActive={phase === 'authenticating'}
            colors={colors}
          />
          <StepIndicator
            label="In Queue"
            isComplete={inQueueRef.current || phase === 'found'}
            isActive={phase === 'joining' || phase === 'searching'}
            colors={colors}
          />
          <StepIndicator
            label="Match Ready"
            isComplete={phase === 'found'}
            isActive={false}
            colors={colors}
          />
        </View>

        <View style={styles.modeInfo}>
          <Text style={styles.modeLabel}>Mode</Text>
          <Text style={styles.modeValue}>
            {params.mode === 'ace_high' ? 'Ace High' : 'Joker Joker Deuce Deuce'}
          </Text>
          <Text style={styles.modeLabel}>Goal</Text>
          <Text style={styles.modeValue}>{params.points} Points</Text>
        </View>
      </View>

      {phase === 'error' && (
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => {
          setErrorMessage('');
          inQueueRef.current = false;

          if (!isConnected) {
            setPhase('connecting');
            if (userId) {
              disconnect();
              setTimeout(() => connect(true), 300);
            }
          } else if (!isAuthenticated) {
            setPhase('authenticating');
            disconnect();
            setTimeout(() => connect(true), 300);
          } else {
            setPhase('joining');
            joinMatchmaking();
          }
        }}>
          <Ionicons name="refresh-outline" size={20} color={colors.primaryForeground} />
          <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      
      <View style={styles.adContainer}>
        <AdBanner />
      </View>
    </SafeAreaView>
  );
}

function StepIndicator({ label, isComplete, isActive, colors }: {
  label: string;
  isComplete: boolean;
  isActive: boolean;
  colors: ReturnType<typeof import('@/hooks/useColorScheme').useColors>;
}) {
  return (
    <View style={stepStyles.row}>
      <View style={[
        stepStyles.dot,
        {
          backgroundColor: isComplete ? colors.success : isActive ? colors.primary : colors.muted,
          borderColor: isComplete ? colors.success : isActive ? colors.primary : colors.border,
        }
      ]}>
        {isComplete ? (
          <Ionicons name="checkmark" size={12} color="#ffffff" />
        ) : isActive ? (
          <ActivityIndicator size="small" color="#ffffff" style={{ transform: [{ scale: 0.6 }] }} />
        ) : null}
      </View>
      <Text style={[
        stepStyles.label,
        {
          color: isComplete ? colors.success : isActive ? colors.text : colors.textTertiary,
          fontWeight: isActive ? '600' : '400',
        }
      ]}>
        {label}
      </Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
  },
});

const createStyles = (colors: ReturnType<typeof import('@/hooks/useColorScheme').useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeButton: {
      position: 'absolute',
      top: 60,
      right: 20,
      zIndex: 10,
      padding: 8,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    spinner: {
      width: 100,
      height: 100,
      marginBottom: 32,
    },
    spinnerArc: {
      width: '100%',
      height: '100%',
      borderRadius: 50,
      borderWidth: 4,
      borderTopColor: 'transparent',
      borderRightColor: 'transparent',
    },
    foundIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    status: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
      textAlign: 'center',
    },
    stepsContainer: {
      alignSelf: 'stretch',
      paddingHorizontal: 48,
      marginBottom: 32,
    },
    modeInfo: {
      alignItems: 'center',
      gap: 4,
    },
    modeLabel: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 8,
    },
    modeValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 24,
      marginBottom: 12,
      borderRadius: 12,
      padding: 16,
    },
    retryText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButton: {
      marginHorizontal: 24,
      marginBottom: 32,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    adContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  });
