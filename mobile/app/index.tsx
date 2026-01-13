import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { GameMode, PointGoal } from '@/constants/game';
import { apiUrl } from '@/config/api';
import * as SecureStore from 'expo-secure-store';

const logoImage = require('@/assets/house-card-logo.png');
const chainLogo = require('@/assets/chain-software-group-logo.png');

interface User {
  id: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const [selectedMode, setSelectedMode] = useState<GameMode>('ace_high');
  const [selectedPoints, setSelectedPoints] = useState<PointGoal>('300');
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(apiUrl('/api/user/profile'), {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        // Not authenticated - redirect to login
        router.replace('/auth/login');
        return;
      }
    } catch (err) {
      console.log('Not authenticated');
      // Not authenticated - redirect to login
      router.replace('/auth/login');
      return;
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Image source={logoImage} style={{ width: 128, height: 128, marginBottom: 24 }} resizeMode="contain" />
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text }}>House Spades</Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        </View>
        <View style={{ paddingBottom: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>Powered by</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={chainLogo} style={{ width: 32, height: 32, borderRadius: 4 }} resizeMode="cover" />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>Chain Software Group</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // If not authenticated after check, don't render (redirect happening)
  if (!user) {
    return null;
  }

  const handlePlaySolo = () => {
    router.push(`/game?mode=${selectedMode}&points=${selectedPoints}&type=solo`);
  };

  const handlePlayOnline = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    router.push(`/matchmaking?mode=${selectedMode}&points=${selectedPoints}`);
  };

  const winRate = user && user.gamesPlayed > 0 
    ? Math.round((user.gamesWon / user.gamesPlayed) * 100) 
    : 0;

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.title}>House Spades</Text>
          </View>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/profile')}
            >
              <Ionicons name="person-circle-outline" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* User stats bar */}
        {user && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="trophy-outline" size={16} color={colors.primary} />
              <Text style={styles.statText}>{user.gamesWon} Wins</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
              <Text style={styles.statText}>{winRate}%</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="person-outline" size={12} color={colors.primary} />
              <Text style={styles.ratingText}>{user.rating}</Text>
            </View>
          </View>
        )}

        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome{user ? `, ${user.username}` : ''}</Text>
          <Text style={styles.welcomeSubtitle}>Choose your game mode and point goal, then jump into a game.</Text>
        </View>

        {/* Play options */}
        <View style={styles.playOptions}>
          <TouchableOpacity style={styles.playCard} onPress={handlePlaySolo}>
            <View style={[styles.playCardIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="game-controller" size={24} color={colors.primary} />
            </View>
            <View style={styles.playCardContent}>
              <Text style={styles.playCardTitle}>Play vs Bots</Text>
              <Text style={styles.playCardDescription}>Practice against AI opponents</Text>
            </View>
            <TouchableOpacity style={styles.playCardButton} onPress={handlePlaySolo}>
              <Text style={styles.playCardButtonText}>Start Solo Game</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playCard} onPress={handlePlayOnline}>
            <View style={[styles.playCardIcon, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="people" size={24} color={colors.accent} />
            </View>
            <View style={styles.playCardContent}>
              <Text style={styles.playCardTitle}>Find Match</Text>
              <Text style={styles.playCardDescription}>Play with others online</Text>
            </View>
            <TouchableOpacity style={[styles.playCardButton, styles.playCardButtonOutline]} onPress={handlePlayOnline}>
              <Text style={styles.playCardButtonOutlineText}>Find Opponents</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Game mode selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Game Mode</Text>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>
                {selectedMode === 'ace_high' ? 'Classic' : 'Custom Rules'}
              </Text>
            </View>
          </View>
          
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeCard,
                selectedMode === 'ace_high' && styles.modeCardSelected,
              ]}
              onPress={() => setSelectedMode('ace_high')}
            >
              <Text style={styles.modeIcon}>♠</Text>
              <Text style={[styles.modeTitle, selectedMode === 'ace_high' && styles.modeTitleSelected]}>
                Ace High
              </Text>
              <Text style={styles.modeDescription}>Classic Spades rules</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeCard,
                selectedMode === 'joker_joker_deuce_deuce' && styles.modeCardSelected,
              ]}
              onPress={() => setSelectedMode('joker_joker_deuce_deuce')}
            >
              <Text style={styles.modeIcon}>★</Text>
              <Text style={[styles.modeTitle, selectedMode === 'joker_joker_deuce_deuce' && styles.modeTitleSelected]}>
                Joker Joker Deuce Deuce
              </Text>
              <Text style={styles.modeDescription}>With Jokers & special 2s</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Point goal selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Point Goal</Text>
          <View style={styles.pointsContainer}>
            {(['100', '300', '500'] as PointGoal[]).map((points) => (
              <TouchableOpacity
                key={points}
                style={[
                  styles.pointsButton,
                  selectedPoints === points && styles.pointsButtonSelected,
                ]}
                onPress={() => setSelectedPoints(points)}
              >
                <Text style={[
                  styles.pointsText,
                  selectedPoints === points && styles.pointsTextSelected,
                ]}>
                  {points}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* How to play */}
        <View style={[styles.howToPlayCard, { backgroundColor: colors.card }]}>
          <Text style={styles.howToPlayTitle}>How to Play Spades</Text>
          <View style={styles.howToPlayContent}>
            <Text style={styles.howToPlayText}>
              <Text style={styles.howToPlayBold}>Objective:</Text> Work with your partner to win at least as many books as you bid. First team to reach the point goal wins.
            </Text>
            <Text style={styles.howToPlayText}>
              <Text style={styles.howToPlayBold}>Bidding:</Text> Each player bids how many books they think they can win. Team bids are combined.
            </Text>
            <Text style={styles.howToPlayText}>
              <Text style={styles.howToPlayBold}>Playing:</Text> Follow the lead suit if possible. Spades are always trump and beat other suits.
            </Text>
            <Text style={styles.howToPlayText}>
              <Text style={styles.howToPlayBold}>Scoring:</Text> Make your bid = 10 points per book bid + 1 point per extra book. Fail = lose 10 points per book bid.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logoImage: {
      width: 40,
      height: 40,
      borderRadius: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      padding: 8,
    },
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 24,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.muted,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ratingText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    welcomeSection: {
      marginBottom: 24,
    },
    welcomeTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
    },
    playOptions: {
      gap: 16,
      marginBottom: 32,
    },
    playCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    playCardIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    playCardContent: {
      marginBottom: 16,
    },
    playCardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    playCardDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    playCardButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    playCardButtonText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontWeight: '600',
    },
    playCardButtonOutline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    playCardButtonOutlineText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    modeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.muted,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeBadgeText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    modeContainer: {
      gap: 12,
    },
    modeCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: colors.border,
    },
    modeCardSelected: {
      borderColor: colors.primary,
    },
    modeIcon: {
      fontSize: 28,
      marginBottom: 8,
      color: colors.text,
    },
    modeTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    modeTitleSelected: {
      color: colors.primary,
    },
    modeDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    pointsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    pointsButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    pointsButtonSelected: {
      borderColor: colors.primary,
    },
    pointsText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    pointsTextSelected: {
      color: colors.primary,
    },
    howToPlayCard: {
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    howToPlayTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    howToPlayContent: {
      gap: 12,
    },
    howToPlayText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    howToPlayBold: {
      fontWeight: '600',
      color: colors.text,
    },
  });
