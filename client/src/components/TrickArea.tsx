import { motion, AnimatePresence } from "framer-motion";
import type { Trick, Position, Card } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";

interface TrickAreaProps {
  trick: Trick;
  playerPositions: Record<string, Position>;
}

export function TrickArea({ trick, playerPositions }: TrickAreaProps) {
  const positionStyles: Record<Position, React.CSSProperties> = {
    north: { top: "4px", left: "50%", transform: "translateX(-50%)" },
    south: { bottom: "4px", left: "50%", transform: "translateX(-50%)" },
    east: { top: "50%", right: "4px", transform: "translateY(-50%)" },
    west: { top: "50%", left: "4px", transform: "translateY(-50%)" },
  };

  const slideDirection: Record<Position, { x: number; y: number }> = {
    north: { x: 0, y: -40 },
    south: { x: 0, y: 40 },
    east: { x: 40, y: 0 },
    west: { x: -40, y: 0 },
  };

  return (
    <div 
      className="relative w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56"
      data-testid="trick-area"
    >
      {/* Center indicator */}
      <div className="absolute inset-4 sm:inset-8 rounded-full bg-accent/30 border border-accent" />

      <AnimatePresence>
        {trick.cards.map(({ playerId, card }, index) => {
          const position = playerPositions[playerId] || "south";
          const style = positionStyles[position];
          const slide = slideDirection[position];
          
          return (
            <motion.div
              key={card.id}
              initial={{ 
                opacity: 0, 
                scale: 0.5,
                x: slide.x,
                y: slide.y,
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: 0,
                y: 0,
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8,
                y: -20,
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                delay: index * 0.1,
              }}
              className={cn(
                "absolute",
                trick.winnerId === playerId && "ring-2 ring-primary ring-offset-2 rounded-lg"
              )}
              style={style}
            >
              <PlayingCard card={card} size="sm" disabled />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
