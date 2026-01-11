import type { Card, GameMode } from "@shared/schema";
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

  const getCardOffset = (index: number, total: number): number => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const maxWidth = isMobile ? 320 : 800;
    const cardWidth = isMobile ? 60 : 80;
    const baseOffset = Math.min(isMobile ? 45 : 70, (maxWidth - cardWidth) / Math.max(total - 1, 1));
    return index * baseOffset;
  };

  return (
    <div
      className="relative flex justify-center items-end min-h-28 sm:min-h-36 py-2 sm:py-4 px-2 overflow-x-auto"
      data-testid="player-hand"
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
          
          const centerIndex = (sortedCards.length - 1) / 2;
          const rotation = (index - centerIndex) * 2;
          
          return (
            <div
              key={card.id}
              className="absolute bottom-0 origin-bottom"
              style={{ 
                left: offset,
                zIndex: isSelected ? 100 : index,
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {/* Inner wrapper for translation - separate from rotation */}
              <div 
                className={cn(
                  "transition-transform duration-150",
                  isSelected && "-translate-y-4",
                  canPlay && "hover:-translate-y-5"
                )}
              >
                <PlayingCard
                  card={card}
                  size="md"
                  onClick={() => canPlay && onCardClick?.(card)}
                  onDoubleClick={() => canPlay && onCardDoubleClick?.(card)}
                  disabled={!canPlay}
                  selected={isSelected}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
