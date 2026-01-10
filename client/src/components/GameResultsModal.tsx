import { motion, AnimatePresence } from "framer-motion";
import type { Team, Player } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, RotateCcw, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameResultsModalProps {
  isOpen: boolean;
  teams: Team[];
  players: Player[];
  winningTeamIndex: number | null;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export function GameResultsModal({
  isOpen,
  teams,
  players,
  winningTeamIndex,
  onPlayAgain,
  onReturnToLobby,
}: GameResultsModalProps) {
  const getPlayerNames = (team: Team): string[] => {
    return team.players.map((playerId) => {
      const player = players.find((p) => p.id === playerId);
      return player?.name || "Unknown";
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          data-testid="game-results-modal"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <Card className="w-96 shadow-xl">
              <CardHeader className="text-center pb-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex justify-center mb-2"
                >
                  <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                    <Trophy className="h-12 w-12 text-yellow-500" />
                  </div>
                </motion.div>
                <CardTitle className="text-2xl">Game Over!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Team scores */}
                <div className="space-y-3">
                  {teams.map((team, index) => {
                    const isWinner = index === winningTeamIndex;
                    const playerNames = getPlayerNames(team);
                    
                    return (
                      <motion.div
                        key={team.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className={cn(
                          "p-4 rounded-lg",
                          isWinner 
                            ? "bg-primary/20 ring-2 ring-primary" 
                            : "bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                Team {index + 1}
                              </span>
                              {isWinner && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                  Winner!
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {playerNames.join(" & ")}
                            </p>
                          </div>
                          <span className={cn(
                            "text-3xl font-bold",
                            isWinner && "text-primary"
                          )}>
                            {team.score}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onReturnToLobby}
                    data-testid="button-return-lobby"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Lobby
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={onPlayAgain}
                    data-testid="button-play-again"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Play Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
