import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { GameState, WSMessage, GameMode, TimeControl } from "@shared/schema";
import { GameEngine } from "./gameEngine";
import { BotAI } from "./botAI";
import { storage } from "./storage";

interface Client {
  ws: WebSocket;
  playerId: string;
  gameId: string | null;
  lobbyId: string | null;
}

interface GameRoom {
  gameState: GameState;
  clients: Map<string, Client>;
  botTimer: NodeJS.Timeout | null;
}

export class GameWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, Client> = new Map();
  private gameRooms: Map<string, GameRoom> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.setupConnectionHandler();
  }

  private setupConnectionHandler() {
    this.wss.on("connection", (ws) => {
      const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const client: Client = {
        ws,
        playerId,
        gameId: null,
        lobbyId: null,
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

  private handleStartGame(ws: WebSocket, payload: { mode: GameMode; timeControl: TimeControl; players: { id: string; name: string; isBot: boolean }[] }) {
    const client = this.clients.get(ws);
    if (!client) return;

    const { mode, timeControl, players } = payload;

    try {
      const gameState = GameEngine.createGame(players, mode, timeControl);
      
      const gameRoom: GameRoom = {
        gameState,
        clients: new Map(),
        botTimer: null,
      };

      // Add human players to room
      gameRoom.clients.set(client.playerId, client);
      client.gameId = gameState.id;

      this.gameRooms.set(gameState.id, gameRoom);

      // Send initial state
      this.broadcastGameState(gameState.id);

      // Start bot logic if first player is bot
      this.scheduleBotMove(gameState.id);
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
          }
        }, 1500);
      } else {
        this.scheduleBotMove(client.gameId);
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
        if (room.clients.size === 0) {
          if (room.botTimer) clearTimeout(room.botTimer);
          this.gameRooms.delete(client.gameId);
        }
      }
      client.gameId = null;
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client) {
      this.handleLeaveLobby(ws);
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
            }
          }, 1500);
        } else {
          this.scheduleBotMove(gameId);
        }
      } catch (error) {
        console.error("Bot move error:", error);
      }
    }, delay);
  }

  private broadcastGameState(gameId: string) {
    const room = this.gameRooms.get(gameId);
    if (!room) return;

    room.clients.forEach((client) => {
      // Send game state with hidden opponent hands
      const sanitizedState = this.sanitizeGameState(room.gameState, client.playerId);
      this.sendMessage(client.ws, {
        type: "game_state_update",
        payload: sanitizedState,
      });
    });
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
