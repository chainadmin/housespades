import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { GameWebSocketServer } from "./websocket";
import { matchmaking } from "./matchmaking";
import { sendPasswordResetEmail } from "./email";
import bcrypt from "bcrypt";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  new GameWebSocketServer(httpServer);

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { username, email, password } = parsed.data;

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, email, passwordHash });

      req.session.userId = user.id;

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return same message for security (don't reveal if email exists)
        return res.json({ message: "If email exists, reset link sent" });
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await storage.createPasswordReset(user.id, token, expiresAt);

      // Get base URL for reset link
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
      const baseUrl = `${protocol}://${host}`;

      // Send password reset email
      const emailResult = await sendPasswordResetEmail(user.email, token, baseUrl);
      
      if (!emailResult.success) {
        console.error("Failed to send password reset email to:", email);
        return res.status(500).json({ error: "Failed to send reset email. Please try again later." });
      }

      // In dev mode, include the reset link in response for testing
      if (emailResult.devMode && emailResult.resetLink) {
        return res.json({ 
          message: "Reset link generated (dev mode)", 
          resetLink: emailResult.resetLink 
        });
      }

      res.json({ message: "If email exists, reset link sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const reset = await storage.getPasswordReset(token);
      if (!reset || reset.used || reset.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      // Actually update the user's password
      const updatedUser = await storage.updateUserPassword(reset.userId, passwordHash);
      if (!updatedUser) {
        return res.status(400).json({ error: "Failed to update password" });
      }
      
      // Mark token as used after successful password update
      await storage.markPasswordResetUsed(token);
      
      // Clear any existing session for security (force re-login with new password)
      if (req.session.userId === reset.userId) {
        req.session.destroy(() => {});
      }

      res.json({ message: "Password reset successfully. Please log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // User Routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Lobby Routes
  app.get("/api/lobbies", async (req, res) => {
    try {
      const lobbies = await storage.getActiveLobbies();
      res.json(lobbies);
    } catch (error) {
      res.status(500).json({ error: "Failed to get lobbies" });
    }
  });

  app.post("/api/lobbies", async (req, res) => {
    try {
      const { mode, pointGoal, hostId, hostName } = req.body;
      
      const lobby = await storage.createLobby({
        mode: mode || "ace_high",
        pointGoal: pointGoal || "300",
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

  // Matchmaking Routes
  app.post("/api/matchmaking/join", async (req, res) => {
    try {
      const { userId, gameMode, pointGoal } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const user = await storage.getUser(parseInt(userId, 10));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      matchmaking.addToQueue(
        user,
        gameMode || "ace_high",
        pointGoal || "300"
      );

      res.json({ 
        message: "Added to matchmaking queue",
        queueSize: matchmaking.getQueueSize()
      });
    } catch (error) {
      console.error("Matchmaking error:", error);
      res.status(500).json({ error: "Failed to join matchmaking" });
    }
  });

  app.post("/api/matchmaking/leave", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      matchmaking.removeFromQueue(parseInt(userId, 10));
      res.json({ message: "Removed from queue" });
    } catch (error) {
      res.status(500).json({ error: "Failed to leave matchmaking" });
    }
  });

  app.get("/api/matchmaking/status", async (req, res) => {
    try {
      res.json({ queueSize: matchmaking.getQueueSize() });
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}
