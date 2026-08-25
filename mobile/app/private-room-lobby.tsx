import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
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
  type User,
} from '@/lib/auth';
import { useColors } from '@/hooks/useColorScheme';
import { useWebSocket } from '@/hooks/useWebSocket';
import { GameMode, PointGoal } from '@/constants/game';

type RoomPlayer = {
  id: number;
  userId: number | null;
  username: string | null;
  displayName: string | null;
  seatNumber: number;
  team: number;
  ready: boolean;
  isHost: boolean;
  isBot: boolean;
};

type Room = {
  id: string;
  roomCode: string;
  status: string;
  hostUserId: number;
  botFillEnabled: boolean;
  gameMode: GameMode;
  pointGoal: PointGoal;
  gameSessionId?: string;
  players: RoomPlayer[];
};

export default function PrivateRoomLobbyScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const colors = useColors();
  const [room, setRoom] = useState<Room | null>(null);
  const roomRef = useRef<Room | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const goToGame = useCallback((gameId: string, activeRoom?: Room | null) => {
    const mode = activeRoom?.gameMode || roomRef.current?.gameMode || 'ace_high';
    const points = activeRoom?.pointGoal || roomRef.current?.pointGoal || '300';
    router.replace(`/game?type=online&gameId=${gameId}&mode=${mode}&points=${points}`);
  }, [router]);

  const { connectionState } = useWebSocket({
    autoConnect: Boolean(user?.id),
    userId: user?.id,
    onMatchFound: (gameId) => goToGame(gameId),
    onError: (message) => {
      setError(
        /auth|session|sign.?in|unauthor/i.test(message)
          ? 'Your private-room connection could not verify your session. Sign in again.'
          : message
      );
    },
  });

  const returnToLogin = useCallback(() => {
    router.replace({
      pathname: '/auth/login',
      params: { message: 'Your session expired. Sign in again to return to private play.' },
    });
  }, [router]);

  const load = useCallback(async () => {
    if (!roomId) return;
    try {
      const response = await authenticatedFetch(`/api/private-rooms/${roomId}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to load this private room.');
      roomRef.current = data;
      setRoom(data);
      setError('');
      if (data.status === 'in_game' && data.gameSessionId) {
        goToGame(data.gameSessionId, data);
      }
    } catch (loadError) {
      if (loadError instanceof AuthError) {
        returnToLogin();
      } else if (loadError instanceof TypeError) {
        setError('Unable to reach the private-room server. Retrying…');
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this private room.');
      }
    }
  }, [goToGame, returnToLogin, roomId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const prepareLobby = async () => {
      const [storedUser, sessionCookie] = await Promise.all([
        getStoredUser(),
        getStoredSessionCookie(),
      ]);
      if (cancelled) return;
      if (!storedUser || !sessionCookie) {
        returnToLogin();
        return;
      }

      setUser(storedUser);
      await load();
      if (!cancelled) {
        timer = setInterval(() => void load(), 1500);
      }
    };

    void prepareLobby();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [load, returnToLogin]);

  const post = async (path: string, body: object = {}) => {
    if (busy) return null;
    setBusy(true);
    setError('');
    try {
      const response = await authenticatedFetch(`/api/private-rooms/${roomId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.status === 204) return null;
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The room could not be updated.');
      if (data.gameSessionId) goToGame(data.gameSessionId, data);
      else {
        roomRef.current = data;
        setRoom(data);
      }
      return data;
    } catch (postError) {
      if (postError instanceof AuthError) {
        returnToLogin();
      } else if (postError instanceof TypeError) {
        setError('Unable to reach the private-room server. Check your connection and try again.');
      } else {
        setError(postError instanceof Error ? postError.message : 'The room could not be updated.');
      }
      return null;
    } finally {
      setBusy(false);
    }
  };

  if (!room) {
    return (
      <SafeAreaView style={[styles.loadingPage, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingTitle, { color: colors.text }]}>Preparing your private table…</Text>
        {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      </SafeAreaView>
    );
  }

  const host = room.hostUserId === user?.id;
  const me = room.players.find((player) => player.userId === user?.id);
  const socketReady = connectionState === 'authenticated';
  const autoAssign = () => post('settings', {
    teams: room.players.map((player, index) => ({
      playerId: player.id,
      team: index % 2 === 0 ? 1 : 2,
    })),
  });
  const leave = async () => {
    await post(host ? 'close' : 'leave');
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>PRIVATE ROOM</Text>
            <View style={styles.connectionRow}>
              <View style={[styles.connectionDot, { backgroundColor: socketReady ? colors.success : colors.warning }]} />
              <Text style={[styles.connectionText, { color: colors.textSecondary }]}>
                {socketReady ? 'Live connection ready' : 'Connecting securely…'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={leave} disabled={busy} testID="button-leave-private-room">
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Room Code</Text>
        <Text style={[styles.code, { color: colors.text }]}>{room.roomCode}</Text>
        <Text style={[styles.rules, { color: colors.textSecondary }]}>
          {room.gameMode === 'ace_high' ? 'Ace High' : 'Joker Joker Deuce Deuce'} · {room.pointGoal} points
        </Text>

        <View style={styles.shareRow}>
          <TouchableOpacity
            style={[styles.smallButton, { borderColor: colors.primary }]}
            onPress={() => {
              Clipboard.setString(room.roomCode);
              Alert.alert('Copied', 'Room code copied.');
            }}
          >
            <Text style={[styles.smallButtonText, { color: colors.primary }]}>Copy Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, { borderColor: colors.primary }]}
            onPress={() => Share.share({ message: `Join my House Spades game.\n\nRoom Code: ${room.roomCode}` })}
          >
            <Text style={[styles.smallButtonText, { color: colors.primary }]}>Share Code</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.section, { color: colors.text }]}>PLAYERS</Text>
        {[1, 2, 3, 4].map((seat) => {
          const player = room.players.find((candidate) => candidate.seatNumber === seat);
          return (
            <View key={seat} style={[styles.player, { borderColor: colors.border }]}>
              <View>
                <Text style={[styles.playerName, { color: player ? colors.text : colors.textSecondary }]}>
                  {seat}. {player ? (player.displayName || player.username) : 'Waiting…'}
                  {player?.isBot ? ' (BOT)' : ''}
                </Text>
                {player && (
                  <Text style={{ color: colors.textSecondary }}>
                    Team {player.team} · {player.isHost ? 'Host' : player.ready ? 'Ready' : 'Not Ready'}
                  </Text>
                )}
              </View>
              {host && player && !player.isHost && (
                <TouchableOpacity onPress={() => post('kick', { playerId: player.id })}>
                  <Ionicons name="remove-circle-outline" size={24} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {host ? (
          <>
            <View style={styles.setting}>
              <Text style={[styles.settingText, { color: colors.text }]}>Fill Empty Seats With Bots</Text>
              <Switch
                value={room.botFillEnabled}
                onValueChange={(value) => post('settings', { botFillEnabled: value })}
              />
            </View>
            <TouchableOpacity
              style={[styles.smallButton, styles.fullButton, { borderColor: colors.primary }]}
              onPress={autoAssign}
              disabled={busy}
            >
              <Text style={[styles.smallButtonText, { color: colors.primary }]}>Auto Assign Teams</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy || !socketReady}
              style={[
                styles.start,
                { backgroundColor: colors.primary },
                (busy || !socketReady) && styles.disabled,
              ]}
              onPress={() => post('start')}
              testID="button-start-private-game"
            >
              <Text style={[styles.startText, { color: colors.primaryForeground }]}>Start Game</Text>
            </TouchableOpacity>
          </>
        ) : me && !me.isHost ? (
          <TouchableOpacity
            disabled={busy}
            style={[styles.start, { backgroundColor: colors.primary }, busy && styles.disabled]}
            onPress={() => post('ready', { ready: !me.ready })}
          >
            <Text style={[styles.startText, { color: colors.primaryForeground }]}>
              {me.ready ? 'Not Ready' : 'Ready'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        {busy && <ActivityIndicator color={colors.primary} style={styles.busy} />}
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          The host transfers to the longest-connected player if the host leaves the lobby.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 22, paddingBottom: 36 },
  loadingPage: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { fontSize: 18, fontWeight: '700', marginTop: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 6 },
  connectionDot: { width: 7, height: 7, borderRadius: 4 },
  connectionText: { fontSize: 12, fontWeight: '600' },
  codeLabel: { textAlign: 'center', marginTop: 18 },
  code: { textAlign: 'center', fontSize: 38, fontWeight: '900', letterSpacing: 9 },
  rules: { textAlign: 'center', fontSize: 13, fontWeight: '600', marginTop: 5 },
  shareRow: { flexDirection: 'row', gap: 12, marginTop: 15 },
  smallButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: { fontWeight: '700' },
  fullButton: { flex: 0, alignSelf: 'stretch' },
  section: { fontWeight: '800', fontSize: 18, marginTop: 28, marginBottom: 8 },
  player: {
    minHeight: 58,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerName: { fontSize: 16, fontWeight: '600' },
  setting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 18 },
  settingText: { fontSize: 16, fontWeight: '600', flex: 1 },
  start: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  startText: { fontSize: 18, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  error: { textAlign: 'center', marginTop: 12, fontSize: 14, lineHeight: 20 },
  busy: { marginTop: 12 },
  note: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 14 },
});
