import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, GameState } from '@/constants/game';
import { PlayingCard } from './PlayingCard';

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

  const cardCount = hand.length;
  const padding = 16;
  const availableWidth = SCREEN_WIDTH - (padding * 2);
  
  // Card dimensions for small size (matching PlayingCard.tsx)
  const baseCardWidth = Math.min(60, SCREEN_WIDTH / 7);
  const cardWidth = baseCardWidth * 0.7;
  
  // Calculate overlap to fit all cards within available width
  // Total = cardWidth + (count-1) * visible
  // visible = (available - cardWidth) / (count - 1)
  let visiblePerCard = cardCount > 1 
    ? (availableWidth - cardWidth) / (cardCount - 1)
    : cardWidth;
  
  // Clamp: at least 12px visible, at most full card width (no gaps)
  visiblePerCard = Math.max(12, Math.min(visiblePerCard, cardWidth));
  const overlap = cardWidth - visiblePerCard;

  return (
    <View style={styles.container}>
      <View style={[styles.handContainer, { paddingHorizontal: padding }]}>
        {hand.map((card, index) => (
          <View
            key={card.id}
            style={[
              styles.cardWrapper,
              { 
                marginLeft: index === 0 ? 0 : -overlap,
                zIndex: index,
              },
            ]}
          >
            <PlayingCard
              card={card}
              onPress={() => handleCardPress(card)}
              disabled={!canPlayCard(card)}
              selected={selectedCard?.id === card.id}
              size="small"
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  handContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cardWrapper: {
    elevation: 1,
  },
});
