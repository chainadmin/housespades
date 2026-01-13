import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Card } from '@/constants/game';
import { getSuitSymbol, getCardColor } from '@/lib/gameUtils';
import { useColors } from '@/hooks/useColorScheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(60, SCREEN_WIDTH / 7);
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface PlayingCardProps {
  card: Card;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function PlayingCard({
  card,
  onPress,
  disabled = false,
  selected = false,
  size = 'medium',
}: PlayingCardProps) {
  const colors = useColors();
  const isJoker = card.suit === 'joker';
  
  // Colors matching web app
  const getCardTextColor = () => {
    if (isJoker) {
      return card.value === 'BJ' ? '#dc2626' : '#374151';
    }
    return getCardColor(card.suit) === 'red' ? '#dc2626' : '#1f2937';
  };
  
  const cardColor = getCardTextColor();
  
  const sizeMultiplier = size === 'small' ? 0.7 : size === 'large' ? 1.3 : 1;
  const width = CARD_WIDTH * sizeMultiplier;
  const height = CARD_HEIGHT * sizeMultiplier;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: withSpring(selected ? -12 : 0) },
        { scale: withSpring(selected ? 1.02 : 1) },
      ],
    };
  });

  const displayValue = isJoker 
    ? (card.value === 'BJ' ? 'BIG' : 'LIL') 
    : card.value;
  
  const suitSymbol = isJoker ? '★' : getSuitSymbol(card.suit);

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.card,
          { width, height },
          disabled && styles.cardDisabled,
          selected && [styles.cardSelected, { borderColor: colors.primary, shadowColor: colors.primary }],
          animatedStyle,
        ]}
      >
        {/* Top left corner */}
        <View style={styles.topLeft}>
          <Text style={[styles.value, { color: cardColor, fontSize: width * 0.28 }]}>
            {displayValue}
          </Text>
          <Text style={[styles.suit, { color: cardColor, fontSize: width * 0.24 }]}>
            {suitSymbol}
          </Text>
        </View>

        {/* Center symbol (faded) */}
        <View style={styles.centerContainer}>
          <Text style={[styles.centerSuit, { color: cardColor, fontSize: width * 0.6, opacity: 0.15 }]}>
            {suitSymbol}
          </Text>
        </View>

        {/* Joker label */}
        {isJoker && (
          <View style={styles.jokerLabel}>
            <Text style={[styles.jokerText, { color: cardColor, fontSize: width * 0.15 }]}>
              {card.value === 'BJ' ? 'BIG' : 'LITTLE'}
            </Text>
          </View>
        )}

        {/* Bottom right corner (rotated) */}
        <View style={styles.bottomRight}>
          <Text style={[styles.value, { color: cardColor, fontSize: width * 0.28, transform: [{ rotate: '180deg' }] }]}>
            {displayValue}
          </Text>
          <Text style={[styles.suit, { color: cardColor, fontSize: width * 0.24, transform: [{ rotate: '180deg' }] }]}>
            {suitSymbol}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function CardBack({ size = 'medium' }: { size?: 'tiny' | 'small' | 'medium' | 'large' }) {
  const colors = useColors();
  const sizeMultiplier = size === 'tiny' ? 0.5 : size === 'small' ? 0.7 : size === 'large' ? 1.3 : 1;
  const width = CARD_WIDTH * sizeMultiplier;
  const height = CARD_HEIGHT * sizeMultiplier;

  return (
    <View style={[styles.cardBack, { width, height, backgroundColor: colors.primary }]}>
      <View style={[styles.cardBackPattern, { backgroundColor: colors.background }]}>
        <Text style={[styles.cardBackIcon, { color: colors.primary }]}>♠</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 1,
  },
  cardSelected: {
    borderWidth: 2,
    shadowOpacity: 0.3,
  },
  topLeft: {
    position: 'absolute',
    top: 4,
    left: 6,
    alignItems: 'center',
  },
  bottomRight: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    alignItems: 'center',
  },
  value: {
    fontWeight: 'bold',
    lineHeight: 18,
  },
  suit: {
    lineHeight: 18,
  },
  centerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSuit: {
    fontWeight: 'bold',
  },
  jokerLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jokerText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardBack: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  cardBackPattern: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    borderRadius: 4,
  },
  cardBackIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
});
