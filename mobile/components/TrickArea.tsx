import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Trick, Position, Player } from '@/constants/game';
import { PlayingCard } from './PlayingCard';

interface TrickAreaProps {
  currentTrick: Trick;
  players: Player[];
}

const POSITION_STYLES: Record<Position, object> = {
  north: { top: 0, left: '50%', transform: [{ translateX: -30 }] },
  south: { bottom: 0, left: '50%', transform: [{ translateX: -30 }] },
  east: { right: 0, top: '50%', transform: [{ translateY: -42 }] },
  west: { left: 0, top: '50%', transform: [{ translateY: -42 }] },
};

export function TrickArea({ currentTrick, players }: TrickAreaProps) {
  const getPlayerPosition = (playerId: string): Position => {
    const player = players.find((p) => p.id === playerId);
    return player?.position || 'south';
  };

  return (
    <View style={styles.container}>
      {currentTrick.cards.map(({ playerId, card }) => {
        const position = getPlayerPosition(playerId);
        const isWinner = currentTrick.winnerId === playerId;

        return (
          <Animated.View
            key={card.id}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={[
              styles.cardPosition,
              POSITION_STYLES[position],
              isWinner && styles.winnerCard,
            ]}
          >
            <PlayingCard card={card} size="medium" />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 180,
    position: 'relative',
  },
  cardPosition: {
    position: 'absolute',
  },
  winnerCard: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
});
