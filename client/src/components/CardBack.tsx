import { motion } from "framer-motion";
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

  const sizeDimensions = {
    sm: { width: 56, height: 80 },
    md: { width: 80, height: 112 },
    lg: { width: 96, height: 144 },
  };

  const cards = stacked ? Math.min(count, 5) : 1;
  const pos = currentStyle.backPosition;
  const dims = sizeDimensions[size];
  
  const scaleX = dims.width / pos.width;
  const scaleY = dims.height / pos.height;
  const sheetWidth = pos.width * currentStyle.columns;
  const sheetHeight = pos.height * currentStyle.rows;

  return (
    <div className={cn("relative", className)}>
      {Array.from({ length: cards }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className={cn(
            "rounded-lg shadow-md overflow-hidden border-2 border-gray-300",
            sizeClasses[size],
            stacked && index > 0 && "absolute top-0 left-0",
          )}
          style={{
            transform: stacked ? `translate(${index * 2}px, ${index * -1}px)` : undefined,
            zIndex: cards - index,
          }}
        >
          <div 
            className="w-full h-full bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url(${currentStyle.spriteSheet})`,
              backgroundPosition: `-${pos.x * scaleX}px -${pos.y * scaleY}px`,
              backgroundSize: `${sheetWidth * scaleX}px ${sheetHeight * scaleY}px`,
            }}
          />
        </motion.div>
      ))}
      
      {count > 1 && (
        <div className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm z-10">
          {count}
        </div>
      )}
    </div>
  );
}
