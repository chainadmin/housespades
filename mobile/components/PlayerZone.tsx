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
  const isEast = position === 'east';
  const cardCount = player.hand.length;

  // Compact layout for side players (east/west)
  if (isVertical) {
    return (
      <View style={[
        styles.sideContainer, 
        isCurrentTurn && [styles.currentTurn, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }],
        isEast ? styles.eastAlign : styles.westAlign,
      ]}>
        <View style={[styles.sideInfo, isEast && styles.sideInfoEast]}>
          <View style={[styles.avatarSmall, { backgroundColor: teamColor }]}>
            <Text style={styles.avatarTextSmall}>{player.name.charAt(0)}</Text>
          </View>
          <View style={[styles.sideTextContainer, isEast ? styles.textRight : styles.textLeft]}>
            <Text style={[styles.nameSmall, { color: colors.text }]} numberOfLines={2}>
              {player.name}
            </Text>
            {player.bid !== null && (
              <Text style={[styles.bidSmall, { color: colors.textSecondary }]}>
                {player.bid}/{player.tricks}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.cardsRow}>
          {cardCount > 0 && (
            <View style={styles.cardStack}>
              <CardBack size="tiny" />
              {cardCount > 1 && (
                <View style={styles.stackedCard}>
                  <CardBack size="tiny" />
                </View>
              )}
            </View>
          )}
          <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.countText, { color: colors.text }]}>{cardCount}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Full layout for north player
  return (
    <View style={[
      styles.container, 
      isCurrentTurn && [styles.currentTurn, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }],
    ]}>
      <View style={styles.infoContainer}>
        <View style={[styles.avatar, { backgroundColor: teamColor }]}>
          <Text style={styles.avatarText}>{player.name.charAt(0)}</Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={[styles.name, { color: colors.text }]}>
            {player.name}
          </Text>
          {player.bid !== null && (
            <Text style={[styles.bid, { color: colors.textSecondary }]}>
              Bid: {player.bid} | Books: {player.tricks}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.cardsHorizontal}>
        {cardCount > 0 && (
          <View style={styles.northCardStack}>
            <CardBack size="tiny" />
            {cardCount > 1 && (
              <View style={{ position: 'absolute', left: 8 }}>
                <CardBack size="tiny" />
              </View>
            )}
            {cardCount > 2 && (
              <View style={{ position: 'absolute', left: 16 }}>
                <CardBack size="tiny" />
              </View>
            )}
          </View>
        )}
        <View style={[styles.countBadgeNorth, { backgroundColor: colors.muted }]}>
          <Text style={[styles.countTextNorth, { color: colors.text }]}>{cardCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  sideContainer: {
    padding: 6,
    borderRadius: 8,
    minWidth: 70,
  },
  eastAlign: {
    alignItems: 'flex-end',
  },
  westAlign: {
    alignItems: 'flex-start',
  },
  currentTurn: {
    borderWidth: 2,
  },
  sideInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  sideInfoEast: {
    flexDirection: 'row-reverse',
  },
  sideTextContainer: {
    flexShrink: 1,
  },
  textLeft: {
    alignItems: 'flex-start',
  },
  textRight: {
    alignItems: 'flex-end',
  },
  avatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSmall: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  nameSmall: {
    fontWeight: '600',
    fontSize: 10,
    flexWrap: 'wrap',
  },
  bidSmall: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardStack: {
    position: 'relative',
    height: 40,
    width: 30,
  },
  stackedCard: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  countBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  nameContainer: {
    alignItems: 'flex-start',
  },
  name: {
    fontWeight: '600',
    fontSize: 12,
  },
  bid: {
    fontSize: 10,
  },
  cardsHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  northCardStack: {
    position: 'relative',
    width: 46,
    height: 40,
  },
  countBadgeNorth: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countTextNorth: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
