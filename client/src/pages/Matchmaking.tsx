import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { MatchmakingScreen } from "@/components/MatchmakingScreen";
import { ONLINE_GAME_MODE, ONLINE_POINT_GOAL } from "@shared/schema";

interface MatchmakingPlayer {
  id: string;
  name: string;
  isBot: boolean;
  isReady: boolean;
}

const BOT_NAMES = ["SpadeMaster", "TrickTaker", "CardShark", "AceHunter", "BidWinner", "TrumpKing"];

export default function Matchmaking() {
  const [, navigate] = useLocation();

  // TEMPORARY: online matchmaking is pinned to a single mode/point-goal combo (see ONLINE_GAME_MODE)
  // because the online player pool is too small to split across every combination.
  const mode = ONLINE_GAME_MODE;
  const pointGoal = ONLINE_POINT_GOAL;

  const [players, setPlayers] = useState<MatchmakingPlayer[]>([
    { id: "player-1", name: "You", isBot: false, isReady: true }
  ]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [usedBotNames, setUsedBotNames] = useState<Set<string>>(new Set());

  // Timer for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate finding players (add bots after some time)
  useEffect(() => {
    if (players.length < 4) {
      const delay = 2000 + Math.random() * 3000;
      const timer = setTimeout(() => {
        handleAddBot();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [players.length]);

  const getRandomBotName = useCallback(() => {
    const availableNames = BOT_NAMES.filter((name) => !usedBotNames.has(name));
    if (availableNames.length === 0) {
      return `Bot${Math.floor(Math.random() * 1000)}`;
    }
    const name = availableNames[Math.floor(Math.random() * availableNames.length)];
    setUsedBotNames((prev) => new Set(Array.from(prev).concat([name])));
    return name;
  }, [usedBotNames]);

  const handleAddBot = useCallback(() => {
    if (players.length >= 4) return;
    
    const botName = getRandomBotName();
    const newBot: MatchmakingPlayer = {
      id: `bot-${Date.now()}`,
      name: botName,
      isBot: true,
      isReady: true,
    };
    
    setPlayers((prev) => [...prev, newBot]);
  }, [players.length, getRandomBotName]);

  const handleCancel = () => {
    navigate("/");
  };

  const handleStart = () => {
    // Navigate to game with the current player setup
    const playerIds = players.map((p) => p.id).join(",");
    const playerNames = players.map((p) => p.name).join(",");
    const botFlags = players.map((p) => p.isBot ? "1" : "0").join(",");
    
    navigate(`/game?mode=${mode}&points=${pointGoal}&type=match&players=${playerIds}&names=${playerNames}&bots=${botFlags}`);
  };

  return (
    <MatchmakingScreen
      players={players}
      mode={mode}
      pointGoal={pointGoal}
      elapsedTime={elapsedTime}
      onCancel={handleCancel}
      onAddBot={handleAddBot}
      onStart={handleStart}
      isHost={true}
    />
  );
}
