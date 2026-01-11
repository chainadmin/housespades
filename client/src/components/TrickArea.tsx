import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Trick, Position } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";

interface TrickAreaProps {
  trick: Trick;
  playerPositions: Record<string, Position>;
}

export function TrickArea({ trick, playerPositions }: TrickAreaProps) {
  const [displayTrick, setDisplayTrick] = useState(trick);
  const prevTrickRef = useRef(trick);
  
  useEffect(() => {
    if (trick.cards.length === 0 && prevTrickRef.current.cards.length === 4) {
      const timer = setTimeout(() => {
        setDisplayTrick(trick);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setDisplayTrick(trick);
    }
    prevTrickRef.current = trick;
  }, [trick]);

  const positionStyles: Record<Position, React.CSSProperties> = {
    north: { top: "15%", left: "50%", transform: "translateX(-50%)" },
    south: { bottom: "15%", left: "50%", transform: "translateX(-50%)" },
    east: { top: "50%", right: "15%", transform: "translateY(-50%)" },
    west: { top: "50%", left: "15%", transform: "translateY(-50%)" },
  };

  return (
    <div 
      className="relative w-56 h-56 sm:w-64 sm:h-64"
      data-testid="trick-area"
    >
      {/* Center indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-accent/30 border border-accent" />

      <AnimatePresence mode="sync">
        {displayTrick.cards.map(({ playerId, card }) => {
          const position = playerPositions[playerId] || "south";
          const style = positionStyles[position];
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.3 } }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn(
                "absolute",
                displayTrick.winnerId === playerId && "ring-2 ring-yellow-400 ring-offset-2 rounded-lg"
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
