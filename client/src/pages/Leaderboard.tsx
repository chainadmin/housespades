import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Trophy, Loader2 } from "lucide-react";

interface LeaderboardPlayer {
  id: number;
  username: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
}

interface LeaderboardResponse {
  players: LeaderboardPlayer[];
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery<LeaderboardResponse>({
    queryKey: ["/api/leaderboard"],
  });

  const players = data?.players ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg sm:text-2xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">Failed to load the leaderboard.</p>
            <Button onClick={() => refetch()} data-testid="button-retry">Retry</Button>
          </div>
        ) : players.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-semibold">No ranked players yet</h2>
              <p className="text-sm text-muted-foreground">Play online matches to climb the leaderboard.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top {players.length} Players</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <ul className="divide-y">
                {players.map((p, idx) => {
                  const rank = idx + 1;
                  const isMe = user?.id === p.id;
                  const winRate = p.gamesPlayed > 0 ? Math.round((p.gamesWon / p.gamesPlayed) * 100) : 0;
                  const medal = rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-amber-700" : "";
                  return (
                    <li
                      key={p.id}
                      className={`flex items-center gap-3 px-4 sm:px-6 py-3 ${isMe ? "bg-primary/5" : ""}`}
                      data-testid={`row-leaderboard-${p.id}`}
                    >
                      <div className="w-8 flex-shrink-0 flex items-center justify-center">
                        {rank <= 3 ? (
                          <Trophy className={`h-5 w-5 ${medal}`} />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">{rank}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium truncate ${isMe ? "text-primary" : ""}`} data-testid={`text-username-${p.id}`}>
                            {p.username}
                          </span>
                          {isMe && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">YOU</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.gamesWon}W / {p.gamesPlayed} played • {winRate}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold leading-none" data-testid={`text-rating-${p.id}`}>{p.rating}</div>
                        <div className="text-[10px] text-muted-foreground tracking-wider font-semibold mt-1">ELO</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
