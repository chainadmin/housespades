import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameModeCard } from "@/components/GameModeCard";
import { PointGoalSelector } from "@/components/TimeControlSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { GameMode, PointGoal } from "@shared/schema";
import { Users, Bot, Trophy, TrendingUp } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const [selectedMode, setSelectedMode] = useState<GameMode>("ace_high");
  const [selectedPointGoal, setSelectedPointGoal] = useState<PointGoal>("300");

  const handlePlayVsBots = () => {
    navigate(`/game?mode=${selectedMode}&points=${selectedPointGoal}&type=solo`);
  };

  const handleFindMatch = () => {
    navigate(`/matchmaking?mode=${selectedMode}&points=${selectedPointGoal}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-2xl font-bold">♠</span>
            </div>
            <h1 className="text-2xl font-semibold">House Spades</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Quick stats */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span>0 Wins</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>0% Win Rate</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Hero section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              Play Spades Online
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Challenge bots or find real opponents. Choose your game mode and point goal, 
              then jump into a game of classic or custom Spades.
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
                win at least as many tricks as you bid. First team to reach the point goal wins.
              </p>
              <p>
                <strong className="text-foreground">Bidding:</strong> Each player bids how many 
                tricks they think they can win. Team bids are combined.
              </p>
              <p>
                <strong className="text-foreground">Playing:</strong> Follow the lead suit if 
                possible. Spades are always trump and beat other suits.
              </p>
              <p>
                <strong className="text-foreground">Scoring:</strong> Make your bid = 10 points 
                per trick bid + 1 point per overtrick. Fail = lose 10 points per trick bid.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          House Spades - Play classic card games online
        </div>
      </footer>
    </div>
  );
}
