import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { GameState, WSMessage, GameMode, PointGoal } from "@shared/schema";
import { GameEngine } from "./gameEngine";
import { BotAI } from "./botAI";
import { storage } from "./storage";
import { matchmaking } from "./matchmaking";

interface Client {
  ws: WebSocket;
  playerId: string;
  gameId: string | null;
  lobbyId: string | null;
  userId: number | null;
}

interface GameRoom {
  gameState: GameState;
  clients: Map<string, Client>;
  botTimer: NodeJS.Timeout | null;
  idleTimer: NodeJS.Timeout | null;
  statsSaved: boolean;
  isRanked: boolean; // Only true for multiplayer (2+ authenticated humans)
}

const IDLE_TIMEOUT_MS = 60000; // 60 seconds idle timeout for human players

export class GameWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, Client> = new Map();
  private gameRooms: Map<string, GameRoom> = new Map();
  private userIdToClient: Map<number, Client> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.setupConnectionHandler();
    this.startMatchmaking();
  }

  private startMatchmaking() {
    matchmaking.start((match) => {
      console.log(`[Matchmaking] Match found with ${match.players.length} players`);
      
      const humanPlayers = match.players.filter(p => p.id > 0);
      const botPlayers = match.players.filter(p => p.id < 0);
      
      const clients: Client[] = [];
      const connectedHumanPlayers: typeof humanPlayers = [];
      
      for (const player of humanPlayers) {
        const client = this.userIdToClient.get(player.id);
        if (client) {
          clients.push(client);
          connectedHumanPlayers.push(player);
        } else {
          console.log(`[Matchmaking] Client not found for user ${player.id}, removing from match`);
        }
      }
      
      if (connectedHumanPlayers.length === 0) {
        console.log(`[Matchmaking] No connected human players, skipping match`);
        return;
      }

      const allPlayers = [...connectedHumanPlayers, ...botPlayers];
      
      const gamePlayers = allPlayers.map((p) => ({
        id: p.id > 0 ? (clients.find(c => this.userIdToClient.get(p.id) === c)?.playerId || `player-${p.id}`) : `bot-${Math.abs(p.id)}`,
        name: p.username,
        isBot: p.id < 0,
        userId: p.id > 0 ? p.id : undefined,
      }));

      const gameState = GameEngine.createGame(gamePlayers, match.gameMode, match.pointGoal);
      
      const authenticatedHumans = gamePlayers.filter(p => !p.isBot && p.userId).length;
      const isRanked = authenticatedHumans >= 2;
      
      const gameRoom: GameRoom = {
        gameState,
        clients: new Map(),
        botTimer: null,
        idleTimer: null,
        statsSaved: false,
        isRanked,
      };

      for (const client of clients) {
        const playerData = gamePlayers.find(p => p.userId === this.getClientUserId(client));
        if (playerData) {
          const existingPlayer = gameState.players.find(p => p.userId === playerData.userId);
          if (existingPlayer) {
            gameRoom.clients.set(existingPlayer.id, client);
            client.gameId = gameState.id;
          }
        }
      }

      this.gameRooms.set(gameState.id, gameRoom);

      for (const client of clients) {
        this.sendMessage(client.ws, {
          type: "match_found",
          payload: { gameId: gameState.id },
        });
      }

      this.broadcastGameState(gameState.id);
      this.scheduleBotMove(gameState.id);
      this.scheduleIdleTimeout(gameState.id);
      
      console.log(`[Matchmaking] Game ${gameState.id} created with ${connectedHumanPlayers.length} humans and ${botPlayers.length} bots`);
    });
  }

  private getClientUserId(client: Client): number | null {
    return client.userId;
  }

  associateUserWithClient(userId: number, ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client) {
      client.userId = userId;
      this.userIdToClient.set(userId, client);
      console.log(`[WebSocket] Associated user ${userId} with client ${client.playerId}`);
    }
  }

  private setupConnectionHandler() {
    this.wss.on("connection", (ws) => {
      const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const client: Client = {
        ws,
        playerId,
        gameId: null,
        lobbyId: null,
        userId: null,
      };
      this.clients.set(ws, client);

      // Send player ID to client
      this.sendMessage(ws, {
        type: "player_joined",
        payload: { playerId },
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          this.handleMessage(ws, message);
        } catch (error) {
          this.sendError(ws, "Invalid message format");
        }
      });

      ws.on("close", () => {
        this.handleDisconnect(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }

  private handleMessage(ws: WebSocket, message: WSMessage) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case "authenticate":
        this.handleAuthenticate(ws, message.payload);
        break;
      case "start_game":
        this.handleStartGame(ws, message.payload);
        break;
      case "place_bid":
        this.handleBid(ws, message.payload);
        break;
      case "play_card":
        this.handlePlayCard(ws, message.payload);
        break;
      case "leave_lobby":
        this.handleLeaveLobby(ws);
        break;
    }
  }

  private handleAuthenticate(ws: WebSocket, payload: { userId: number }) {
    const client = this.clients.get(ws);
    if (!client || !payload.userId) return;
    
    client.userId = payload.userId;
    this.userIdToClient.set(payload.userId, client);
    console.log(`[WebSocket] Client ${client.playerId} authenticated as user ${payload.userId}`);
    
    this.sendMessage(ws, {
      type: "player_joined",
      payload: { playerId: client.playerId, authenticated: true },
    });
  }

  private handleStartGame(ws: WebSocket, payload: { mode: GameMode; pointGoal: PointGoal; players: { id: string; name: string; isBot: boolean; userId?: number }[] }) {
    const client = this.clients.get(ws);
    if (!client) return;

    const { mode, pointGoal, players } = payload;

    try {
      // Update the first player's ID to match the client's playerId
      const updatedPlayers = players.map((p, index) => {
        if (index === 0 && !p.isBot) {
          return { ...p, id: client.playerId };
        }
        return p;
      });

      const gameState = GameEngine.createGame(updatedPlayers, mode, pointGoal);
      
      // Count authenticated human players to determine if this is a ranked game
      // Ranked games require 2+ authenticated (non-bot) players
      const authenticatedHumans = updatedPlayers.filter(p => !p.isBot && p.userId).length;
      const isRanked = authenticatedHumans >= 2;
      
      const gameRoom: GameRoom = {
        gameState,
        clients: new Map(),
        botTimer: null,
        idleTimer: null,
        statsSaved: false,
        isRanked,
      };

      // Add human players to room
      gameRoom.clients.set(client.playerId, client);
      client.gameId = gameState.id;

      this.gameRooms.set(gameState.id, gameRoom);

      // Send initial state
      this.broadcastGameState(gameState.id);

      // Start bot logic if first player is bot, or idle timer if human
      this.scheduleBotMove(gameState.id);
      this.scheduleIdleTimeout(gameState.id);
    } catch (error) {
      this.sendError(ws, (error as Error).message);
    }
  }

  private handleBid(ws: WebSocket, payload: { bid: number }) {
    const client = this.clients.get(ws);
    if (!client || !client.gameId) return;

    const room = this.gameRooms.get(client.gameId);
    if (!room) return;

    try {
      room.gameState = GameEngine.placeBid(room.gameState, client.playerId, payload.bid);
      this.broadcastGameState(client.gameId);
      this.scheduleBotMove(client.gameId);
      this.scheduleIdleTimeout(client.gameId);
    } catch (error) {
      this.sendError(ws, (error as Error).message);
    }
  }

  private handlePlayCard(ws: WebSocket, payload: { cardId: string }) {
    const client = this.clients.get(ws);
    if (!client || !client.gameId) return;

    const room = this.gameRooms.get(client.gameId);
    if (!room) return;

    try {
      room.gameState = GameEngine.playCard(room.gameState, client.playerId, payload.cardId);
      this.broadcastGameState(client.gameId);

      // Clear trick after delay if complete
      if (room.gameState.currentTrick.cards.length === 4) {
        setTimeout(() => {
          const currentRoom = this.gameRooms.get(client.gameId!);
          if (currentRoom && currentRoom.gameState.currentTrick.cards.length === 4) {
            currentRoom.gameState = GameEngine.clearTrick(currentRoom.gameState);
            this.broadcastGameState(client.gameId!);
            this.scheduleBotMove(client.gameId!);
            this.scheduleIdleTimeout(client.gameId!);
          }
        }, 1500);
      } else {
        this.scheduleBotMove(client.gameId);
        this.scheduleIdleTimeout(client.gameId);
      }
    } catch (error) {
      this.sendError(ws, (error as Error).message);
    }
  }

  private handleLeaveLobby(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (!client) return;

    if (client.gameId) {
      const room = this.gameRooms.get(client.gameId);
      if (room) {
        room.clients.delete(client.playerId);
        
        // Replace disconnected player with bot if game is still in progress
        if (room.gameState.phase !== 'game_over' && room.gameState.phase !== 'waiting') {
          this.replacePlayerWithBot(client.gameId, client.playerId);
        }
        
        // Clean up room if no human clients remain
        if (room.clients.size === 0) {
          console.log(`[Game ${client.gameId}] No human clients remaining, cleaning up room`);
          this.clearGameTimers(room);
          this.gameRooms.delete(client.gameId);
        }
      }
      client.gameId = null;
    }
  }

  private async replacePlayerWithBot(gameId: string, playerId: string) {
    const room = this.gameRooms.get(gameId);
    if (!room) return;

    const player = room.gameState.players.find(p => p.id === playerId);
    if (!player || player.isBot) return;

    const quitterUserId = (player as any).userId as number | undefined;

    const botNames = ["SpadeMaster", "TrickTaker", "CardShark", "AceHunter", "BotPlayer"];
    const usedNames = new Set(room.gameState.players.map(p => p.name));
    let botName = botNames.find(name => !usedNames.has(name)) || `Bot${Date.now()}`;

    console.log(`[Game ${gameId}] Player ${player.name} disconnected, replacing with bot ${botName}`);

    player.isBot = true;
    player.name = botName;
    (player as any).userId = undefined;

    // Apply quit penalty for ranked games (-30 rating)
    if (room.isRanked && quitterUserId) {
      try {
        await storage.updateUserStats(quitterUserId, false, -30);
        console.log(`[Game ${gameId}] Applied -30 rating penalty to user ${quitterUserId} for quitting`);
      } catch (err) {
        console.error(`[Game ${gameId}] Failed to apply quit penalty:`, err);
      }
    }

    this.broadcastGameState(gameId);
    this.scheduleBotMove(gameId);
    this.scheduleIdleTimeout(gameId);
  }

  private handleDisconnect(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client) {
      this.handleLeaveLobby(ws);
      if (client.userId) {
        this.userIdToClient.delete(client.userId);
        matchmaking.removeFromQueue(client.userId);
        console.log(`[WebSocket] User ${client.userId} disconnected and removed from matchmaking queue`);
      }
      this.clients.delete(ws);
    }
  }

  private scheduleBotMove(gameId: string) {
    const room = this.gameRooms.get(gameId);
    if (!room) return;

    const { gameState } = room;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (!currentPlayer || !currentPlayer.isBot) return;
    if (gameState.phase !== "bidding" && gameState.phase !== "playing") return;

    // Clear existing timer
    if (room.botTimer) {
      clearTimeout(room.botTimer);
    }

    // Schedule bot move
    const delay = 800 + Math.random() * 700;
    room.botTimer = setTimeout(() => {
      const currentRoom = this.gameRooms.get(gameId);
      if (!currentRoom) return;

      const { gameState: state } = currentRoom;
      const bot = state.players[state.currentPlayerIndex];
      if (!bot || !bot.isBot) return;

      try {
        if (state.phase === "bidding") {
          const bid = BotAI.calculateBid(bot.hand, state.mode);
          currentRoom.gameState = GameEngine.placeBid(state, bot.id, bid);
        } else if (state.phase === "playing") {
          const card = BotAI.selectCard(state, state.currentPlayerIndex);
          currentRoom.gameState = GameEngine.playCard(state, bot.id, card.id);
        }

        this.broadcastGameState(gameId);

        // Handle trick completion
        if (currentRoom.gameState.currentTrick.cards.length === 4) {
          setTimeout(() => {
            const r = this.gameRooms.get(gameId);
            if (r && r.gameState.currentTrick.cards.length === 4) {
              r.gameState = GameEngine.clearTrick(r.gameState);
              this.broadcastGameState(gameId);
              this.scheduleBotMove(gameId);
              this.scheduleIdleTimeout(gameId);
            }
          }, 1500);
        } else {
          this.scheduleBotMove(gameId);
          this.scheduleIdleTimeout(gameId);
        }
      } catch (error) {
        console.error("Bot move error:", error);
      }
    }, delay);
  }

  private scheduleIdleTimeout(gameId: string) {
    const room = this.gameRooms.get(gameId);
    if (!room) return;

    const { gameState } = room;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Clear existing idle timer
    if (room.idleTimer) {
      clearTimeout(room.idleTimer);
      room.idleTimer = null;
    }

    // Only apply idle timeout for human players in active game phases
    if (!currentPlayer || currentPlayer.isBot) return;
    if (gameState.phase !== "bidding" && gameState.phase !== "playing") return;

    // Schedule auto-play for idle human player
    room.idleTimer = setTimeout(() => {
      const currentRoom = this.gameRooms.get(gameId);
      if (!currentRoom) return;

      const { gameState: state } = currentRoom;
      const player = state.players[state.currentPlayerIndex];
      if (!player || player.isBot) return;

      console.log(`[Idle Timeout] Player ${player.name} timed out, auto-playing`);

      try {
        if (state.phase === "bidding") {
          // Auto-bid using bot AI logic
          const bid = BotAI.calculateBid(player.hand, state.mode);
          currentRoom.gameState = GameEngine.placeBid(state, player.id, bid);
        } else if (state.phase === "playing") {
          // Auto-play using bot AI logic
          const card = BotAI.selectCard(state, state.currentPlayerIndex);
          currentRoom.gameState = GameEngine.playCard(state, player.id, card.id);
        }

        this.broadcastGameState(gameId);

        // Handle trick completion
        if (currentRoom.gameState.currentTrick.cards.length === 4) {
          setTimeout(() => {
            const r = this.gameRooms.get(gameId);
            if (r && r.gameState.currentTrick.cards.length === 4) {
              r.gameState = GameEngine.clearTrick(r.gameState);
              this.broadcastGameState(gameId);
              this.scheduleBotMove(gameId);
              this.scheduleIdleTimeout(gameId);
            }
          }, 1500);
        } else {
          this.scheduleBotMove(gameId);
          this.scheduleIdleTimeout(gameId);
        }
      } catch (error) {
        console.error("Idle timeout auto-play error:", error);
      }
    }, IDLE_TIMEOUT_MS);
  }

  private clearGameTimers(room: GameRoom) {
    if (room.botTimer) {
      clearTimeout(room.botTimer);
      room.botTimer = null;
    }
    if (room.idleTimer) {
      clearTimeout(room.idleTimer);
      room.idleTimer = null;
    }
  }

  private broadcastGameState(gameId: string) {
    const room = this.gameRooms.get(gameId);
    if (!room) return;

    room.clients.forEach((client) => {
      const sanitizedState = this.sanitizeGameState(room.gameState, client.playerId);
      this.sendMessage(client.ws, {
        type: "game_state_update",
        payload: sanitizedState,
      });
    });

    // Check if game is over and save stats (only once, only for ranked multiplayer games)
    if (room.gameState.phase === "game_over") {
      // Clear all timers when game ends
      this.clearGameTimers(room);
      
      if (!room.statsSaved && room.isRanked) {
        room.statsSaved = true;
        this.saveGameStats(room.gameState);
      }
    }
  }

  private async saveGameStats(gameState: GameState) {
    // This is only called for ranked multiplayer games (2+ authenticated humans)
    try {
      const winningTeamIndex = gameState.teams.findIndex(
        (t) => t.score >= gameState.winningScore
      );
      if (winningTeamIndex === -1) return;

      const winningTeam = gameState.teams[winningTeamIndex];
      const losingTeam = gameState.teams[winningTeamIndex === 0 ? 1 : 0];

      const players: { userId: number | null; isBot: boolean; teamIndex: number; ratingChange: number }[] = [];

      for (const player of gameState.players) {
        const isWinner = winningTeam.players.includes(player.id);
        const teamIdx = winningTeam.players.includes(player.id) ? winningTeamIndex : (winningTeamIndex === 0 ? 1 : 0);
        const ratingChange = isWinner ? 25 : -20;

        players.push({
          userId: null, // User ID tracking will be added when auth is integrated with matchmaking
          isBot: player.isBot,
          teamIndex: teamIdx,
          ratingChange: player.isBot ? 0 : ratingChange,
        });
      }

      await storage.recordMatch(
        gameState.mode,
        gameState.pointGoal,
        winningTeam.score,
        losingTeam.score,
        players
      );

      console.log(`Game ${gameState.id} stats saved - Winner: Team ${winningTeamIndex + 1}`);
    } catch (error) {
      console.error("Failed to save game stats:", error);
    }
  }

  private sanitizeGameState(state: GameState, playerId: string): GameState {
    // Hide opponent hands
    const sanitizedPlayers = state.players.map((player) => {
      if (player.id === playerId) {
        return player;
      }
      return {
        ...player,
        hand: player.hand.map(() => ({ suit: "spades" as const, value: "?", id: "hidden" })),
      };
    });

    return {
      ...state,
      players: sanitizedPlayers,
    };
  }

  private sendMessage(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: "error",
      payload: { message: error },
    });
  }
}
