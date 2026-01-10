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
    north: { top: "0", left: "50%", transform: "translateX(-50%)" },
    south: { bottom: "0", left: "50%", transform: "translateX(-50%)" },
    east: { top: "50%", right: "0", transform: "translateY(-50%)" },
    west: { top: "50%", left: "0", transform: "translateY(-50%)" },
  };

  const slideDirection: Record<Position, { x: number; y: number }> = {
    north: { x: 0, y: -30 },
    south: { x: 0, y: 30 },
    east: { x: 30, y: 0 },
    west: { x: -30, y: 0 },
  };

  return (
    <div 
      className="relative w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52"
      data-testid="trick-area"
    >
      {/* Center indicator */}
      <div className="absolute inset-3 sm:inset-6 rounded-full bg-accent/30 border border-accent" />

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
