import { View, Text, StyleSheet } from 'react-native';
import { Player, Position } from '@/constants/game';
import { CardBack } from './PlayingCard';
import { useColors } from '@/hooks/useColorScheme';

interface PlayerZoneProps {
  player: Player;
  position: Position;
  isCurrentTurn: boolean;
  teamColor: string;
}

export function PlayerZone({ player, position, isCurrentTurn, teamColor }: PlayerZoneProps) {
  const colors = useColors();
  const isVertical = position === 'west' || position === 'east';

  return (
    <View style={[styles.container, isCurrentTurn && styles.currentTurn]}>
      <View style={styles.infoContainer}>
        <View style={[styles.avatar, { backgroundColor: teamColor }]}>
          <Text style={styles.avatarText}>{player.name.charAt(0)}</Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {player.name}
          </Text>
          {player.bid !== null && (
            <Text style={[styles.bid, { color: colors.textSecondary }]}>
              Bid: {player.bid} | Books: {player.tricks}
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.cardsContainer, isVertical && styles.cardsVertical]}>
        {player.hand.slice(0, Math.min(5, player.hand.length)).map((_, index) => (
          <View
            key={index}
            style={[
              styles.cardWrapper,
              isVertical 
                ? { marginTop: index === 0 ? 0 : -50 }
                : { marginLeft: index === 0 ? 0 : -35 },
            ]}
          >
            <CardBack size="small" />
          </View>
        ))}
        {player.hand.length > 5 && (
          <View style={[styles.moreCards, { backgroundColor: colors.surface }]}>
            <Text style={[styles.moreCardsText, { color: colors.textSecondary }]}>
              +{player.hand.length - 5}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentTurn: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 2,
    borderColor: '#4f46e5',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  nameContainer: {
    alignItems: 'flex-start',
  },
  name: {
    fontWeight: '600',
    fontSize: 14,
  },
  bid: {
    fontSize: 11,
  },
  cardsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardsVertical: {
    flexDirection: 'column',
  },
  cardWrapper: {
    elevation: 1,
  },
  moreCards: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  moreCardsText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
