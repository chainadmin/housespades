import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { GameMode, PointGoal } from '@/constants/game';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const [selectedMode, setSelectedMode] = useState<GameMode>('ace_high');
  const [selectedPoints, setSelectedPoints] = useState<PointGoal>('300');

  const handlePlaySolo = () => {
    router.push(`/game?mode=${selectedMode}&points=${selectedPoints}&type=solo`);
  };

  const handlePlayOnline = () => {
    router.push(`/matchmaking?mode=${selectedMode}&points=${selectedPoints}`);
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>House Spades</Text>
          <Text style={styles.subtitle}>The Ultimate Card Game</Text>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/profile')}
            >
              <Ionicons name="person-circle-outline" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Mode</Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeCard,
                selectedMode === 'ace_high' && styles.modeCardSelected,
              ]}
              onPress={() => setSelectedMode('ace_high')}
            >
              <Text style={styles.modeIcon}>♠️</Text>
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
              <Text style={styles.modeIcon}>🃏</Text>
              <Text style={[styles.modeTitle, selectedMode === 'joker_joker_deuce_deuce' && styles.modeTitleSelected]}>
                Joker Joker Deuce Deuce
              </Text>
              <Text style={styles.modeDescription}>With Jokers & special 2s</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points to Win</Text>
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

        <View style={styles.playButtons}>
          <TouchableOpacity style={styles.playButton} onPress={handlePlaySolo}>
            <Ionicons name="game-controller" size={24} color={colors.primaryForeground} />
            <Text style={styles.playButtonText}>Play vs Bots</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButtonSecondary} onPress={handlePlayOnline}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={styles.playButtonSecondaryText}>Play Online</Text>
          </TouchableOpacity>
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
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
      position: 'relative',
    },
    headerButtons: {
      position: 'absolute',
      right: 0,
      top: 0,
    },
    iconButton: {
      padding: 8,
    },
    title: {
      fontSize: 36,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
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
      backgroundColor: colors.surface,
    },
    modeIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    modeTitle: {
      fontSize: 18,
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
      backgroundColor: colors.surface,
    },
    pointsText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    pointsTextSelected: {
      color: colors.primary,
    },
    playButtons: {
      gap: 12,
      marginTop: 16,
    },
    playButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    playButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primaryForeground,
    },
    playButtonSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      gap: 12,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    playButtonSecondaryText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primary,
    },
  });
