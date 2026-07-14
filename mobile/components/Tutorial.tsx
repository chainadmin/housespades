import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';

interface TutorialProps {
  visible: boolean;
  onClose: () => void;
}

interface TutorialStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  lines: { bold?: string; text: string }[];
}

const STEPS: TutorialStep[] = [
  {
    icon: 'people-outline',
    title: 'Welcome to Spades',
    lines: [
      { text: 'Spades is a 4-player card game played in two teams of two. Your partner sits across from you.' },
      { bold: 'Goal:', text: ' Work with your partner to win at least as many tricks ("books") as your team bid. First team to the point goal wins the game.' },
    ],
  },
  {
    icon: 'hand-left-outline',
    title: 'Bidding',
    lines: [
      { text: 'At the start of each round, every player looks at their 13 cards and bids the number of books they expect to win.' },
      { bold: 'Tip:', text: ' Count your high cards (Aces, Kings) and spades. Your bid and your partner\u2019s bid combine into a team bid.' },
    ],
  },
  {
    icon: 'albums-outline',
    title: 'Playing Tricks',
    lines: [
      { text: 'One player leads a card, and everyone else must follow with the same suit if they can. The highest card of the lead suit wins the book \u2014 unless someone plays a trump.' },
      { bold: 'To play:', text: ' Tap a card to select it, then tap it again to confirm. Cards you can\u2019t legally play are dimmed.' },
    ],
  },
  {
    icon: 'flash-outline',
    title: 'Trump Cards',
    lines: [
      { bold: 'Ace High:', text: ' Spades are always trump. Any spade beats any card of another suit. You can\u2019t lead spades until they\u2019ve been "broken".' },
      { bold: 'Joker Joker Deuce Deuce:', text: ' Big Joker, Little Joker, 2\u2660, and 2\u2666 are the highest trumps, followed by the remaining spades.' },
    ],
  },
  {
    icon: 'trophy-outline',
    title: 'Scoring & Bags',
    lines: [
      { bold: 'Make your bid:', text: ' Earn 10 points per book bid, plus 1 point for each extra book (a "bag").' },
      { bold: 'Miss your bid:', text: ' Lose 10 points per book bid.' },
      { bold: 'Watch the bags:', text: ' Collect 10 bags and your team loses 100 points. Bid accurately!' },
    ],
  },
];

export function Tutorial({ visible, onClose }: TutorialProps) {
  const colors = useColors();
  const [stepIndex, setStepIndex] = useState(0);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const handleClose = () => {
    setStepIndex(0);
    onClose();
  };

  const styles = createStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.skipButton} onPress={handleClose} testID="button-tutorial-skip">
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>

          <Animated.View key={stepIndex} entering={FadeIn.duration(250)} style={styles.body}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name={step.icon} size={40} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]} testID="text-tutorial-title">
              {step.title}
            </Text>
            {step.lines.map((line, i) => (
              <Text key={i} style={[styles.line, { color: colors.textSecondary }]}>
                {line.bold ? <Text style={[styles.bold, { color: colors.text }]}>{line.bold}</Text> : null}
                {line.text}
              </Text>
            ))}
          </Animated.View>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === stepIndex ? colors.primary : colors.muted },
                ]}
              />
            ))}
          </View>

          <View style={styles.buttons}>
            {stepIndex > 0 ? (
              <TouchableOpacity
                style={[styles.backButton, { borderColor: colors.border }]}
                onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
                testID="button-tutorial-back"
              >
                <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={() => (isLast ? handleClose() : setStepIndex((i) => i + 1))}
              testID="button-tutorial-next"
            >
              <Text style={[styles.nextText, { color: colors.primaryForeground }]}>
                {isLast ? "Let's Play!" : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 20,
      borderWidth: 1,
      padding: 24,
      paddingTop: 16,
    },
    skipButton: {
      alignSelf: 'flex-end',
      padding: 8,
    },
    skipText: {
      fontSize: 15,
      fontWeight: '500',
    },
    body: {
      alignItems: 'center',
      gap: 12,
      minHeight: 260,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
    },
    line: {
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    bold: {
      fontWeight: '700',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginVertical: 20,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
    },
    backButton: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    backText: {
      fontSize: 16,
      fontWeight: '600',
    },
    nextButton: {
      flex: 2,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    nextText: {
      fontSize: 16,
      fontWeight: '700',
    },
  });
