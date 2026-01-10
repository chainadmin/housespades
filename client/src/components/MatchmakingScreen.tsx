import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGameModeName } from "@/lib/gameUtils";
import type { GameMode, PointGoal } from "@shared/schema";

interface MatchmakingPlayer {
  id: string;
  name: string;
  isBot: boolean;
  isReady: boolean;
}

interface MatchmakingScreenProps {
  players: MatchmakingPlayer[];
  mode: GameMode;
  pointGoal: PointGoal;
  elapsedTime: number;
  onCancel: () => void;
  onAddBot?: () => void;
  onStart?: () => void;
  isHost?: boolean;
}

export function MatchmakingScreen({
  players,
  mode,
  pointGoal,
  elapsedTime,
  onCancel,
  onAddBot,
  onStart,
  isHost = false,
}: MatchmakingScreenProps) {
  const slots = [0, 1, 2, 3];
  const canStart = players.length === 4;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="w-96" data-testid="matchmaking-screen">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Finding Players</CardTitle>
            <div className="flex justify-center gap-2 mt-2">
              <Badge variant="outline">{getGameModeName(mode)}</Badge>
              <Badge variant="secondary">{pointGoal} pts</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Searching indicator */}
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              >
                <Loader2 className="h-8 w-8 text-primary" />
              </motion.div>
              <span className="text-sm text-muted-foreground">
                Searching... {formatTime(elapsedTime)}
              </span>
            </div>

            {/* Player slots */}
            <div className="grid grid-cols-2 gap-3">
              {slots.map((slot) => {
                const player = players[slot];
                
                return (
                  <motion.div
                    key={slot}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: slot * 0.1 }}
                    className={cn(
                      "p-3 rounded-lg border-2 border-dashed flex items-center gap-2",
                      player ? "border-primary bg-primary/5" : "border-muted"
                    )}
                    data-testid={`player-slot-${slot}`}
                  >
                    {player ? (
                      <>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {player.isBot ? (
                              <Bot className="h-4 w-4" />
                            ) : (
                              player.name.slice(0, 2).toUpperCase()
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {player.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {player.isBot ? "Bot" : "Player"}
                          </p>
                        </div>
                        {player.isReady && (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-2">
                        <span className="text-sm text-muted-foreground">
                          Waiting...
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                data-testid="button-cancel-matchmaking"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              {isHost && onAddBot && players.length < 4 && (
                <Button
                  variant="secondary"
                  onClick={onAddBot}
                  data-testid="button-add-bot"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Add Bot
                </Button>
              )}
              
              {isHost && canStart && onStart && (
                <Button
                  onClick={onStart}
                  data-testid="button-start-game"
                >
                  Start Game
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
