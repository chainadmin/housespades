import type { Card } from "@shared/schema";
import { getSuitSymbol, getSuitColor, formatCardValue, isJoker } from "@/lib/gameUtils";
import { cn } from "@/lib/utils";

interface PlayingCardProps {
  card: Card;
  onClick?: () => void;
  onDoubleClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PlayingCard({
  card,
  onClick,
  onDoubleClick,
  disabled = false,
  selected = false,
  size = "md",
  className,
}: PlayingCardProps) {
  const isJokerCard = isJoker(card);
  const suitSymbol = isJokerCard ? "★" : getSuitSymbol(card.suit);
  const suitColorClass = isJokerCard 
    ? (card.value === "BJ" ? "text-red-500" : "text-gray-900")
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
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-between rounded-lg bg-white border-2 border-gray-300 shadow-md cursor-pointer select-none p-1.5 transition-transform",
        sizeClasses[size],
        disabled && "cursor-not-allowed opacity-70",
        selected && "ring-2 ring-primary ring-offset-2 -translate-y-3",
        !disabled && "hover:shadow-lg hover:-translate-y-2",
        className
      )}
      data-testid={`card-${card.id}`}
      aria-label={isJokerCard ? (card.value === "BJ" ? "Big Joker" : "Little Joker") : `${displayValue} of ${card.suit}`}
    >
      <div className={cn("absolute top-1 left-1.5 flex flex-col items-center leading-none", suitColorClass)}>
        <span className={cn("font-bold", valueSizeClasses[size])}>{displayValue}</span>
        <span className={symbolSizeClasses[size]}>{suitSymbol}</span>
      </div>

      <div className={cn("absolute inset-0 flex items-center justify-center", suitColorClass)}>
        <span className={cn(
          size === "sm" ? "text-4xl" : size === "md" ? "text-5xl" : "text-6xl",
          "opacity-20"
        )}>
          {suitSymbol}
        </span>
      </div>

      <div className={cn("absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180", suitColorClass)}>
        <span className={cn("font-bold", valueSizeClasses[size])}>{displayValue}</span>
        <span className={symbolSizeClasses[size]}>{suitSymbol}</span>
      </div>

      {isJokerCard && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "font-bold text-center",
            card.value === "BJ" ? "text-red-500" : "text-gray-900",
            size === "sm" ? "text-[8px]" : size === "md" ? "text-[10px]" : "text-xs"
          )}>
            {card.value === "BJ" ? "BIG" : "LITTLE"}
          </span>
        </div>
      )}
    </button>
  );
}
