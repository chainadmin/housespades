import { motion } from "framer-motion";
import type { Card, Suit, GameMode } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { sortHand } from "@/lib/gameUtils";
import { cn } from "@/lib/utils";

interface PlayerHandProps {
  cards: Card[];
  mode: GameMode;
  onCardClick?: (card: Card) => void;
  selectedCard?: Card | null;
  playableCards?: Card[];
  disabled?: boolean;
}

export function PlayerHand({
  cards,
  mode,
  onCardClick,
  selectedCard,
  playableCards,
  disabled = false,
}: PlayerHandProps) {
  const sortedCards = sortHand(cards, mode);
  
  const isPlayable = (card: Card): boolean => {
    if (!playableCards) return true;
    return playableCards.some((c) => c.id === card.id);
  };

  // Calculate overlap based on number of cards
  const getCardOffset = (index: number, total: number): number => {
    const baseOffset = Math.min(70, 800 / total);
    return index * baseOffset;
  };

  return (
    <motion.div
      className="relative flex justify-center items-end min-h-36 py-4"
      data-testid="player-hand"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div 
        className="relative flex"
        style={{ 
          width: `${getCardOffset(sortedCards.length - 1, sortedCards.length) + 100}px`,
          height: "140px",
        }}
      >
        {sortedCards.map((card, index) => {
          const offset = getCardOffset(index, sortedCards.length);
          const isSelected = selectedCard?.id === card.id;
          const canPlay = isPlayable(card) && !disabled;
          
          // Fan out effect - cards at edges rotate slightly
          const centerIndex = (sortedCards.length - 1) / 2;
          const rotation = (index - centerIndex) * 2;
          
          return (
            <motion.div
              key={card.id}
              className="absolute bottom-0"
              style={{ 
                left: offset,
                zIndex: isSelected ? 100 : index,
              }}
              initial={{ rotate: 0 }}
              animate={{ 
                rotate: rotation,
                y: isSelected ? -15 : 0,
              }}
              whileHover={canPlay ? { 
                y: -20, 
                zIndex: 100,
                rotate: 0,
              } : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <PlayingCard
                card={card}
                size="lg"
                onClick={() => canPlay && onCardClick?.(card)}
                disabled={!canPlay}
                selected={isSelected}
              />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
