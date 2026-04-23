import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { authenticatedFetch, getStoredUser } from '@/lib/auth';

interface LeaderboardPlayer {
  id: number;
  username: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const colors = useColors();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setError(null);
      const response = await authenticatedFetch('/api/leaderboard?limit=50');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (err) {
      if (__DEV__) console.log('Leaderboard fetch failed:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const user = await getStoredUser();
      if (user) setCurrentUserId(user.id);
    })();
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const styles = createStyles(colors);

  const renderRow = ({ item, index }: { item: LeaderboardPlayer; index: number }) => {
    const rank = index + 1;
    const isMe = currentUserId === item.id;
    const winRate = item.gamesPlayed > 0 ? Math.round((item.gamesWon / item.gamesPlayed) * 100) : 0;
    const medalColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : null;
    return (
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: isMe ? colors.primary : 'transparent' }]} testID={`row-leaderboard-${item.id}`}>
        <View style={styles.rankCell}>
          {medalColor ? (
            <Ionicons name="trophy" size={22} color={medalColor} />
          ) : (
            <Text style={styles.rankText}>{rank}</Text>
          )}
        </View>
        <View style={styles.nameCell}>
          <Text style={[styles.username, isMe && { color: colors.primary }]} numberOfLines={1} testID={`text-username-${item.id}`}>
            {item.username}{isMe ? '  (you)' : ''}
          </Text>
          <Text style={styles.subline}>
            {item.gamesWon}W / {item.gamesPlayed} played • {winRate}%
          </Text>
        </View>
        <View style={styles.ratingCell}>
          <Text style={styles.rating} testID={`text-rating-${item.id}`}>{item.rating}</Text>
          <Text style={styles.ratingLabel}>ELO</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} testID="button-back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLeaderboard} testID="button-retry">
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : players.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Ranked Players Yet</Text>
          <Text style={styles.emptyText}>Play online matches to climb the leaderboard!</Text>
        </View>
      ) : (
        <FlatList
          data={players}
          renderItem={renderRow}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    errorText: { fontSize: 16, color: colors.error, textAlign: 'center' },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: { color: colors.primaryForeground, fontWeight: '600' },
    emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 8 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    listContent: { padding: 16, gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 2,
      gap: 12,
    },
    rankCell: { width: 36, alignItems: 'center', justifyContent: 'center' },
    rankText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
    nameCell: { flex: 1, minWidth: 0 },
    username: { fontSize: 15, fontWeight: '600', color: colors.text },
    subline: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    ratingCell: { alignItems: 'flex-end' },
    rating: { fontSize: 18, fontWeight: '700', color: colors.text },
    ratingLabel: { fontSize: 10, color: colors.textSecondary, letterSpacing: 0.8, fontWeight: '600' },
  });
