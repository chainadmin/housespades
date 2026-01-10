import { useState, useEffect } from 'react';
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

export default function MatchmakingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: GameMode; points: PointGoal }>();
  const colors = useColors();
  
  const [playersFound, setPlayersFound] = useState(1);
  const [status, setStatus] = useState('Searching for players...');
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => {
      setPlayersFound(2);
      setStatus('Found 1 opponent...');
    }, 2000));

    timers.push(setTimeout(() => {
      setPlayersFound(3);
      setStatus('Found 2 opponents...');
    }, 3500));

    timers.push(setTimeout(() => {
      setPlayersFound(4);
      setStatus('Match found! Starting game...');
    }, 5000));

    timers.push(setTimeout(() => {
      router.replace(`/game?mode=${params.mode}&points=${params.points}&type=online`);
    }, 6000));

    return () => timers.forEach(clearTimeout);
  }, [params.mode, params.points]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
                { backgroundColor: index < playersFound ? colors.primary : colors.surface },
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

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
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
    },
    cancelText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '600',
    },
  });
