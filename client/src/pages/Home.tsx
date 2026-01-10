import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameModeCard } from "@/components/GameModeCard";
import { PointGoalSelector } from "@/components/TimeControlSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import type { GameMode, PointGoal } from "@shared/schema";
import { Users, Bot, Trophy, TrendingUp, LogOut, User } from "lucide-react";
import houseCardLogo from "@/assets/house-card-logo.png";
import chainLogo from "@/assets/12by12.jpg";

export default function Home() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [selectedMode, setSelectedMode] = useState<GameMode>("ace_high");
  const [selectedPointGoal, setSelectedPointGoal] = useState<PointGoal>("300");

  const handlePlayVsBots = () => {
    navigate(`/game?mode=${selectedMode}&points=${selectedPointGoal}&type=solo`);
  };

  const handleFindMatch = () => {
    navigate(`/matchmaking?mode=${selectedMode}&points=${selectedPointGoal}`);
  };

  const winRate = user && user.gamesPlayed > 0 
    ? Math.round((user.gamesWon / user.gamesPlayed) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img 
              src={houseCardLogo} 
              alt="House Spades" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0"
            />
            <h1 className="text-lg sm:text-2xl font-semibold truncate">House Spades</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span>{user?.gamesWon || 0} Wins</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>{winRate}%</span>
              </div>
              <Badge variant="outline" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                {user?.rating || 1000}
              </Badge>
            </div>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 sm:py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Welcome, {user?.username || "Player"}
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose your game mode and point goal, then jump into a game.
            </p>
          </div>

          {/* Play options */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="h-full hover-elevate cursor-pointer" onClick={handlePlayVsBots} data-testid="card-play-bots">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Play vs Bots</CardTitle>
                      <CardDescription>
                        Practice against AI opponents
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" data-testid="button-play-bots">
                    Start Solo Game
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="h-full hover-elevate cursor-pointer" onClick={handleFindMatch} data-testid="card-find-match">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-chart-2/10">
                      <Users className="h-6 w-6 text-chart-2" />
                    </div>
                    <div>
                      <CardTitle>Find Match</CardTitle>
                      <CardDescription>
                        Play with others online
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" data-testid="button-find-match">
                    Find Opponents
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Game mode selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Select Game Mode</h3>
              <Badge variant="outline" className="text-xs">
                {selectedMode === "ace_high" ? "Classic" : "Custom Rules"}
              </Badge>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <GameModeCard
                mode="ace_high"
                selected={selectedMode === "ace_high"}
                onSelect={setSelectedMode}
              />
              <GameModeCard
                mode="joker_joker_deuce_deuce"
                selected={selectedMode === "joker_joker_deuce_deuce"}
                onSelect={setSelectedMode}
              />
            </div>
          </div>

          {/* Point goal selection */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Point Goal</h3>
            <PointGoalSelector
              selected={selectedPointGoal}
              onChange={setSelectedPointGoal}
            />
          </div>

          {/* How to play section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Play Spades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Objective:</strong> Work with your partner to 
                win at least as many books as you bid. First team to reach the point goal wins.
              </p>
              <p>
                <strong className="text-foreground">Bidding:</strong> Each player bids how many 
                books they think they can win. Team bids are combined.
              </p>
              <p>
                <strong className="text-foreground">Playing:</strong> Follow the lead suit if 
                possible. Spades are always trump and beat other suits.
              </p>
              <p>
                <strong className="text-foreground">Scoring:</strong> Make your bid = 10 points 
                per book bid + 1 point per extra book. Fail = lose 10 points per book bid.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <footer className="border-t mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
          <img 
            src={chainLogo} 
            alt="Chain Software Group" 
            className="w-8 h-8 object-contain"
          />
          <span className="text-xs text-muted-foreground">Chain Software Group</span>
        </div>
      </footer>
    </div>
  );
}
