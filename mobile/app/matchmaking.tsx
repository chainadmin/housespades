import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

export default function MatchmakingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: GameMode; points: PointGoal }>();
  const colors = useColors();
  
  const [playersFound, setPlayersFound] = useState(1);
  const [status, setStatus] = useState('Joining matchmaking queue...');
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
      setStatus('Match found! Starting game...');
      setPlayersFound(4);
      
      setTimeout(() => {
        router.replace(`/game?mode=${params.mode}&points=${params.points}&type=multiplayer&gameId=${gameId}`);
      }, 1000);
    },
    onAuthenticated: () => {
      setIsAuthenticated(true);
    },
    onError: (message) => {
      console.error('[Matchmaking] WebSocket error:', message);
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
        setStatus('Sign in required for online play');
        setTimeout(() => {
          router.replace('/auth/login');
        }, 2000);
      }
    };
    
    initMatchmaking();

    return () => {
      leaveMatchmaking();
      disconnect();
    };
  }, [params.mode, params.points]);

  useEffect(() => {
    if (userId && !isConnected) {
      setStatus('Connecting...');
      connect();
    }
  }, [userId, isConnected, connect]);

  useEffect(() => {
    if (isConnected && !isAuthenticated) {
      setStatus('Authenticating...');
    }
  }, [isConnected, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !inQueueRef.current) {
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
        setStatus('Searching for players...');
      } else {
        const data = await response.json();
        setStatus(data.message || 'Failed to join queue');
      }
    } catch (err) {
      console.error('Failed to join matchmaking:', err);
      setStatus('Connection error. Please try again.');
    }
  };

  const leaveMatchmaking = async () => {
    inQueueRef.current = false;
    
    try {
      await authenticatedFetch('/api/matchmaking/leave', { method: 'POST' });
    } catch (err) {
      console.error('Failed to leave matchmaking:', err);
    }
  };

  const handleCancel = () => {
    leaveMatchmaking();
    disconnect();
    router.back();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
        <Ionicons name="close" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Animated.View style={[styles.spinner, animatedStyle]}>
          <View style={[styles.spinnerArc, { borderColor: colors.primary }]} />
        </Animated.View>

        <Text style={styles.title}>Finding Match</Text>
        <Text style={styles.status}>{status}</Text>

        <View style={styles.playersContainer}>
          {[0, 1, 2, 3].map((index) => (
            <View 
              key={index} 
              style={[
                styles.playerSlot,
                { backgroundColor: index < playersFound ? colors.primary : colors.muted },
              ]}
            >
              <Ionicons 
                name={index < playersFound ? 'person' : 'person-outline'} 
                size={24} 
                color={index < playersFound ? colors.primaryForeground : colors.textTertiary} 
              />
            </View>
          ))}
        </View>

        <Text style={styles.playersText}>{playersFound}/4 Players</Text>

        <View style={styles.modeInfo}>
          <Text style={styles.modeLabel}>Mode</Text>
          <Text style={styles.modeValue}>
            {params.mode === 'ace_high' ? 'Ace High' : 'Joker Joker Deuce Deuce'}
          </Text>
          <Text style={styles.modeLabel}>Goal</Text>
          <Text style={styles.modeValue}>{params.points} Points</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      
      <View style={styles.adContainer}>
        <AdBanner />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backButton: {
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
    },
    playersContainer: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
    },
    playerSlot: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playersText: {
      fontSize: 16,
      color: colors.textSecondary,
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
