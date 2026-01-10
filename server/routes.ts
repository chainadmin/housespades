import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GameEngine } from "./gameEngine";
import { GameWebSocketServer } from "./websocket";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize WebSocket server
  new GameWebSocketServer(httpServer);

  // API Routes
  // Get user stats
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Create or get user
  app.post("/api/users", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: "Username required" });
      }

      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.createUser({ username });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Get active lobbies
  app.get("/api/lobbies", async (req, res) => {
    try {
      const lobbies = await storage.getActiveLobbies();
      res.json(lobbies);
    } catch (error) {
      res.status(500).json({ error: "Failed to get lobbies" });
    }
  });

  // Create a new lobby
  app.post("/api/lobbies", async (req, res) => {
    try {
      const { mode, timeControl, hostId, hostName } = req.body;
      
      const lobby = await storage.createLobby({
        mode: mode || "ace_high",
        timeControl: timeControl || "standard",
        hostId,
        players: [{
          id: hostId,
          name: hostName || "Player",
          isBot: false,
          isReady: true,
        }],
        status: "waiting",
      });

      res.json(lobby);
    } catch (error) {
      res.status(500).json({ error: "Failed to create lobby" });
    }
  });

  // Join a lobby
  app.post("/api/lobbies/:id/join", async (req, res) => {
    try {
      const lobby = await storage.getLobby(req.params.id);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }

      if (lobby.players.length >= 4) {
        return res.status(400).json({ error: "Lobby is full" });
      }

      const { playerId, playerName } = req.body;
      
      const updatedLobby = await storage.updateLobby(req.params.id, {
        players: [...lobby.players, {
          id: playerId,
          name: playerName || "Player",
          isBot: false,
          isReady: true,
        }],
      });

      res.json(updatedLobby);
    } catch (error) {
      res.status(500).json({ error: "Failed to join lobby" });
    }
  });

  // Add bot to lobby
  app.post("/api/lobbies/:id/bot", async (req, res) => {
    try {
      const lobby = await storage.getLobby(req.params.id);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }

      if (lobby.players.length >= 4) {
        return res.status(400).json({ error: "Lobby is full" });
      }

      const botNames = ["SpadeMaster", "TrickTaker", "CardShark", "AceHunter", "BidWinner"];
      const usedNames = new Set(lobby.players.map(p => p.name));
      const availableNames = botNames.filter(n => !usedNames.has(n));
      const botName = availableNames[0] || `Bot${lobby.players.length}`;

      const updatedLobby = await storage.updateLobby(req.params.id, {
        players: [...lobby.players, {
          id: `bot-${Date.now()}`,
          name: botName,
          isBot: true,
          isReady: true,
        }],
      });

      res.json(updatedLobby);
    } catch (error) {
      res.status(500).json({ error: "Failed to add bot" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}
