import { View, Text, StyleSheet } from 'react-native';
import { Team, Player } from '@/constants/game';
import { useColors } from '@/hooks/useColorScheme';

interface ScoreboardProps {
  teams: Team[];
  players: Player[];
  winningScore: number;
}

export function Scoreboard({ teams, players, winningScore }: ScoreboardProps) {
  const colors = useColors();

  const getTeamPlayers = (team: Team) => {
    return team.players.map((pid) => players.find((p) => p.id === pid)?.name || '').join(' & ');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>Score</Text>
      <Text style={[styles.goal, { color: colors.textSecondary }]}>First to {winningScore}</Text>

      {teams.map((team, index) => (
        <View key={team.id} style={styles.teamRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.teamDot, { backgroundColor: index === 0 ? '#4f46e5' : '#f59e0b' }]} />
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
              {getTeamPlayers(team)}
            </Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={[styles.score, { color: colors.text }]}>{team.score}</Text>
            <Text style={[styles.bags, { color: colors.textTertiary }]}>({team.bags} bags)</Text>
          </View>
        </View>
      ))}

      <View style={styles.bidsRow}>
        {teams.map((team, index) => (
          <View key={team.id} style={styles.bidInfo}>
            <Text style={[styles.bidLabel, { color: colors.textSecondary }]}>
              {index === 0 ? 'Your Team' : 'Opponents'}
            </Text>
            <Text style={[styles.bidValue, { color: colors.text }]}>
              {team.totalBid !== null ? `${team.tricksWon}/${team.totalBid}` : '-'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  goal: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  teamName: {
    fontSize: 13,
    flex: 1,
  },
  scoreInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bags: {
    fontSize: 11,
  },
  bidsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  bidInfo: {
    alignItems: 'center',
  },
  bidLabel: {
    fontSize: 11,
  },
  bidValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
