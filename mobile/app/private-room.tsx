import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AuthError,
  authenticatedFetch,
  getStoredSessionCookie,
  getStoredUser,
} from '@/lib/auth';
import { useColors } from '@/hooks/useColorScheme';
import { GameMode, PointGoal } from '@/constants/game';

export default function PrivateRoomScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: GameMode;
    points?: PointGoal;
    intent?: 'create' | 'join';
  }>();
  const mode: GameMode = params.mode === 'joker_joker_deuce_deuce' ? params.mode : 'ace_high';
  const points: PointGoal = params.points === '100' || params.points === '500' ? params.points : '300';
  const [joining, setJoining] = useState(params.intent === 'join');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const normalized = code.toUpperCase().replace(/\s/g, '');

  const returnToLogin = () => {
    router.replace({
      pathname: '/auth/login',
      params: { message: 'Your session expired. Sign in again to use private rooms.' },
    });
  };

  const request = async (path: string, body: object) => {
    if (busy) return;
    setBusy(true);
    setError('');

    const [user, sessionCookie] = await Promise.all([
      getStoredUser(),
      getStoredSessionCookie(),
    ]);
    if (!user || !sessionCookie) {
      setBusy(false);
      returnToLogin();
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await authenticatedFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to open the private room.');
      }
      router.replace(`/private-room-lobby?roomId=${data.id}`);
    } catch (requestError) {
      if (requestError instanceof AuthError) {
        returnToLogin();
      } else if (requestError instanceof Error && requestError.name === 'AbortError') {
        setError('The private-room server took too long to respond. Please try again.');
      } else if (requestError instanceof TypeError) {
        setError('Unable to reach the private-room server. Check your connection and try again.');
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Unable to open the private room.');
      }
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}
          testID="button-private-room-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>PRIVATE TABLE</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {joining ? 'Enter a room code.' : 'Set up your room.'}
          </Text>
          <Text style={[styles.copy, { color: colors.textSecondary }]}>
            {joining
              ? 'Use the code shared by the host. Their game mode and point goal will apply.'
              : 'Create a private table, then share its code with the players you want to invite.'}
          </Text>
        </View>

        {!joining ? (
          <View style={styles.actions}>
            <View style={[styles.rulesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.ruleRow}>
                <Ionicons name="layers-outline" size={20} color={colors.primary} />
                <View style={styles.ruleCopy}>
                  <Text style={[styles.ruleLabel, { color: colors.textTertiary }]}>GAME MODE</Text>
                  <Text style={[styles.ruleValue, { color: colors.text }]}>
                    {mode === 'ace_high' ? 'Ace High' : 'Joker Joker Deuce Deuce'}
                  </Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.ruleRow}>
                <Ionicons name="flag-outline" size={20} color={colors.primary} />
                <View style={styles.ruleCopy}>
                  <Text style={[styles.ruleLabel, { color: colors.textTertiary }]}>POINT GOAL</Text>
                  <Text style={[styles.ruleValue, { color: colors.text }]}>{points} points</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              disabled={busy}
              style={[styles.button, { backgroundColor: colors.primary }, busy && styles.disabled]}
              onPress={() => request('/api/private-rooms', { gameMode: mode, pointGoal: points })}
              testID="button-create-private-room"
            >
              {busy ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Create Room</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy}
              style={[styles.outline, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => {
                setError('');
                setJoining(true);
              }}
              testID="button-switch-to-join-room"
            >
              <Ionicons name="key-outline" size={19} color={colors.primary} />
              <Text style={[styles.outlineText, { color: colors.text }]}>I Have a Room Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <Text style={[styles.label, { color: colors.text }]}>Room Code</Text>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              value={normalized}
              onChangeText={setCode}
              placeholder="XXXXX"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                { color: colors.text, borderColor: error ? colors.error : colors.primary, backgroundColor: colors.card },
              ]}
              testID="input-private-room-code"
            />
            <TouchableOpacity
              disabled={busy || normalized.length < 5}
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                (busy || normalized.length < 5) && styles.disabled,
              ]}
              onPress={() => request('/api/private-rooms/join', { code: normalized })}
              testID="button-join-private-room"
            >
              {busy ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Join Room</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy}
              style={styles.textButton}
              onPress={() => {
                setError('');
                setJoining(false);
              }}
            >
              <Text style={[styles.textButtonLabel, { color: colors.primary }]}>Create a room instead</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: `${colors.error}12`, borderColor: colors.error }]}>
            <Ionicons name="alert-circle-outline" size={19} color={colors.error} />
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20 },
  flex: { flex: 1 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { marginTop: 30 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 31, lineHeight: 38, fontWeight: '800' },
  copy: { fontSize: 15, lineHeight: 22, marginTop: 10 },
  actions: { marginTop: 34, gap: 14 },
  rulesCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  ruleRow: { flexDirection: 'row', alignItems: 'center' },
  ruleCopy: { marginLeft: 13 },
  ruleLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  ruleValue: { fontSize: 16, fontWeight: '700', marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 15 },
  button: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  buttonText: { fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  outline: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  outlineText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 15, fontWeight: '700' },
  input: {
    height: 68,
    borderWidth: 2,
    borderRadius: 15,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 8,
  },
  textButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  textButtonLabel: { fontSize: 14, fontWeight: '700' },
  errorBox: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  error: { flex: 1, fontSize: 14, lineHeight: 19 },
});
