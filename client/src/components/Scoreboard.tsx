import { motion } from "framer-motion";
import type { Team, Player } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface ScoreboardProps {
  teams: Team[];
  players: Player[];
  winningScore: number;
  roundNumber: number;
  compact?: boolean;
}

export function Scoreboard({ teams, players, winningScore, roundNumber, compact = false }: ScoreboardProps) {
  const getPlayerNames = (team: Team): string[] => {
    return team.players.map((playerId) => {
      const player = players.find((p) => p.id === playerId);
      return player?.name || "Unknown";
    });
  };

  const getTeamBid = (team: Team): number => {
    return team.players.reduce((sum, playerId) => {
      const player = players.find((p) => p.id === playerId);
      return sum + (player?.bid || 0);
    }, 0);
  };

  if (compact) {
    return (
      <div className="flex gap-4" data-testid="scoreboard-compact">
        {teams.map((team, index) => (
          <div
            key={team.id}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              index === 0 ? "bg-primary/10" : "bg-chart-2/10"
            )}
          >
            <span className="text-sm font-medium">
              Team {index + 1}
            </span>
            <Badge 
              variant="secondary"
              className={cn(
                index === 0 ? "bg-primary text-primary-foreground" : "bg-chart-2 text-white"
              )}
            >
              {team.score}
            </Badge>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <Card className="w-64" data-testid="scoreboard">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Scoreboard</CardTitle>
            <Badge variant="outline">Round {roundNumber}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            First to {winningScore} wins
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {teams.map((team, index) => {
            const playerNames = getPlayerNames(team);
            const teamBid = getTeamBid(team);
            const isLeading = team.score >= Math.max(...teams.map((t) => t.score));
            
            return (
              <div
                key={team.id}
                className={cn(
                  "p-3 rounded-lg space-y-2",
                  index === 0 ? "bg-primary/10" : "bg-chart-2/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Team {index + 1}</span>
                    {isLeading && team.score > 0 && (
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <span className="text-2xl font-bold">
                    {team.score}
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {playerNames.join(" & ")}
                </div>
                
                <div className="flex gap-2 text-xs">
                  {team.totalBid !== null && (
                    <span>Bid: {teamBid}</span>
                  )}
                  <span>Tricks: {team.tricksWon}</span>
                  <span className="text-muted-foreground">
                    Bags: {team.bags}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
