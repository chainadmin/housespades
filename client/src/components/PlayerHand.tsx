import { motion } from "framer-motion";
import type { Card, Suit, GameMode } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { sortHand } from "@/lib/gameUtils";
import { cn } from "@/lib/utils";

interface PlayerHandProps {
  cards: Card[];
  mode: GameMode;
  onCardClick?: (card: Card) => void;
  onCardDoubleClick?: (card: Card) => void;
  selectedCard?: Card | null;
  playableCards?: Card[];
  disabled?: boolean;
}

export function PlayerHand({
  cards,
  mode,
  onCardClick,
  onCardDoubleClick,
  selectedCard,
  playableCards,
  disabled = false,
}: PlayerHandProps) {
  const sortedCards = sortHand(cards, mode);
  
  const isPlayable = (card: Card): boolean => {
    if (!playableCards) return true;
    return playableCards.some((c) => c.id === card.id);
  };

  // Calculate overlap based on number of cards - more spacing on mobile for visibility
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const cardWidth = isMobile ? 56 : 80;
  // Increased mobile spacing from 45 to 38 overlap (showing more of each card)
  const cardSpacing = isMobile ? 38 : 55;
  const totalWidth = (sortedCards.length - 1) * cardSpacing + cardWidth;

  return (
    <motion.div
      className="relative flex justify-start sm:justify-center items-end min-h-28 sm:min-h-36 py-2 sm:py-4 px-4 overflow-x-auto"
      data-testid="player-hand"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div 
        className="relative flex flex-shrink-0"
        style={{ 
          width: `${totalWidth}px`,
          height: "120px",
        }}
      >
        {sortedCards.map((card, index) => {
          const offset = index * cardSpacing;
          const isSelected = selectedCard?.id === card.id;
          const canPlay = isPlayable(card) && !disabled;
          
          // Reduced fan rotation on mobile for cleaner look
          const centerIndex = (sortedCards.length - 1) / 2;
          const rotation = isMobile ? (index - centerIndex) * 1 : (index - centerIndex) * 2;
          
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
                size={isMobile ? "sm" : "md"}
                onClick={() => canPlay && onCardClick?.(card)}
                onDoubleClick={() => canPlay && onCardDoubleClick?.(card)}
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
