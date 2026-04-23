import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColorScheme';
import { GameMode, PointGoal } from '@/constants/game';
import { authenticatedFetch, getStoredUser, User } from '@/lib/auth';

const logoImage = require('@/assets/house-card-logo.png');
const chainLogo = require('@/assets/chain-logo.jpg');

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const [selectedMode, setSelectedMode] = useState<GameMode>('ace_high');
  const [selectedPoints, setSelectedPoints] = useState<PointGoal>('300');
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const storedUser = await getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        try {
          const response = await authenticatedFetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            setUser(data);
          } else {
            setUser(null);
          }
        } catch (fetchErr: any) {
          if (fetchErr?.name === 'AuthError') {
            setUser(null);
          }
          if (__DEV__) console.log('Profile fetch failed:', fetchErr);
        }
      }
    } catch (err) {
      if (__DEV__) console.log('Profile check failed');
      setUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  };

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

  const handlePlaySolo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push(`/game?mode=${selectedMode}&points=${selectedPoints}&type=solo`);
  };

  const handlePlayOnline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.title}>House Spades</Text>
          </View>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/settings')}
              testID="button-settings"
            >
              <Ionicons name="settings-outline" size={26} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/profile')}
              testID="button-profile"
            >
              <Ionicons name="person-circle-outline" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {user && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="trophy-outline" size={16} color={colors.primary} />
              <Text style={styles.statText} testID="text-wins">{user.gamesWon} Wins</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
              <Text style={styles.statText} testID="text-winrate">{winRate}%</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="person-outline" size={12} color={colors.primary} />
              <Text style={styles.ratingText} testID="text-rating">{user.rating}</Text>
            </View>
          </View>
        )}

        {!user && !isCheckingAuth && (
          <TouchableOpacity 
            style={[styles.guestBanner, { backgroundColor: colors.card }]}
            onPress={() => router.push('/auth/login')}
            testID="button-guest-signin"
          >
            <View style={styles.guestBannerContent}>
              <Ionicons name="person-add-outline" size={20} color={colors.primary} />
              <View style={styles.guestBannerText}>
                <Text style={[styles.guestBannerTitle, { color: colors.text }]}>Playing as Guest</Text>
                <Text style={[styles.guestBannerSubtitle, { color: colors.textSecondary }]}>Sign in to play online and track stats</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Welcome{user ? `, ${user.username}` : ''}</Text>
          <Text style={styles.heroSubtitle}>
            {user 
              ? 'Pick your settings below and tap Play.' 
              : 'Play solo against bots or sign in to compete online.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.howToPlayHeader, { backgroundColor: colors.card }]}
          onPress={() => setShowHowToPlay(v => !v)}
          activeOpacity={0.7}
          testID="button-toggle-howtoplay"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.howToPlayHeaderText}>How to Play Spades</Text>
          </View>
          <Ionicons name={showHowToPlay ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {showHowToPlay && (
          <View style={[styles.howToPlayCard, { backgroundColor: colors.card }]}>
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
        )}
      </ScrollView>

      {/* Bottom-anchored options + play */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.optionsRow}>
          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>Mode</Text>
            <View style={styles.segmented}>
              <TouchableOpacity
                style={[styles.segment, selectedMode === 'ace_high' && styles.segmentActive]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setSelectedMode('ace_high'); }}
                testID="button-mode-acehigh"
              >
                <Text style={[styles.segmentText, selectedMode === 'ace_high' && styles.segmentTextActive]}>Ace High</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, selectedMode === 'joker_joker_deuce_deuce' && styles.segmentActive]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setSelectedMode('joker_joker_deuce_deuce'); }}
                testID="button-mode-jjdd"
              >
                <Text style={[styles.segmentText, selectedMode === 'joker_joker_deuce_deuce' && styles.segmentTextActive]}>JJDD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.optionsRow}>
          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>Point Goal</Text>
            <View style={styles.segmented}>
              {(['100', '300', '500'] as PointGoal[]).map((points) => (
                <TouchableOpacity
                  key={points}
                  style={[styles.segment, selectedPoints === points && styles.segmentActive]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setSelectedPoints(points); }}
                  testID={`button-points-${points}`}
                >
                  <Text style={[styles.segmentText, selectedPoints === points && styles.segmentTextActive]}>{points}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.playRow}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.primary }]}
            onPress={handlePlaySolo}
            testID="button-play-solo"
          >
            <Ionicons name="play" size={22} color={colors.primaryForeground} />
            <Text style={[styles.playButtonText, { color: colors.primaryForeground }]}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.onlineButton, { borderColor: colors.primary }]}
            onPress={handlePlayOnline}
            testID="button-play-online"
          >
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={[styles.onlineButtonText, { color: colors.primary }]}>
              {user ? 'Online' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
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
    scrollContent: {
      padding: 20,
      paddingBottom: 24,
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
      gap: 4,
    },
    iconButton: {
      padding: 8,
    },
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
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
      marginLeft: 'auto',
    },
    ratingText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    guestBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 12,
      marginBottom: 16,
    },
    guestBannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    guestBannerText: {
      flex: 1,
    },
    guestBannerTitle: {
      fontSize: 14,
      fontWeight: '600',
    },
    guestBannerSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    heroSection: {
      marginBottom: 16,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 6,
    },
    heroSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    howToPlayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 12,
      marginBottom: 8,
    },
    howToPlayHeaderText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    howToPlayCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    howToPlayContent: {
      gap: 10,
    },
    howToPlayText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    howToPlayBold: {
      fontWeight: '700',
      color: colors.text,
    },
    bottomBar: {
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 10,
    },
    optionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    optionGroup: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    segmented: {
      flexDirection: 'row',
      backgroundColor: colors.muted,
      borderRadius: 10,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: colors.background,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: colors.primary,
    },
    playRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    playButton: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 12,
    },
    playButtonText: {
      fontSize: 17,
      fontWeight: '700',
    },
    onlineButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 2,
    },
    onlineButtonText: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
