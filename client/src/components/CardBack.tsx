import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const sizeClasses = {
    sm: "w-14 h-20",
    md: "w-20 h-28",
    lg: "w-24 h-36",
  };

  const cards = stacked ? Math.min(count, 5) : 1;

  return (
    <div className={cn("relative", className)}>
      {Array.from({ length: cards }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className={cn(
            "rounded-lg shadow-md overflow-hidden",
            sizeClasses[size],
            stacked && index > 0 && "absolute top-0 left-0",
          )}
          style={{
            transform: stacked ? `translate(${index * 2}px, ${index * -1}px)` : undefined,
            zIndex: cards - index,
          }}
        >
          {/* Card back pattern */}
          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 p-1.5">
            <div className="w-full h-full rounded border-2 border-primary-foreground/30 flex items-center justify-center">
              <div className="w-full h-full rounded bg-primary/20 flex items-center justify-center">
                {/* Diamond pattern */}
                <svg viewBox="0 0 40 40" className="w-3/4 h-3/4 opacity-30">
                  <pattern id="cardPattern" patternUnits="userSpaceOnUse" width="10" height="10">
                    <path
                      d="M5 0L10 5L5 10L0 5Z"
                      fill="currentColor"
                      className="text-primary-foreground"
                    />
                  </pattern>
                  <rect width="40" height="40" fill="url(#cardPattern)" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      
      {/* Card count badge */}
      {count > 1 && (
        <div className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm z-10">
          {count}
        </div>
      )}
    </div>
  );
}
