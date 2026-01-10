import { motion } from "framer-motion";
import type { GameMode } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getGameModeName, getGameModeDescription } from "@/lib/gameUtils";
import { Crown, Sparkles } from "lucide-react";

interface GameModeCardProps {
  mode: GameMode;
  selected?: boolean;
  onSelect: (mode: GameMode) => void;
}

export function GameModeCard({ mode, selected = false, onSelect }: GameModeCardProps) {
  const name = getGameModeName(mode);
  const description = getGameModeDescription(mode);
  const isCustom = mode === "joker_joker_deuce_deuce";

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200 hover-elevate",
          selected && "ring-2 ring-primary"
        )}
        onClick={() => onSelect(mode)}
        data-testid={`card-mode-${mode}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {isCustom ? (
                <Sparkles className="h-5 w-5 text-chart-2" />
              ) : (
                <Crown className="h-5 w-5 text-primary" />
              )}
              {name}
            </CardTitle>
            {isCustom && (
              <Badge variant="secondary" className="bg-chart-2/20 text-chart-2">
                Custom
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
          
          {isCustom && (
            <div className="text-xs text-muted-foreground space-y-1 p-2 rounded bg-accent/50">
              <p className="font-medium">Trump Power (lowest to highest):</p>
              <p>3♠ → A♠ → 2♦ → 2♠ → Little Joker → Big Joker</p>
            </div>
          )}
          
          <Button
            variant={selected ? "default" : "outline"}
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(mode);
            }}
            data-testid={`button-select-mode-${mode}`}
          >
            {selected ? "Selected" : "Select"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
