import type { TimeControl } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTimeControlName } from "@/lib/gameUtils";
import { Zap, Clock, Timer } from "lucide-react";

interface TimeControlSelectorProps {
  selected: TimeControl;
  onChange: (timeControl: TimeControl) => void;
}

const TIME_CONTROLS: TimeControl[] = ["blitz", "standard", "long"];

const TIME_CONTROL_ICONS: Record<TimeControl, React.ReactNode> = {
  blitz: <Zap className="h-4 w-4" />,
  standard: <Clock className="h-4 w-4" />,
  long: <Timer className="h-4 w-4" />,
};

export function TimeControlSelector({ selected, onChange }: TimeControlSelectorProps) {
  return (
    <div className="flex gap-2" data-testid="time-control-selector">
      {TIME_CONTROLS.map((tc) => (
        <Button
          key={tc}
          variant={selected === tc ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(tc)}
          className={cn("flex gap-2")}
          data-testid={`button-time-${tc}`}
        >
          {TIME_CONTROL_ICONS[tc]}
          {getTimeControlName(tc)}
        </Button>
      ))}
    </div>
  );
}
