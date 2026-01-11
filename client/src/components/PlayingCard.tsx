import { motion } from "framer-motion";
import type { Card } from "@shared/schema";
import { getSuitSymbol, getSuitColor, formatCardValue, isJoker } from "@/lib/gameUtils";
import { cn } from "@/lib/utils";
import { useCardStyle } from "@/hooks/useCardStyle";

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
  const { currentStyle } = useCardStyle();
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

  const sizeDimensions = {
    sm: { width: 56, height: 80 },
    md: { width: 80, height: 112 },
    lg: { width: 96, height: 144 },
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

  const hasCustomFront = currentStyle.hasCustomFront && currentStyle.frontPosition;
  const frontPos = currentStyle.frontPosition;
  const dims = sizeDimensions[size];

  let bgStyle = {};
  if (hasCustomFront && frontPos) {
    const scaleX = dims.width / frontPos.width;
    const scaleY = dims.height / frontPos.height;
    const sheetWidth = frontPos.width * currentStyle.columns;
    const sheetHeight = frontPos.height * currentStyle.rows;
    
    bgStyle = {
      backgroundImage: `url(${currentStyle.spriteSheet})`,
      backgroundPosition: `-${frontPos.x * scaleX}px -${frontPos.y * scaleY}px`,
      backgroundSize: `${sheetWidth * scaleX}px ${sheetHeight * scaleY}px`,
    };
  }

  return (
    <motion.button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      disabled={disabled}
      whileHover={!disabled ? { y: -8, scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      initial={{ opacity: 1, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: selected ? -12 : 0,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative flex flex-col items-center justify-between rounded-lg border-2 border-gray-300 shadow-md cursor-pointer select-none overflow-hidden bg-white",
        sizeClasses[size],
        disabled && "cursor-not-allowed grayscale-[30%]",
        selected && "ring-2 ring-primary ring-offset-2",
        !disabled && "hover:shadow-lg",
        className
      )}
      style={bgStyle}
      data-testid={`card-${card.id}`}
      aria-label={isJokerCard ? (card.value === "BJ" ? "Big Joker" : "Little Joker") : `${displayValue} of ${card.suit}`}
    >
      <div className={cn(
        "absolute top-1 left-1.5 flex flex-col items-center leading-none z-10",
        suitColorClass,
        hasCustomFront && "drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
      )}>
        <span className={cn("font-bold", valueSizeClasses[size])}>{displayValue}</span>
        <span className={symbolSizeClasses[size]}>{suitSymbol}</span>
      </div>

      <div className={cn("absolute inset-0 flex items-center justify-center z-10", suitColorClass)}>
        <span className={cn(
          size === "sm" ? "text-4xl" : size === "md" ? "text-5xl" : "text-6xl",
          hasCustomFront ? "opacity-40" : "opacity-20"
        )}>
          {suitSymbol}
        </span>
      </div>

      <div className={cn(
        "absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180 z-10",
        suitColorClass,
        hasCustomFront && "drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
      )}>
        <span className={cn("font-bold", valueSizeClasses[size])}>{displayValue}</span>
        <span className={symbolSizeClasses[size]}>{suitSymbol}</span>
      </div>

      {isJokerCard && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className={cn(
            "font-bold text-center rotate-0",
            card.value === "BJ" ? "text-red-500" : "text-gray-900",
            size === "sm" ? "text-[8px]" : size === "md" ? "text-[10px]" : "text-xs",
            hasCustomFront && "drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
          )}>
            {card.value === "BJ" ? "BIG" : "LITTLE"}
          </span>
        </div>
      )}
    </motion.button>
  );
}
