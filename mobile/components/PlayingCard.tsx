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
  const cardColor = isJoker ? '#8b5cf6' : getCardColor(card.suit) === 'red' ? colors.hearts : colors.spades;
  
  const sizeMultiplier = size === 'small' ? 0.7 : size === 'large' ? 1.3 : 1;
  const width = CARD_WIDTH * sizeMultiplier;
  const height = CARD_HEIGHT * sizeMultiplier;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: withSpring(selected ? -12 : 0) },
        { scale: withSpring(selected ? 1.05 : 1) },
      ],
    };
  });

  const displayValue = isJoker 
    ? (card.value === 'BJ' ? 'BIG' : 'LIL') 
    : card.value;
  
  const suitSymbol = getSuitSymbol(card.suit);

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
          selected && styles.cardSelected,
          animatedStyle,
        ]}
      >
        <View style={styles.topLeft}>
          <Text style={[styles.value, { color: cardColor, fontSize: width * 0.25 }]}>
            {displayValue}
          </Text>
          <Text style={[styles.suit, { color: cardColor, fontSize: width * 0.22 }]}>
            {suitSymbol}
          </Text>
        </View>

        <Text style={[styles.centerSuit, { color: cardColor, fontSize: width * 0.5 }]}>
          {suitSymbol}
        </Text>

        <View style={styles.bottomRight}>
          <Text style={[styles.value, { color: cardColor, fontSize: width * 0.25, transform: [{ rotate: '180deg' }] }]}>
            {displayValue}
          </Text>
          <Text style={[styles.suit, { color: cardColor, fontSize: width * 0.22, transform: [{ rotate: '180deg' }] }]}>
            {suitSymbol}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function CardBack({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeMultiplier = size === 'small' ? 0.7 : size === 'large' ? 1.3 : 1;
  const width = CARD_WIDTH * sizeMultiplier;
  const height = CARD_HEIGHT * sizeMultiplier;

  return (
    <View style={[styles.cardBack, { width, height }]}>
      <View style={styles.cardBackPattern}>
        <Text style={styles.cardBackIcon}>♠</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardSelected: {
    borderColor: '#4f46e5',
    borderWidth: 2,
    shadowColor: '#4f46e5',
    shadowOpacity: 0.3,
  },
  topLeft: {
    position: 'absolute',
    top: 4,
    left: 4,
    alignItems: 'center',
  },
  bottomRight: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    alignItems: 'center',
  },
  value: {
    fontWeight: 'bold',
    lineHeight: 16,
  },
  suit: {
    lineHeight: 16,
  },
  centerSuit: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -20 }],
  },
  cardBack: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333355',
    overflow: 'hidden',
  },
  cardBackPattern: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252540',
    margin: 4,
    borderRadius: 4,
  },
  cardBackIcon: {
    fontSize: 24,
    color: '#4f46e5',
    opacity: 0.5,
  },
});
