import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColorScheme';
import { GameMode, PointGoal } from '@/constants/game';

type OnlineChoice = 'quick' | 'create' | 'join';

const modes: { value: GameMode; title: string; description: string; icon: 'star-outline' | 'diamond-outline' }[] = [
  {
    value: 'ace_high',
    title: 'Ace High',
    description: 'Classic Spades rules. Aces lead the table.',
    icon: 'star-outline',
  },
  {
    value: 'joker_joker_deuce_deuce',
    title: 'Joker Joker Deuce Deuce',
    description: 'A bigger deck with four high cards in play.',
    icon: 'diamond-outline',
  },
];

const goals: PointGoal[] = ['100', '300', '500'];

export default function OnlineScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: GameMode; points?: PointGoal }>();
  const [choice, setChoice] = useState<OnlineChoice>('quick');
  const [mode, setMode] = useState<GameMode>(
    params.mode === 'joker_joker_deuce_deuce' ? params.mode : 'ace_high'
  );
  const [points, setPoints] = useState<PointGoal>(
    params.points === '100' || params.points === '500' ? params.points : '300'
  );
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectChoice = (next: OnlineChoice) => {
    Haptics.selectionAsync().catch(() => {});
    setChoice(next);
  };

  const selectMode = (next: GameMode) => {
    Haptics.selectionAsync().catch(() => {});
    setMode(next);
  };

  const selectPoints = (next: PointGoal) => {
    Haptics.selectionAsync().catch(() => {});
    setPoints(next);
  };

  const continueToGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (choice === 'quick') {
      router.push(`/matchmaking?mode=${mode}&points=${points}`);
      return;
    }
    if (choice === 'create') {
      router.push(`/private-room?mode=${mode}&points=${points}&intent=create`);
      return;
    }
    router.push('/private-room?intent=join');
  };

  const isRuleSelectionVisible = choice !== 'join';

  return (
    <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(280)} style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            hitSlop={8}
            testID="button-online-back"
          >
            <Ionicons name="arrow-back" size={23} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>ONLINE PLAY</Text>
            <Text style={styles.title}>Find your table.</Text>
          </View>
          <View style={styles.headerMark}>
            <Ionicons name="people-outline" size={21} color={colors.primary} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(360)} style={styles.intro}>
          <Text style={styles.subtitle}>
            Choose how you want to play. We&apos;ll take care of the rest.
          </Text>
          <View style={styles.secureLine}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.success} />
            <Text style={styles.secureText}>Matched with players ready to deal</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(110).duration(360)}>
          <Text style={styles.sectionLabel}>PLAY TYPE</Text>
          <View style={styles.choiceList}>
            <ChoiceCard
              selected={choice === 'quick'}
              icon="flash-outline"
              title="Quick Match"
              description="Find players now; BOT seats may fill after the wait"
              colors={colors}
              styles={styles}
              onPress={() => selectChoice('quick')}
              testID="button-online-quick-match"
            />
            <ChoiceCard
              selected={choice === 'create'}
              icon="add-circle-outline"
              title="Create Private Room"
              description="Set the rules and invite your people"
              colors={colors}
              styles={styles}
              onPress={() => selectChoice('create')}
              testID="button-online-create-room"
            />
            <ChoiceCard
              selected={choice === 'join'}
              icon="key-outline"
              title="Join Private Room"
              description="Enter a room code from your host"
              colors={colors}
              styles={styles}
              onPress={() => selectChoice('join')}
              testID="button-online-join-room"
            />
          </View>
        </Animated.View>

        {choice === 'join' && (
          <Animated.View entering={FadeInDown.duration(280)} style={styles.hostNote} testID="text-host-rules">
            <View style={styles.hostIcon}>
              <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.hostCopy}>
              <Text style={styles.hostTitle}>The host sets the rules</Text>
              <Text style={styles.hostDescription}>
                Game mode and point goal are chosen by the room host. You&apos;ll see them before you sit down.
              </Text>
            </View>
          </Animated.View>
        )}

        {isRuleSelectionVisible && (
          <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.rulesPanel}>
            <View style={styles.rulesHeading}>
              <View>
                <Text style={styles.sectionLabel}>TABLE RULES</Text>
                <Text style={styles.rulesTitle}>Make it your game.</Text>
              </View>
              <Ionicons name="options-outline" size={21} color={colors.textTertiary} />
            </View>

            <Text style={styles.fieldLabel}>GAME MODE</Text>
            <View style={styles.modeList}>
              {modes.map((item) => (
                <RuleOption
                  key={item.value}
                  selected={mode === item.value}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  colors={colors}
                  styles={styles}
                  onPress={() => selectMode(item.value)}
                  testID={`button-online-mode-${item.value}`}
                />
              ))}
            </View>

            <Text style={[styles.fieldLabel, styles.goalLabel]}>POINT GOAL</Text>
            <View style={styles.goalRow}>
              {goals.map((goal) => (
                <Pressable
                  key={goal}
                  onPress={() => selectPoints(goal)}
                  style={({ pressed }) => [
                    styles.goal,
                    points === goal && styles.goalSelected,
                    pressed && styles.pressed,
                  ]}
                  testID={`button-online-points-${goal}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: points === goal }}
                >
                  <Text style={[styles.goalNumber, points === goal && styles.goalSelectedText]}>{goal}</Text>
                  <Text style={[styles.goalCaption, points === goal && styles.selectedSubtext]}>points</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(180).duration(360)} style={styles.footer}>
          <Pressable
            onPress={continueToGame}
            style={({ pressed }) => [styles.continueButton, pressed && styles.continuePressed]}
            testID="button-online-continue"
            accessibilityRole="button"
          >
            <Text style={styles.continueText}>
              {choice === 'quick' ? 'Find a Match' : choice === 'create' ? 'Set Up Room' : 'Enter Room Code'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
          </Pressable>
          <Text style={styles.footerHint}>
            {choice === 'quick' ? 'You can leave the queue at any time.' : 'Room codes keep invitations simple.'}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChoiceCard({ selected, icon, title, description, colors, styles, onPress, testID }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.choiceCard, selected && styles.choiceSelected, pressed && styles.pressed]}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={[styles.choiceIcon, selected && { backgroundColor: colors.primary }]}>
        <Ionicons name={icon} size={21} color={selected ? colors.primaryForeground : colors.primary} />
      </View>
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceDescription}>{description}</Text>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={23}
        color={selected ? colors.primary : colors.textTertiary}
      />
    </Pressable>
  );
}

function RuleOption({ selected, icon, title, description, colors, styles, onPress, testID }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.ruleOption, selected && styles.ruleSelected, pressed && styles.pressed]}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Ionicons name={icon} size={19} color={selected ? colors.primary : colors.textSecondary} />
      <View style={styles.ruleCopy}>
        <Text style={[styles.ruleTitle, selected && styles.selectedText]}>{title}</Text>
        <Text style={styles.ruleDescription}>{description}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 34 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    backButton: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    headerCopy: { flex: 1, marginLeft: 14 },
    kicker: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 3 },
    title: { color: colors.text, fontSize: 29, fontWeight: '800', letterSpacing: -0.7 },
    headerMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
    intro: { marginBottom: 27 },
    subtitle: { color: colors.textSecondary, fontSize: 16, lineHeight: 23, maxWidth: 315 },
    secureLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
    secureText: { color: colors.textTertiary, fontSize: 12, fontWeight: '600' },
    sectionLabel: { color: colors.textTertiary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 10 },
    choiceList: { gap: 9 },
    choiceCard: { minHeight: 75, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    choiceSelected: { borderColor: colors.primary, backgroundColor: colors.surface },
    choiceIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
    choiceCopy: { flex: 1, marginHorizontal: 12 },
    choiceTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 3 },
    choiceDescription: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    pressed: { opacity: 0.78 },
    hostNote: { marginTop: 17, padding: 14, borderRadius: 15, flexDirection: 'row', backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
    hostIcon: { width: 30, alignItems: 'center', paddingTop: 1 },
    hostCopy: { flex: 1, marginLeft: 7 },
    hostTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 4 },
    hostDescription: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
    rulesPanel: { marginTop: 25, padding: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    rulesHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 17 },
    rulesTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    fieldLabel: { color: colors.textTertiary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 8 },
    modeList: { gap: 7 },
    ruleOption: { minHeight: 61, borderRadius: 13, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.muted, borderWidth: 1, borderColor: 'transparent' },
    ruleSelected: { borderColor: colors.primary, backgroundColor: colors.surface },
    ruleCopy: { flex: 1, marginHorizontal: 11 },
    ruleTitle: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    ruleDescription: { color: colors.textSecondary, fontSize: 11, lineHeight: 15 },
    radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: colors.textTertiary, alignItems: 'center', justifyContent: 'center' },
    radioSelected: { borderColor: colors.primary },
    radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
    goalLabel: { marginTop: 19 },
    goalRow: { flexDirection: 'row', gap: 8 },
    goal: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: colors.muted, borderWidth: 1, borderColor: 'transparent' },
    goalSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    goalNumber: { color: colors.text, fontSize: 16, fontWeight: '800' },
    goalCaption: { color: colors.textSecondary, fontSize: 10, marginTop: 1 },
    selectedText: { color: colors.primary },
    goalSelectedText: { color: colors.primaryForeground },
    selectedSubtext: { color: colors.primaryForeground },
    footer: { marginTop: 26, alignItems: 'center' },
    continueButton: { width: '100%', minHeight: 56, borderRadius: 15, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: colors.primary },
    continuePressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
    continueText: { color: colors.primaryForeground, fontSize: 16, fontWeight: '800' },
    footerHint: { color: colors.textTertiary, fontSize: 11, marginTop: 11 },
  });