import type { PointGoal } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Target } from "lucide-react";

interface PointGoalSelectorProps {
  selected: PointGoal;
  onChange: (pointGoal: PointGoal) => void;
}

const POINT_GOALS: PointGoal[] = ["100", "300", "500"];

const POINT_GOAL_LABELS: Record<PointGoal, string> = {
  "100": "100 pts",
  "300": "300 pts",
  "500": "500 pts",
};

export function PointGoalSelector({ selected, onChange }: PointGoalSelectorProps) {
  return (
    <div className="flex gap-2" data-testid="point-goal-selector">
      {POINT_GOALS.map((pg) => (
        <Button
          key={pg}
          variant={selected === pg ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(pg)}
          className={cn("flex gap-2")}
          data-testid={`button-points-${pg}`}
        >
          <Target className="h-4 w-4" />
          {POINT_GOAL_LABELS[pg]}
        </Button>
      ))}
    </div>
  );
}
