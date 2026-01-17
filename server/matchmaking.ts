import { storage } from "./storage";
import type { DbUser } from "@shared/schema";

interface QueuedPlayer {
  id: number;
  username: string;
  rating: number;
  queuedAt: number;
  gameMode: "ace_high" | "joker_joker_deuce_deuce";
  pointGoal: "100" | "300" | "500";
}

interface MatchedGame {
  players: QueuedPlayer[];
  teams: [QueuedPlayer[], QueuedPlayer[]];
  gameMode: "ace_high" | "joker_joker_deuce_deuce";
  pointGoal: "100" | "300" | "500";
}

class MatchmakingService {
  private queue: Map<number, QueuedPlayer> = new Map();
  private matchingInterval: NodeJS.Timeout | null = null;
  private onMatchFound: ((match: MatchedGame) => void) | null = null;

  start(onMatchFound: (match: MatchedGame) => void) {
    this.onMatchFound = onMatchFound;
    this.matchingInterval = setInterval(() => this.tryMatch(), 5000);
  }

  stop() {
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = null;
    }
  }

  addToQueue(user: DbUser, gameMode: "ace_high" | "joker_joker_deuce_deuce", pointGoal: "100" | "300" | "500") {
    const player: QueuedPlayer = {
      id: user.id,
      username: user.username,
      rating: user.rating,
      queuedAt: Date.now(),
      gameMode,
      pointGoal,
    };
    this.queue.set(user.id, player);
  }

  removeFromQueue(userId: number) {
    this.queue.delete(userId);
  }

  getQueueSize(): number {
    return this.queue.size;
  }

  private tryMatch() {
    const players = Array.from(this.queue.values());
    
    const groups = new Map<string, QueuedPlayer[]>();
    for (const player of players) {
      const key = `${player.gameMode}-${player.pointGoal}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(player);
    }

    for (const [key, groupPlayers] of Array.from(groups.entries())) {
      if (groupPlayers.length >= 4) {
        const matched = this.selectBestMatch(groupPlayers);
        if (matched && this.onMatchFound) {
          for (const p of matched.players) {
            this.queue.delete(p.id);
          }
          this.onMatchFound(matched);
        }
      } else if (groupPlayers.length >= 1) {
        const longestWait = Math.max(...groupPlayers.map(p => Date.now() - p.queuedAt));
        const BOT_FILL_THRESHOLD = 30000;
        
        if (longestWait >= BOT_FILL_THRESHOLD) {
          console.log(`[Matchmaking] Filling match with bots after ${Math.round(longestWait / 1000)}s wait (${groupPlayers.length} players in queue for ${key})`);
          const filledPlayers = this.fillWithBots(groupPlayers);
          const teams = this.balanceTeams(filledPlayers);
          
          for (const p of groupPlayers) {
            this.queue.delete(p.id);
          }
          
          if (this.onMatchFound) {
            this.onMatchFound({
              players: filledPlayers,
              teams,
              gameMode: groupPlayers[0].gameMode,
              pointGoal: groupPlayers[0].pointGoal,
            });
          }
        }
      }
    }
  }

  private selectBestMatch(players: QueuedPlayer[]): MatchedGame | null {
    if (players.length < 4) return null;

    players.sort((a, b) => a.rating - b.rating);

    const waitingTooLong = players.filter(p => Date.now() - p.queuedAt > 60000);
    
    let selected: QueuedPlayer[];
    
    if (waitingTooLong.length >= 4) {
      selected = waitingTooLong.slice(0, 4);
    } else {
      const ratingGroups = this.groupByRatingTier(players);
      let bestGroup: QueuedPlayer[] | null = null;
      
      for (const group of ratingGroups) {
        if (group.length >= 4 && (!bestGroup || group.length > bestGroup.length)) {
          bestGroup = group;
        }
      }
      
      if (bestGroup) {
        selected = bestGroup.slice(0, 4);
      } else {
        selected = players.slice(0, 4);
      }
    }

    const teams = this.balanceTeams(selected);
    
    return {
      players: selected,
      teams,
      gameMode: selected[0].gameMode,
      pointGoal: selected[0].pointGoal,
    };
  }

  private groupByRatingTier(players: QueuedPlayer[]): QueuedPlayer[][] {
    const tiers: QueuedPlayer[][] = [];
    const tierSize = 300;
    
    for (const player of players) {
      const tierIndex = Math.floor(player.rating / tierSize);
      while (tiers.length <= tierIndex) {
        tiers.push([]);
      }
      tiers[tierIndex].push(player);
    }
    
    const combinedTiers: QueuedPlayer[][] = [];
    for (let i = 0; i < tiers.length; i++) {
      const combined = [...tiers[i]];
      if (i > 0) combined.push(...tiers[i - 1]);
      if (i < tiers.length - 1) combined.push(...tiers[i + 1]);
      if (combined.length >= 4) {
        combinedTiers.push(combined);
      }
    }
    
    return combinedTiers;
  }

  private balanceTeams(players: QueuedPlayer[]): [QueuedPlayer[], QueuedPlayer[]] {
    const sorted = [...players].sort((a, b) => b.rating - a.rating);
    
    const team1: QueuedPlayer[] = [sorted[0], sorted[3]];
    const team2: QueuedPlayer[] = [sorted[1], sorted[2]];
    
    return [team1, team2];
  }

  fillWithBots(players: QueuedPlayer[]): QueuedPlayer[] {
    const botNames = ["SpadeMaster", "TrickTaker", "CardShark", "AceHunter"];
    const usedNames = new Set(players.map(p => p.username));
    const avgRating = players.length > 0 
      ? Math.round(players.reduce((sum, p) => sum + p.rating, 0) / players.length)
      : 1000;
    
    const result = [...players];
    let botIndex = 0;
    
    while (result.length < 4) {
      let botName = botNames[botIndex % botNames.length];
      while (usedNames.has(botName)) {
        botIndex++;
        botName = `Bot${botIndex}`;
      }
      usedNames.add(botName);
      
      result.push({
        id: -1 * (botIndex + 1),
        username: botName,
        rating: avgRating + Math.floor(Math.random() * 200) - 100,
        queuedAt: Date.now(),
        gameMode: players[0]?.gameMode || "ace_high",
        pointGoal: players[0]?.pointGoal || "300",
      });
      botIndex++;
    }
    
    return result;
  }
}

export const matchmaking = new MatchmakingService();

export function calculateRatingChange(
  playerRating: number,
  opponentAvgRating: number,
  won: boolean
): number {
  const kFactor = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (opponentAvgRating - playerRating) / 400));
  const actualScore = won ? 1 : 0;
  return Math.round(kFactor * (actualScore - expectedScore));
}
