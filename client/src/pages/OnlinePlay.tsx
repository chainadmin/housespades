import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Globe2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnlinePlay() {
  const [, navigate] = useLocation(); const search = useSearch();
  const params = new URLSearchParams(search); const mode = params.get("mode") || "ace_high"; const points = params.get("points") || "300";
  const { data } = useQuery<{friends: unknown[]}>({ queryKey: ["/api/friends/online"], refetchInterval: 30000, staleTime: 10000 });
  const count = data?.friends.length || 0;
  return <div className="min-h-screen bg-background"><main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
    <Button variant="ghost" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
    <div><p className="text-sm font-medium text-primary">MULTIPLAYER</p><h1 className="text-3xl font-bold">Online Play</h1><p className="text-muted-foreground mt-2">Choose how you want to play House Spades.</p></div>
    <div className="grid sm:grid-cols-2 gap-5">
      <Card className="hover-elevate cursor-pointer" onClick={() => navigate(`/matchmaking?mode=${mode}&points=${points}`)}><CardHeader><Globe2 className="h-8 w-8 text-primary mb-3"/><CardTitle>Play Online</CardTitle><CardDescription>Find players through public matchmaking.</CardDescription></CardHeader><CardContent><Button className="w-full">Play Online</Button></CardContent></Card>
      <Card className="hover-elevate cursor-pointer" onClick={() => navigate(`/play-with-friends?mode=${mode}&points=${points}`)}><CardHeader><Users className="h-8 w-8 text-primary mb-3"/><CardTitle>Play With Friends</CardTitle><CardDescription>{count} {count === 1 ? "friend" : "friends"} online</CardDescription></CardHeader><CardContent><Button className="w-full">Play With Friends</Button></CardContent></Card>
    </div>
  </main></div>;
}
