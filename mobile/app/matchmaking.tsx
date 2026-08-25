import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  useSharedValue,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { GameMode, PointGoal } from '@/constants/game';
import {
  AuthError,
  authenticatedFetch,
  clearAuth,
  getStoredSessionCookie,
  getStoredUser,
} from '@/lib/auth';
import { AdBanner } from '@/components/AdBanner';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAds } from '@/hooks/useAds';

type MatchmakingPhase = 'checking' | 'connecting' | 'authenticating' | 'joining' | 'searching' | 'found' | 'error';
type MatchmakingErrorKind = 'session' | 'server' | 'socket' | 'authentication' | 'matchmaking';

export default function MatchmakingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: GameMode; points: PointGoal }>();
  const colors = useColors();
  const { showInterstitialAd, hasRemoveAds } = useAds();
  
  const mode: GameMode = params.mode === 'joker_joker_deuce_deuce' ? params.mode : 'ace_high';
  const points: PointGoal = params.points === '100' || params.points === '500' ? params.points : '300';
  const [phase, setPhase] = useState<MatchmakingPhase>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorKind, setErrorKind] = useState<MatchmakingErrorKind | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const rotation = useSharedValue(0);
  
  const inQueueRef = useRef(false);
  const matchFoundRef = useRef(false);
  const mountedRef = useRef(true);
  const joinAttemptRef = useRef(0);
  const joinAbortRef = useRef<AbortController | null>(null);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketGenerationRef = useRef(0);
  const resettingAttemptRef = useRef(false);
  const hadAuthenticatedSocketRef = useRef(false);

  const { connect, disconnect, isConnected, isAuthenticated } = useWebSocket({
    userId,
    onMatchFound: (gameId) => {
      if (matchFoundRef.current) return;
      matchFoundRef.current = true;
      inQueueRef.current = false;
      setPhase('found');
      
      navigationTimerRef.current = setTimeout(() => {
        router.replace(`/game?mode=${mode}&points=${points}&type=multiplayer&gameId=${gameId}`);
      }, 450);
    },
    onAuthenticated: () => {
      hadAuthenticatedSocketRef.current = true;
    },
    onDisconnected: () => {
      socketGenerationRef.current += 1;
      inQueueRef.current = false;
      if (
        mountedRef.current &&
        hadAuthenticatedSocketRef.current &&
        !matchFoundRef.current &&
        !resettingAttemptRef.current
      ) {
        setPhase('connecting');
        setErrorKind(null);
        setErrorMessage('');
      }
    },
    onError: (message) => {
      if (__DEV__) console.error('[Matchmaking] WebSocket error:', message);
      const isAuthFailure = /auth|session|sign.?in|unauthor/i.test(message);
      setPhase('error');
      setErrorKind(isAuthFailure ? 'authentication' : 'socket');
      setErrorMessage(
        message ||
        (isAuthFailure
          ? 'Your session could not be verified. Please sign in again.'
          : 'Unable to connect to the online server. Check your connection and try again.')
      );
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
    mountedRef.current = true;
    const validateOnlineSession = async () => {
      setPhase('checking');
      setErrorKind(null);
      setErrorMessage('');

      const [user, sessionCookie] = await Promise.all([
        getStoredUser(),
        getStoredSessionCookie(),
      ]);

      if (!mountedRef.current) return;
      if (!user || !sessionCookie) {
        setPhase('error');
        setErrorKind('session');
        setErrorMessage('Sign in is required for online play.');
        return;
      }

      const controller = new AbortController();
      joinAbortRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await authenticatedFetch('/api/user/profile', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('The online service could not verify your account.');
        }
        const verifiedUser = await response.json();
        if (mountedRef.current) {
          setUserId(verifiedUser.id || user.id);
          setPhase('connecting');
        }
      } catch (error) {
        if (!mountedRef.current) return;
        if (error instanceof AuthError) {
          setErrorKind('session');
          setErrorMessage('Your session has expired. Please sign in again.');
        } else {
          setErrorKind('server');
          setErrorMessage(
            error instanceof Error && error.name === 'AbortError'
              ? 'The online server is taking too long to respond. Please try again.'
              : 'The online server is unavailable right now. Check your connection and try again.'
          );
        }
        setPhase('error');
      } finally {
        clearTimeout(timeout);
      }
    };
    
    validateOnlineSession();

    return () => {
      mountedRef.current = false;
      joinAttemptRef.current += 1;
      joinAbortRef.current?.abort();
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (!matchFoundRef.current) {
        void leaveMatchmaking();
      }
      disconnect();
    };
  }, [mode, points, validationAttempt]);

  useEffect(() => {
    if (userId && !isConnected && phase !== 'error' && !resettingAttemptRef.current) {
      setPhase('connecting');
      connect(true);
    }
  }, [userId, isConnected, connect, phase]);

  useEffect(() => {
    if (isConnected && !isAuthenticated) {
      setPhase('authenticating');
    }
  }, [isConnected, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !inQueueRef.current && !resettingAttemptRef.current) {
      setPhase('joining');
      void joinMatchmaking();
    }
  }, [isAuthenticated]);

  const joinMatchmaking = async () => {
    const attempt = ++joinAttemptRef.current;
    const socketGeneration = socketGenerationRef.current;
    joinAbortRef.current?.abort();
    const controller = new AbortController();
    joinAbortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await authenticatedFetch('/api/matchmaking/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameMode: mode,
          pointGoal: points,
        }),
        signal: controller.signal,
      });
      if (
        !mountedRef.current ||
        attempt !== joinAttemptRef.current ||
        socketGeneration !== socketGenerationRef.current
      ) return;

      if (response.ok) {
        inQueueRef.current = true;
        setErrorKind(null);
        setPhase('searching');
      } else {
        const data = await response.json();
        setPhase('error');
        setErrorKind('matchmaking');
        setErrorMessage(data.error || data.message || 'The matchmaking queue could not be joined. Please try again.');
      }
    } catch (err) {
      if (!mountedRef.current || attempt !== joinAttemptRef.current) return;
      if (__DEV__) console.error('Failed to join matchmaking:', err);
      setPhase('error');
      if (err instanceof AuthError) {
        setErrorKind('session');
        setErrorMessage('Your session expired before matchmaking started. Please sign in again.');
      } else if (err instanceof Error && err.name === 'AbortError') {
        setErrorKind('matchmaking');
        setErrorMessage('Matchmaking took too long to respond. Please try again.');
      } else {
        setErrorKind('server');
        setErrorMessage('The matchmaking service is unavailable. Check your connection and try again.');
      }
    } finally {
      clearTimeout(timeout);
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
    resettingAttemptRef.current = true;
    matchFoundRef.current = true;
    joinAttemptRef.current += 1;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    joinAbortRef.current?.abort();
    if (inQueueRef.current) {
      await leaveMatchmaking();
    }
    socketGenerationRef.current += 1;
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
      case 'checking': return 'Checking the online server and your sign-in session...';
      case 'connecting': return 'Connecting to server...';
      case 'authenticating': return 'Authenticating...';
      case 'joining': return 'Joining matchmaking queue...';
      case 'searching': return 'Searching for opponents... Computer players (marked "BOT") fill any empty seats after about 10 seconds.';
      case 'found': return 'Match found! Starting game...';
      case 'error': return errorMessage || 'Something went wrong';
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const styles = createStyles(colors);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.container}>
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
          {phase === 'found'
            ? 'Match Found!'
            : phase === 'error'
              ? errorKind === 'session' || errorKind === 'authentication'
                ? 'Sign In Needed'
                : errorKind === 'matchmaking'
                  ? 'Matchmaking Issue'
                  : 'Connection Issue'
              : 'Finding Match'}
        </Text>
        <Text style={styles.status}>{getStatusText()}</Text>

        <View style={styles.stepsContainer}>
          <StepIndicator
            label="Connected"
            isComplete={isConnected || phase === 'found'}
            isActive={phase === 'checking' || phase === 'connecting'}
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
            {mode === 'ace_high' ? 'Ace High' : 'Joker Joker Deuce Deuce'}
          </Text>
          <Text style={styles.modeLabel}>Goal</Text>
          <Text style={styles.modeValue}>{points} Points</Text>
          <Text style={styles.modeLabel}>
            If no human opponents are available, seats are filled by computer players clearly labeled "BOT" in-game.
          </Text>
        </View>
      </View>

      {phase === 'error' && (
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={async () => {
          if (errorKind === 'session' || errorKind === 'authentication') {
            resettingAttemptRef.current = true;
            await clearAuth();
            router.replace({
              pathname: '/auth/login',
              params: { message: 'Please sign in again to continue online.' },
            });
            return;
          }

          resettingAttemptRef.current = true;
          const retryGeneration = ++joinAttemptRef.current;
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          joinAbortRef.current?.abort();
          setErrorMessage('');
          setErrorKind(null);
          matchFoundRef.current = false;

          if (inQueueRef.current) {
            await leaveMatchmaking();
          }
          socketGenerationRef.current += 1;
          disconnect();
          if (userId) {
            setPhase('connecting');
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              if (!mountedRef.current || retryGeneration !== joinAttemptRef.current) return;
              resettingAttemptRef.current = false;
              connect(true);
            }, 250);
          } else {
            resettingAttemptRef.current = false;
            setPhase('checking');
            setValidationAttempt((current) => current + 1);
          }
        }}>
          <Ionicons
            name={errorKind === 'session' || errorKind === 'authentication' ? 'log-in-outline' : 'refresh-outline'}
            size={20}
            color={colors.primaryForeground}
          />
          <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
            {errorKind === 'session' || errorKind === 'authentication' ? 'Sign In' : 'Retry'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      
      <View style={styles.adContainer}>
        <AdBanner />
      </View>
      </SafeAreaView>
    </Animated.View>
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
