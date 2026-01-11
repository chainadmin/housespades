import { cn } from "@/lib/utils";
import { useCardStyle } from "@/hooks/useCardStyle";

interface CardBackProps {
  count?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  stacked?: boolean;
}

export function CardBack({ 
  count = 1, 
  size = "md", 
  className,
  stacked = false,
}: CardBackProps) {
  const { currentStyle } = useCardStyle();
  
  const sizeClasses = {
    sm: "w-14 h-20",
    md: "w-20 h-28",
    lg: "w-24 h-36",
  };

  const pos = currentStyle.backPosition;
  const col = pos.x / pos.width;
  const row = pos.y / pos.height;
  
  const bgSizeX = currentStyle.columns * 100;
  const bgSizeY = currentStyle.rows * 100;
  const bgPosX = currentStyle.columns > 1 ? (col / (currentStyle.columns - 1)) * 100 : 0;
  const bgPosY = currentStyle.rows > 1 ? (row / (currentStyle.rows - 1)) * 100 : 0;

  const cards = stacked ? Math.min(count, 5) : 1;

  return (
    <div className={cn("relative", className)}>
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "rounded-lg shadow-md overflow-hidden border-2 border-gray-300",
            sizeClasses[size],
            stacked && index > 0 && "absolute top-0 left-0",
          )}
          style={{
            transform: stacked ? `translate(${index * 2}px, ${index * -1}px)` : undefined,
            zIndex: cards - index,
            backgroundImage: `url(${currentStyle.spriteSheet})`,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
            backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
          }}
        />
      ))}
      
      {count > 1 && (
        <div className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm z-10">
          {count}
        </div>
      )}
    </div>
  );
}
