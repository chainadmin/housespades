import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { GameWebSocketServer } from "./websocket";
import { matchmaking } from "./matchmaking";
import { sendPasswordResetEmail } from "./email";
import bcrypt from "bcrypt";
import { z } from "zod";
import { sign as signCookie } from "cookie-signature";

// Helper to generate signed session cookie for mobile apps
// Must match express-session's cookie format exactly
function generateSignedSessionCookie(sessionId: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error("SESSION_SECRET not set - session cookies will not work");
    return "";
  }
  // cookie-signature.sign() returns "sessionId.signature"
  // express-session expects the cookie value to be: s:sessionId.signature
  const signedValue = signCookie(sessionId, secret);
  // DO NOT URL-encode - mobile sends this directly as Cookie header
  // Express-session's cookie parser expects the raw value
  return `connect.sid=s:${signedValue}`;
}

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
      const normalizedEmail = email.toLowerCase();

      const existingEmail = await storage.getUserByEmail(normalizedEmail);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, email: normalizedEmail, passwordHash });

      req.session.userId = user.id;

      // CRITICAL: Save session to store BEFORE responding
      // This ensures the session exists when mobile app makes the next request
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to create session" });
        }

        // Generate signed session cookie for mobile apps
        const sessionCookie = generateSignedSessionCookie(req.sessionID);

        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          rating: user.rating,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          sessionCookie, // Full signed cookie for mobile apps
        });
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

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;

      // CRITICAL: Save session to store BEFORE responding
      // This ensures the session exists when mobile app makes the next request
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Failed to create session" });
        }

        // Generate signed session cookie for mobile apps
        const sessionCookie = generateSignedSessionCookie(req.sessionID);

        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          rating: user.rating,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          sessionCookie, // Full signed cookie for mobile apps
        });
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

      const user = await storage.getUserByEmail(email.toLowerCase());
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

  // Helper function for getting current user data
  const getCurrentUser = async (req: any, res: any) => {
    try {
      // Debug logging for mobile auth issues
      console.log('[Auth Debug] Cookie header:', req.headers.cookie);
      console.log('[Auth Debug] Session ID:', req.sessionID);
      console.log('[Auth Debug] Session userId:', req.session?.userId);
      
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
        removeAds: user.removeAds,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  };

  // Both endpoints use the same logic for getting current user
  app.get("/api/auth/me", getCurrentUser);
  app.get("/api/user/profile", getCurrentUser);

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.delete("/api/auth/account", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
      });

      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Purchase Routes - for verifying in-app purchases
  app.post("/api/purchase/verify", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { platform, receipt, productId } = req.body;
      
      if (!platform || !receipt || !productId) {
        return res.status(400).json({ error: "Missing purchase data" });
      }

      // TODO: Verify receipt with Google Play or Apple App Store
      // For now, we'll trust the mobile app's verification
      // In production, implement server-side receipt validation:
      // - iOS: https://developer.apple.com/documentation/appstorereceipts
      // - Android: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products
      
      if (productId === "remove_ads") {
        const updated = await storage.setRemoveAds(userId, true);
        if (!updated) {
          return res.status(400).json({ error: "Failed to update purchase" });
        }
        
        return res.json({ 
          success: true, 
          message: "Ads removed successfully",
          removeAds: true 
        });
      }

      res.status(400).json({ error: "Unknown product" });
    } catch (error) {
      console.error("Purchase verification error:", error);
      res.status(500).json({ error: "Failed to verify purchase" });
    }
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
      // Use session userId first, fallback to body for backwards compatibility
      const userId = req.session.userId || req.body.userId;
      const { gameMode, pointGoal } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(typeof userId === 'string' ? parseInt(userId, 10) : userId);
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
      // Use session userId first, fallback to body for backwards compatibility
      const userId = req.session.userId || req.body.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      matchmaking.removeFromQueue(typeof userId === 'string' ? parseInt(userId, 10) : userId);
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
