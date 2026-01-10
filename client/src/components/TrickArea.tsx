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
    north: { bottom: "80%", left: "40%", transform: "translateX(-50%)" },
    south: { top: "80%", left: "40%", transform: "translateX(-50%)" },
    east: { top: "40%", left: "80%", transform: "translate(-50%, -50%)" },
    west: { top: "40%", left: "20%", transform: "translate(-50%, -50%)" },
  };

  const slideDirection: Record<Position, { x: number; y: number }> = {
    north: { x: 0, y: -30 },
    south: { x: 0, y: 30 },
    east: { x: 30, y: 0 },
    west: { x: -30, y: 0 },
  };

  return (
    <div 
      className="relative w-56 h-64 sm:w-64 sm:h-72 md:w-72 md:h-80 border-2 border-red-500"
      data-testid="trick-area"
    >
      {/* Temporary grid overlay */}
      <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 pointer-events-none z-50">
        {Array.from({ length: 25 }, (_, i) => (
          <div key={i} className="border border-yellow-400/50 flex items-center justify-center">
            <span className="text-yellow-400 text-xs font-bold bg-black/70 px-1 rounded">{i + 1}</span>
          </div>
        ))}
      </div>
      {/* Center indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-accent/30 border border-accent" />

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
