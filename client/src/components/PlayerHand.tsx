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

  // Calculate overlap based on number of cards and screen width
  const getCardOffset = (index: number, total: number): number => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const maxWidth = isMobile ? 320 : 800;
    const cardWidth = isMobile ? 60 : 80;
    const baseOffset = Math.min(isMobile ? 45 : 70, (maxWidth - cardWidth) / Math.max(total - 1, 1));
    return index * baseOffset;
  };

  return (
    <motion.div
      className="relative flex justify-center items-end min-h-28 sm:min-h-36 py-2 sm:py-4 px-2 overflow-x-auto"
      data-testid="player-hand"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div 
        className="relative flex"
        style={{ 
          width: `${getCardOffset(sortedCards.length - 1, sortedCards.length) + 80}px`,
          height: "120px",
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
                size="md"
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
