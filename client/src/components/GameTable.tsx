import type { GameState, Card, Position } from "@shared/schema";
import { PlayerZone } from "./PlayerZone";
import { TrickArea } from "./TrickArea";
import { PlayerHand } from "./PlayerHand";
import { BiddingPanel } from "./BiddingPanel";
import { Scoreboard } from "./Scoreboard";
import { cn } from "@/lib/utils";
import { isTrump } from "@shared/schema";

interface GameTableProps {
  gameState: GameState;
  playerId: string;
  onPlayCard: (card: Card) => void;
  onBid: (bid: number) => void;
  selectedCard: Card | null;
  onSelectCard: (card: Card | null) => void;
}

export function GameTable({
  gameState,
  playerId,
  onPlayCard,
  onBid,
  selectedCard,
  onSelectCard,
}: GameTableProps) {
  const currentPlayer = gameState.players.find((p) => p.id === playerId);
  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === playerId;
  const isBiddingPhase = gameState.phase === "bidding";
  const isPlayingPhase = gameState.phase === "playing";

  const playerPositions: Record<string, Position> = {};
  gameState.players.forEach((p) => {
    playerPositions[p.id] = p.position;
  });

  const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
  const getOpponentByOffset = (offset: number) => {
    const idx = (playerIndex + offset) % 4;
    return gameState.players[idx];
  };

  const westPlayer = getOpponentByOffset(1);
  const northPlayer = getOpponentByOffset(2);
  const eastPlayer = getOpponentByOffset(3);

  const partner = getOpponentByOffset(2);
  const partnerBid = partner?.bid;

  const getTeamColor = (player: typeof currentPlayer) => {
    if (!player) return "primary" as const;
    const team = gameState.teams.find((t) => t.players.includes(player.id));
    const teamIndex = gameState.teams.indexOf(team!);
    return teamIndex === 0 ? "primary" as const : "secondary" as const;
  };

  const getPlayableCards = (): Card[] => {
    if (!currentPlayer || !isPlayingPhase || !isMyTurn) return [];
    
    const hand = currentPlayer.hand;
    const leadSuit = gameState.currentTrick.leadSuit;
    
    if (!leadSuit) {
      if (!gameState.spadesBroken) {
        const nonSpades = hand.filter((c) => !isTrump(c, gameState.mode));
        if (nonSpades.length > 0) return nonSpades;
      }
      return hand;
    }
    
    const suitCards = hand.filter((c) => c.suit === leadSuit);
    if (suitCards.length > 0) return suitCards;
    
    return hand;
  };

  const playableCards = getPlayableCards();

  const handleCardClick = (card: Card) => {
    if (!isMyTurn || !isPlayingPhase) return;
    onSelectCard(card);
  };

  const handleCardDoubleClick = (card: Card) => {
    if (!isMyTurn || !isPlayingPhase) return;
    if (playableCards.some((c) => c.id === card.id)) {
      onPlayCard(card);
      onSelectCard(null);
    }
  };

  const handlePlaySelected = () => {
    if (selectedCard && playableCards.some((c) => c.id === selectedCard.id)) {
      onPlayCard(selectedCard);
      onSelectCard(null);
    }
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-accent/30 to-background overflow-hidden flex flex-col" data-testid="game-table">
      {/* Scoreboard row at top - takes its natural height */}
      <div className="flex items-center justify-between px-4 py-2 bg-background/60 backdrop-blur-sm shrink-0">
        <Scoreboard 
          teams={gameState.teams}
          players={gameState.players}
          winningScore={gameState.winningScore}
          roundNumber={gameState.roundNumber}
          compact
        />
        
        {isMyTurn && (
          <div className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium shrink-0">
            Your Turn!
          </div>
        )}
      </div>

      {/* Game area - relative container for player positions */}
      <div className="flex-1 relative min-h-0">
        {/* North player - top center of game area */}
        {northPlayer && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
            <PlayerZone
              player={northPlayer}
              position="north"
              isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === northPlayer.id}
              teamColor={getTeamColor(northPlayer)}
            />
          </div>
        )}

        {/* West player - left center edge */}
        {westPlayer && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10">
            <PlayerZone
              player={westPlayer}
              position="west"
              isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === westPlayer.id}
              teamColor={getTeamColor(westPlayer)}
            />
          </div>
        )}

        {/* East player - right center edge */}
        {eastPlayer && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
            <PlayerZone
              player={eastPlayer}
              position="east"
              isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === eastPlayer.id}
              teamColor={getTeamColor(eastPlayer)}
            />
          </div>
        )}

        {/* Center: Trick area or Bidding panel */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="pointer-events-auto">
            {isBiddingPhase && isMyTurn && (
              <BiddingPanel
                onBid={onBid}
                partnerBid={partnerBid}
                disabled={!isMyTurn}
              />
            )}

            {(isPlayingPhase || (isBiddingPhase && !isMyTurn)) && (
              <TrickArea
                trick={gameState.currentTrick}
                playerPositions={playerPositions}
              />
            )}

            {isBiddingPhase && !isMyTurn && (
              <div className="bg-card/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                <p className="text-base font-medium text-center animate-pulse">
                  Waiting for bids...
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                  {gameState.players.map((p) => (
                    <span key={p.id} className={cn(
                      "flex items-center gap-1",
                      p.bid !== null && "text-foreground"
                    )}>
                      {p.name}: {p.bid !== null ? p.bid : "..."}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* South player (you) - hand at bottom */}
        {currentPlayer && (
          <div className="absolute bottom-0 left-0 right-0 border-t bg-card/80 backdrop-blur-sm z-30">
            <div className="max-w-4xl mx-auto">
              <PlayerHand
                cards={currentPlayer.hand}
                mode={gameState.mode}
                onCardClick={handleCardClick}
                onCardDoubleClick={handleCardDoubleClick}
                selectedCard={selectedCard}
                playableCards={playableCards}
                disabled={!isMyTurn || !isPlayingPhase}
              />
              
              {selectedCard && isMyTurn && isPlayingPhase && (
                <div className="flex justify-center pb-4">
                  <button
                    onClick={handlePlaySelected}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    data-testid="button-play-card"
                  >
                    Play Card
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
