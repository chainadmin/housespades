import { motion } from "framer-motion";
import type { GameState, Card, Position } from "@shared/schema";
import { PlayerZone } from "./PlayerZone";
import { TrickArea } from "./TrickArea";
import { PlayerHand } from "./PlayerHand";
import { BiddingPanel } from "./BiddingPanel";
import { Scoreboard } from "./Scoreboard";
import { cn } from "@/lib/utils";
import { getCardPower, isTrump } from "@shared/schema";

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

  // Get player positions for rendering
  const playerPositions: Record<string, Position> = {};
  gameState.players.forEach((p) => {
    playerPositions[p.id] = p.position;
  });

  // Get opponent players in order (West, North, East relative to South/player)
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
  const getOpponentByOffset = (offset: number) => {
    const idx = (playerIndex + offset) % 4;
    return gameState.players[idx];
  };

  const westPlayer = getOpponentByOffset(1);
  const northPlayer = getOpponentByOffset(2);
  const eastPlayer = getOpponentByOffset(3);

  // Get partner's bid for bidding display
  const partner = getOpponentByOffset(2);
  const partnerBid = partner?.bid;

  // Determine team colors
  const getTeamColor = (player: typeof currentPlayer) => {
    if (!player) return "primary" as const;
    const team = gameState.teams.find((t) => t.players.includes(player.id));
    const teamIndex = gameState.teams.indexOf(team!);
    return teamIndex === 0 ? "primary" as const : "secondary" as const;
  };

  // Calculate playable cards
  const getPlayableCards = (): Card[] => {
    if (!currentPlayer || !isPlayingPhase || !isMyTurn) return [];
    
    const hand = currentPlayer.hand;
    const leadSuit = gameState.currentTrick.leadSuit;
    
    // If no lead suit, can play anything (but spades only if broken or only have spades)
    if (!leadSuit) {
      if (!gameState.spadesBroken) {
        const nonSpades = hand.filter((c) => !isTrump(c, gameState.mode));
        if (nonSpades.length > 0) return nonSpades;
      }
      return hand;
    }
    
    // Must follow suit if possible
    const suitCards = hand.filter((c) => c.suit === leadSuit);
    if (suitCards.length > 0) return suitCards;
    
    // Can't follow suit, can play anything
    return hand;
  };

  const playableCards = getPlayableCards();

  const handleCardClick = (card: Card) => {
    if (!isMyTurn || !isPlayingPhase) return;
    
    if (selectedCard?.id === card.id) {
      onPlayCard(card);
      onSelectCard(null);
    } else {
      onSelectCard(card);
    }
  };

  const handlePlaySelected = () => {
    if (selectedCard && playableCards.some((c) => c.id === selectedCard.id)) {
      onPlayCard(selectedCard);
      onSelectCard(null);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-gradient-to-b from-accent/30 to-background flex flex-col" data-testid="game-table">
      {/* Top bar with compact scores */}
      <div className="flex items-center justify-between p-3 border-b bg-background/80 backdrop-blur-sm z-10">
        <Scoreboard 
          teams={gameState.teams}
          players={gameState.players}
          winningScore={gameState.winningScore}
          roundNumber={gameState.roundNumber}
          compact
        />
        
        {isMyTurn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium"
          >
            Your Turn!
          </motion.div>
        )}
      </div>

      {/* Main game area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative w-full max-w-5xl aspect-[4/3] flex items-center justify-center">
          {/* North player (across) - positioned at top center with even spacing */}
          {northPlayer && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-0">
              <PlayerZone
                player={northPlayer}
                position="north"
                isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === northPlayer.id}
                teamColor={getTeamColor(northPlayer)}
              />
            </div>
          )}

          {/* West player (left) - positioned at left center with even spacing */}
          {westPlayer && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-0">
              <PlayerZone
                player={westPlayer}
                position="west"
                isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === westPlayer.id}
                teamColor={getTeamColor(westPlayer)}
              />
            </div>
          )}

          {/* Center: Trick area or Bidding panel - highest z-index */}
          <div className="relative z-20 flex flex-col items-center gap-4">
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
              <div className="bg-card/90 backdrop-blur-sm rounded-lg p-6 shadow-lg">
                <p className="text-lg font-medium text-center animate-pulse">
                  Waiting for bids...
                </p>
                <div className="mt-2 flex justify-center gap-4 text-sm text-muted-foreground">
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

          {/* East player (right) - positioned at right center with even spacing */}
          {eastPlayer && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-0">
              <PlayerZone
                player={eastPlayer}
                position="east"
                isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === eastPlayer.id}
                teamColor={getTeamColor(eastPlayer)}
              />
            </div>
          )}
        </div>
      </div>

      {/* South player (you) - hand at bottom */}
      {currentPlayer && (
        <div className="border-t bg-card/80 backdrop-blur-sm z-10">
          <div className="max-w-4xl mx-auto">
            <PlayerHand
              cards={currentPlayer.hand}
              mode={gameState.mode}
              onCardClick={handleCardClick}
              selectedCard={selectedCard}
              playableCards={playableCards}
              disabled={!isMyTurn || !isPlayingPhase}
            />
            
            {/* Play button for selected card */}
            {selectedCard && isMyTurn && isPlayingPhase && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center pb-4"
              >
                <button
                  onClick={handlePlaySelected}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  data-testid="button-play-card"
                >
                  Play Card
                </button>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
