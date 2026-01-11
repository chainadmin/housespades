import { motion } from "framer-motion";
import type { Player, Position } from "@shared/schema";
import { CardBack } from "./CardBack";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface PlayerZoneProps {
  player: Player;
  isCurrentTurn: boolean;
  position: Position;
  teamColor?: "primary" | "secondary";
}

export function PlayerZone({ player, isCurrentTurn, position, teamColor = "primary" }: PlayerZoneProps) {
  const isVertical = position === "north" || position === "south";
  const initials = player.name.slice(0, 2).toUpperCase();

  const positionClasses: Record<Position, string> = {
    north: "flex-col items-center",
    south: "flex-col items-center",
    east: "flex-row-reverse items-center",
    west: "flex-row items-center",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex gap-1 sm:gap-3 p-1.5 sm:p-3 rounded-xl transition-all duration-300",
        positionClasses[position],
        isCurrentTurn && "bg-accent/50 ring-2 ring-primary/50",
      )}
      data-testid={`player-zone-${position}`}
    >
      {/* Avatar and name */}
      <div className={cn(
        "flex gap-1 sm:gap-2 items-center",
        isVertical ? "flex-col" : "flex-col"
      )}>
        <div className="relative">
          <Avatar className={cn(
            "h-8 w-8 sm:h-12 sm:w-12 border-2",
            teamColor === "primary" ? "border-primary" : "border-chart-2"
          )}>
            <AvatarFallback className={cn(
              teamColor === "primary" ? "bg-primary/20 text-primary" : "bg-chart-2/20 text-chart-2"
            )}>
              {player.isBot ? <Bot className="h-5 w-5" /> : initials}
            </AvatarFallback>
          </Avatar>
          {isCurrentTurn && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background"
            />
          )}
        </div>
        
        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
          <span className="text-xs sm:text-sm font-medium truncate max-w-16 sm:max-w-20">{player.name}</span>
          <div className="flex gap-0.5 sm:gap-1">
            {player.bid !== null && (
              <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2">
                {player.bid}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2">
              {player.tricks} books
            </Badge>
          </div>
        </div>
      </div>

      {/* Cards (shown as backs for opponents) */}
      {position !== "south" && player.hand.length > 0 && (
        <CardBack 
          count={player.hand.length} 
          size="sm" 
          stacked 
        />
      )}
    </motion.div>
  );
}
