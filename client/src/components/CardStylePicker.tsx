import { cn } from "@/lib/utils";
import { useCardStyle } from "@/hooks/useCardStyle";
import { Check } from "lucide-react";
import type { CardStyle } from "@/lib/cardStyles";

interface CardStylePickerProps {
  className?: string;
}

function CardStylePreview({ style, isSelected, onClick }: { 
  style: CardStyle; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const pos = style.backPosition;
  const col = pos.x / pos.width;
  const row = pos.y / pos.height;
  
  const bgSizeX = style.columns * 100;
  const bgSizeY = style.rows * 100;
  const bgPosX = style.columns > 1 ? (col / (style.columns - 1)) * 100 : 0;
  const bgPosY = style.rows > 1 ? (row / (style.rows - 1)) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-lg overflow-hidden border-2 transition-all w-[60px] h-[84px]",
        isSelected 
          ? "border-primary ring-2 ring-primary ring-offset-2" 
          : "border-gray-300 hover:border-gray-400"
      )}
      data-testid={`card-style-${style.id}`}
    >
      <div 
        className="w-full h-full"
        style={{
          backgroundImage: `url(${style.spriteSheet})`,
          backgroundPosition: `${bgPosX}% ${bgPosY}%`,
          backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
        }}
      />
      {isSelected && (
        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
          <div className="bg-primary rounded-full p-1">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
      )}
    </button>
  );
}

export function CardStylePicker({ className }: CardStylePickerProps) {
  const { currentStyle, allStyles, selectStyle } = useCardStyle();

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-muted-foreground">Card Style</h3>
      <div className="grid grid-cols-5 gap-3">
        {allStyles.map((style) => (
          <div key={style.id} className="flex flex-col items-center gap-1">
            <CardStylePreview
              style={style}
              isSelected={currentStyle.id === style.id}
              onClick={() => selectStyle(style.id)}
            />
            <span className="text-[10px] text-center text-muted-foreground truncate w-full">
              {style.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
