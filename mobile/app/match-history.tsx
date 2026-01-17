import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { authenticatedFetch } from '@/lib/auth';

interface MatchHistoryItem {
  id: number;
  matchId: number;
  finalScore: number;
  opponentScore: number;
  ratingChange: number;
  gameMode: string;
  completedAt: string;
  won: boolean;
}

export default function MatchHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatchHistory();
  }, []);

  const fetchMatchHistory = async () => {
    try {
      const response = await authenticatedFetch('/api/user/match-history');
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
      } else {
        setError('Failed to load match history');
      }
    } catch (err) {
      console.error('Failed to fetch match history:', err);
      setError('Failed to load match history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const styles = createStyles(colors);

  const renderMatch = ({ item }: { item: MatchHistoryItem }) => (
    <View style={[styles.matchCard, { backgroundColor: colors.card }]}>
      <View style={styles.matchHeader}>
        <View style={[styles.resultBadge, { 
          backgroundColor: item.won ? colors.success + '20' : colors.error + '20' 
        }]}>
          <Text style={[styles.resultText, { 
            color: item.won ? colors.success : colors.error 
          }]}>
            {item.won ? 'WIN' : 'LOSS'}
          </Text>
        </View>
        <Text style={styles.gameMode}>{item.gameMode === 'joker_joker_deuce_deuce' ? 'JJDD' : 'Ace High'}</Text>
      </View>
      
      <View style={styles.scoreRow}>
        <Text style={styles.score}>{item.finalScore} - {item.opponentScore}</Text>
        <Text style={[styles.ratingChange, { 
          color: item.ratingChange >= 0 ? colors.success : colors.error 
        }]}>
          {item.ratingChange >= 0 ? '+' : ''}{item.ratingChange}
        </Text>
      </View>
      
      <Text style={styles.matchDate}>{formatDate(item.completedAt)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMatchHistory}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="game-controller-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Matches Yet</Text>
          <Text style={styles.emptyText}>Play some online games to see your match history here!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: colors.primaryForeground,
      fontWeight: '600',
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginTop: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    listContent: {
      padding: 16,
      gap: 12,
    },
    matchCard: {
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    matchHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    resultBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    resultText: {
      fontSize: 12,
      fontWeight: '700',
    },
    gameMode: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    scoreRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    score: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    ratingChange: {
      fontSize: 16,
      fontWeight: '600',
    },
    matchDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });
