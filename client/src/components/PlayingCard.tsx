import { motion } from "framer-motion";
import type { Card } from "@shared/schema";
import { getSuitSymbol, getSuitColor, formatCardValue, isJoker } from "@/lib/gameUtils";
import { cn } from "@/lib/utils";

interface PlayingCardProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PlayingCard({
  card,
  onClick,
  disabled = false,
  selected = false,
  size = "md",
  className,
}: PlayingCardProps) {
  const isJokerCard = isJoker(card);
  const suitSymbol = isJokerCard ? "★" : getSuitSymbol(card.suit);
  const suitColorClass = isJokerCard 
    ? (card.value === "BJ" ? "text-red-500" : "text-foreground")
    : getSuitColor(card.suit);
  const displayValue = formatCardValue(card.value);

  const sizeClasses = {
    sm: "w-14 h-20 text-sm",
    md: "w-20 h-28 text-base",
    lg: "w-24 h-36 text-lg",
  };

  const valueSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const symbolSizeClasses = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { y: -8, scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: disabled ? 0.5 : 1, 
        scale: 1,
        y: selected ? -12 : 0,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative flex flex-col items-center justify-between rounded-lg bg-white dark:bg-gray-100 border-2 shadow-md cursor-pointer select-none p-1.5",
        sizeClasses[size],
        disabled && "cursor-not-allowed opacity-50",
        selected && "ring-2 ring-primary ring-offset-2",
        !disabled && "hover:shadow-lg",
        className
      )}
      data-testid={`card-${card.id}`}
      aria-label={isJokerCard ? (card.value === "BJ" ? "Big Joker" : "Little Joker") : `${displayValue} of ${card.suit}`}
    >
      {/* Top left corner */}
      <div className={cn("absolute top-1 left-1.5 flex flex-col items-center leading-none", suitColorClass)}>
        <span className={cn("font-bold", valueSizeClasses[size])}>{displayValue}</span>
        <span className={symbolSizeClasses[size]}>{suitSymbol}</span>
      </div>

      {/* Center symbol (large) */}
      <div className={cn("absolute inset-0 flex items-center justify-center", suitColorClass)}>
        <span className={cn(
          size === "sm" ? "text-4xl" : size === "md" ? "text-5xl" : "text-6xl",
          "opacity-20"
        )}>
          {suitSymbol}
        </span>
      </div>

      {/* Bottom right corner (rotated) */}
      <div className={cn("absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180", suitColorClass)}>
        <span className={cn("font-bold", valueSizeClasses[size])}>{displayValue}</span>
        <span className={symbolSizeClasses[size]}>{suitSymbol}</span>
      </div>

      {/* Joker label */}
      {isJokerCard && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "font-bold text-center rotate-0",
            card.value === "BJ" ? "text-red-500" : "text-foreground",
            size === "sm" ? "text-[8px]" : size === "md" ? "text-[10px]" : "text-xs"
          )}>
            {card.value === "BJ" ? "BIG" : "LITTLE"}
          </span>
        </div>
      )}
    </motion.button>
  );
}
