import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, GameState } from '@/constants/game';
import { PlayingCard } from './PlayingCard';
import { getPlayableCards } from '@/lib/gameUtils';

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
  // Use the shared getPlayableCards function to determine which cards can be played
  // This ensures mobile uses the exact same rules as the server
  const playableCards = isMyTurn && gameState.phase === 'playing'
    ? getPlayableCards(hand, gameState.currentTrick.leadSuit, gameState.spadesBroken, gameState.mode)
    : [];
  
  const canPlayCard = (card: Card): boolean => {
    if (!isMyTurn || gameState.phase !== 'playing') return false;
    return playableCards.some((c) => c.id === card.id);
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
  const padding = 8;
  const availableWidth = SCREEN_WIDTH - (padding * 2);
  
  // Card dimensions for small size (matching PlayingCard.tsx)
  // Scale down for smaller screens
  const baseCardWidth = Math.min(60, SCREEN_WIDTH / 7);
  const cardWidth = baseCardWidth * 0.7;
  
  // Calculate how much of each card should be visible
  // We need: cardWidth + (cardCount - 1) * visiblePerCard <= availableWidth
  // So: visiblePerCard <= (availableWidth - cardWidth) / (cardCount - 1)
  let visiblePerCard: number;
  if (cardCount <= 1) {
    visiblePerCard = cardWidth;
  } else {
    visiblePerCard = (availableWidth - cardWidth) / (cardCount - 1);
    // Ensure minimum visibility of 10px and max of full card width
    visiblePerCard = Math.max(10, Math.min(visiblePerCard, cardWidth));
  }
  
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
    paddingVertical: 4,
  },
  handContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  cardWrapper: {
    elevation: 1,
  },
});
