import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Card, GameState, Suit } from '@/constants/game';
import { PlayingCard } from './PlayingCard';
import { isTrump } from '@/lib/gameUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlayerHandProps {
  hand: Card[];
  gameState: GameState;
  selectedCard: Card | null;
  onSelectCard: (card: Card) => void;
  onPlayCard: (card: Card) => void;
  isMyTurn: boolean;
}

export function PlayerHand({
  hand,
  gameState,
  selectedCard,
  onSelectCard,
  onPlayCard,
  isMyTurn,
}: PlayerHandProps) {
  const canPlayCard = (card: Card): boolean => {
    if (!isMyTurn || gameState.phase !== 'playing') return false;

    const leadSuit = gameState.currentTrick.leadSuit;
    
    if (!leadSuit) {
      if (card.suit === 'spades' && !gameState.spadesBroken) {
        const hasOnlySpades = hand.every((c) => c.suit === 'spades' || c.suit === 'joker');
        return hasOnlySpades;
      }
      return true;
    }

    if (card.suit === leadSuit) return true;

    const hasLeadSuit = hand.some((c) => c.suit === leadSuit);
    return !hasLeadSuit;
  };

  const handleCardPress = (card: Card) => {
    if (!canPlayCard(card)) return;

    if (selectedCard?.id === card.id) {
      onPlayCard(card);
    } else {
      onSelectCard(card);
    }
  };

  const cardWidth = Math.min(60, (SCREEN_WIDTH - 40) / Math.max(hand.length, 1));
  const overlap = Math.max(0, cardWidth - 25);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.handContainer}>
          {hand.map((card, index) => (
            <View
              key={card.id}
              style={[
                styles.cardWrapper,
                { marginLeft: index === 0 ? 0 : -overlap },
                { zIndex: index },
              ]}
            >
              <PlayingCard
                card={card}
                onPress={() => handleCardPress(card)}
                disabled={!canPlayCard(card)}
                selected={selectedCard?.id === card.id}
                size="medium"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  handContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cardWrapper: {
    elevation: 1,
  },
});
