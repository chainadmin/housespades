import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { GameWebSocketServer } from "./websocket";
import { matchmaking } from "./matchmaking";
import { sendPasswordResetEmail } from "./email";
import bcrypt from "bcrypt";
import { z } from "zod";
import { sign as signCookie } from "cookie-signature";
import { verifyRemoveAdsWithRevenueCat } from "./purchases";
import { db } from "./db";
import { friendships, gameInvites, users, GAME_MODES, POINT_GOALS } from "@shared/schema";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { presence } from "./presence";

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

const purchaseVerifySchema = z.object({
  platform: z.enum(["ios", "android"]),
  productId: z.string().min(1),
});

const friendRequestSchema = z.object({ recipientId: z.number().int().positive() });
const inviteSchema = z.object({
  recipientIds: z.array(z.number().int().positive()).min(1).max(3),
  gameMode: z.enum(GAME_MODES), pointGoal: z.enum(POINT_GOALS), roomId: z.string().optional(),
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
          removeAds: user.removeAds,
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
          removeAds: user.removeAds,
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

  // Leaderboard endpoint (public — no auth required)
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limitParam = parseInt(String(req.query.limit ?? "50"), 10);
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;
      const players = await storage.getTopPlayers(limit);
      res.json({ players });
    } catch (error) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ error: "Failed to load leaderboard" });
    }
  });

  // Match history endpoint
  app.get("/api/user/match-history", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const matches = await storage.getUserMatchHistory(userId);
      res.json({ matches });
    } catch (error) {
      console.error("Get match history error:", error);
      res.status(500).json({ error: "Failed to get match history" });
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

      const parsed = purchaseVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Missing purchase data" });
      }
      const { platform } = parsed.data;

      // Never grant entitlements from a client-supplied receipt. The mobile
      // app purchases through RevenueCat (app user ID = our user id), and we
      // verify server-to-server with RevenueCat, which validates receipts
      // with Apple / Google.
      const result = await verifyRemoveAdsWithRevenueCat(String(userId), platform);
      if (!result.ok) {
        return res.status(result.status ?? 502).json({ error: result.error ?? "Receipt validation failed" });
      }

      if (!result.entitled) {
        return res.status(402).json({ error: "No valid remove-ads purchase found for this account" });
      }

      const updated = await storage.setRemoveAds(userId, true);
      if (!updated) {
        return res.status(500).json({ error: "Failed to update account" });
      }

      res.json({ success: true, removeAds: true });
    } catch (error) {
      console.error("Purchase verification error:", error);
      res.status(500).json({ error: "Failed to verify purchase" });
    }
  });

  // User Routes
  const publicProfile = (user: typeof users.$inferSelect) => ({
    id: user.id, username: user.username, displayName: user.displayName || user.username,
    avatar: user.avatar, rating: user.rating, gamesPlayed: user.gamesPlayed, gamesWon: user.gamesWon,
  });
  const requireUser = (req: any, res: any): number | undefined => {
    if (!req.session.userId) { res.status(401).json({ error: "Not authenticated" }); return; }
    presence.touch(req.session.userId);
    return req.session.userId;
  };

  app.get("/api/players/search", async (req, res) => {
    const userId = requireUser(req, res); if (!userId) return;
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1); const limit = 20;
    if (q.length < 2) return res.json({ players: [], page, hasMore: false });
    const rows = await db.select().from(users).where(and(sql`${users.id} <> ${userId}`,
      or(ilike(users.username, `%${q}%`), ilike(users.displayName, `%${q}%`))))
      .orderBy(users.username).limit(limit + 1).offset((page - 1) * limit);
    const ids = rows.slice(0, limit).map(x => x.id);
    const links = ids.length ? await db.select().from(friendships).where(and(
      or(eq(friendships.requesterId, userId), eq(friendships.recipientId, userId)),
      or(...ids.map(id => or(eq(friendships.requesterId, id), eq(friendships.recipientId, id)))))) : [];
    res.json({ players: rows.slice(0, limit).map(u => ({ ...publicProfile(u), friendship: links.find(f => f.requesterId === u.id || f.recipientId === u.id) || null })), page, hasMore: rows.length > limit });
  });

  app.get("/api/friends", async (req, res) => {
    const userId = requireUser(req, res); if (!userId) return;
    const rows = await db.select().from(friendships).where(and(eq(friendships.status, "accepted"), or(eq(friendships.requesterId, userId), eq(friendships.recipientId, userId))));
    const result = await Promise.all(rows.map(async f => { const otherId = f.requesterId === userId ? f.recipientId : f.requesterId; const [u] = await db.select().from(users).where(eq(users.id, otherId)); return { friendshipId: f.id, ...publicProfile(u), status: presence.get(otherId) }; }));
    res.json({ friends: result });
  });
  app.get("/api/friends/online", async (req, res) => {
    const userId = requireUser(req, res); if (!userId) return;
    const rows = await db.select().from(friendships).where(and(eq(friendships.status, "accepted"), or(eq(friendships.requesterId, userId), eq(friendships.recipientId, userId))));
    const result = (await Promise.all(rows.map(async f => { const id = f.requesterId === userId ? f.recipientId : f.requesterId; const [u] = await db.select().from(users).where(eq(users.id, id)); return { friendshipId: f.id, ...publicProfile(u), status: presence.get(id) }; }))).filter(x => x.status !== "Offline");
    res.json({ friends: result });
  });
  app.get("/api/friends/requests", async (req, res) => {
    const userId = requireUser(req, res); if (!userId) return;
    const rows = await db.select().from(friendships).where(and(eq(friendships.status, "pending"), or(eq(friendships.requesterId, userId), eq(friendships.recipientId, userId))));
    const decorated = await Promise.all(rows.map(async f => { const other = f.requesterId === userId ? f.recipientId : f.requesterId; const [u] = await db.select().from(users).where(eq(users.id, other)); return { id: f.id, direction: f.requesterId === userId ? "outgoing" : "incoming", player: publicProfile(u) }; }));
    const invites = await db.select({ invite: gameInvites, sender: users }).from(gameInvites).innerJoin(users, eq(gameInvites.senderId, users.id)).where(and(eq(gameInvites.recipientId, userId), eq(gameInvites.status, "pending"), sql`${gameInvites.expiresAt} > NOW()`));
    res.json({ requests: decorated, gameInvites: invites.map(x => ({ ...x.invite, sender: publicProfile(x.sender) })) });
  });
  app.post("/api/friends/request", async (req, res) => {
    const userId = requireUser(req, res); if (!userId) return; const parsed = friendRequestSchema.safeParse(req.body);
    if (!parsed.success || parsed.data.recipientId === userId) return res.status(400).json({ error: "Invalid recipient" });
    const [recipient] = await db.select().from(users).where(eq(users.id, parsed.data.recipientId)); if (!recipient) return res.status(404).json({ error: "Player not found" });
    const [existing] = await db.select().from(friendships).where(or(and(eq(friendships.requesterId, userId), eq(friendships.recipientId, recipient.id)), and(eq(friendships.requesterId, recipient.id), eq(friendships.recipientId, userId))));
    if (existing) return res.status(409).json({ error: "A friendship or request already exists" });
    const [request] = await db.insert(friendships).values({ requesterId: userId, recipientId: recipient.id }).returning(); res.status(201).json(request);
  });
  app.post("/api/friends/:id/accept", async (req, res) => { const uid=requireUser(req,res); if(!uid)return; const [f]=await db.update(friendships).set({status:"accepted",updatedAt:new Date()}).where(and(eq(friendships.id,+req.params.id),eq(friendships.recipientId,uid),eq(friendships.status,"pending"))).returning(); if(!f)return res.status(404).json({error:"Request not found"}); res.json(f); });
  app.post("/api/friends/:id/decline", async (req, res) => { const uid=requireUser(req,res); if(!uid)return; const [f]=await db.update(friendships).set({status:"declined",updatedAt:new Date()}).where(and(eq(friendships.id,+req.params.id),eq(friendships.recipientId,uid),eq(friendships.status,"pending"))).returning(); if(!f)return res.status(404).json({error:"Request not found"}); res.json(f); });
  app.delete("/api/friends/:id", async (req, res) => { const uid=requireUser(req,res); if(!uid)return; const rows=await db.delete(friendships).where(and(eq(friendships.id,+req.params.id),or(eq(friendships.requesterId,uid),eq(friendships.recipientId,uid)))).returning(); if(!rows.length)return res.status(404).json({error:"Friendship not found"}); res.status(204).end(); });

  app.post("/api/game-invites", async (req, res) => { const uid=requireUser(req,res); if(!uid)return; const parsed=inviteSchema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:"Invalid game invite"}); const host=await storage.getUser(uid); const room=parsed.data.roomId ? await storage.getLobby(parsed.data.roomId) : await storage.createLobby({mode:parsed.data.gameMode,pointGoal:parsed.data.pointGoal,hostId:String(uid),players:[{id:String(uid),name:host?.displayName||host?.username||"Player",isBot:false,isReady:true}],status:"waiting"}); if(!room)return res.status(404).json({error:"Room not found"}); const values=parsed.data.recipientIds.map(recipientId=>({senderId:uid,recipientId,roomId:room.id,gameMode:parsed.data.gameMode,pointGoal:parsed.data.pointGoal,expiresAt:new Date(Date.now()+15*60*1000)})); const created=await db.insert(gameInvites).values(values).returning(); res.status(201).json({room,invites:created}); });
  app.post("/api/game-invites/:id/accept", async (req,res)=>{ const uid=requireUser(req,res);if(!uid)return;const [invite]=await db.update(gameInvites).set({status:"accepted"}).where(and(eq(gameInvites.id,+req.params.id),eq(gameInvites.recipientId,uid),eq(gameInvites.status,"pending"),sql`${gameInvites.expiresAt} > NOW()`)).returning();if(!invite)return res.status(404).json({error:"Invite not found or expired"});const lobby=await storage.getLobby(invite.roomId);const user=await storage.getUser(uid);if(!lobby)return res.status(410).json({error:"Room is no longer available"});if(lobby.players.length>=4)return res.status(409).json({error:"Room is full"});const updated=await storage.updateLobby(lobby.id,{players:[...lobby.players,{id:String(uid),name:user?.displayName||user?.username||"Player",isBot:false,isReady:true}]});res.json({invite,lobby:updated});});
  app.post("/api/game-invites/:id/decline", async(req,res)=>{const uid=requireUser(req,res);if(!uid)return;const [i]=await db.update(gameInvites).set({status:"declined"}).where(and(eq(gameInvites.id,+req.params.id),eq(gameInvites.recipientId,uid),eq(gameInvites.status,"pending"))).returning();if(!i)return res.status(404).json({error:"Invite not found"});res.json(i);});

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
      
      res.json(publicProfile(user));
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

      console.log(`[Routes] User ${user.username} (id: ${user.id}) joined queue for ${gameMode}-${pointGoal}. Queue size: ${matchmaking.getQueueSize()}`);

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
