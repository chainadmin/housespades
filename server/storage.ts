import { 
  users, passwordResets, matchHistory, matchPlayers,
  type DbUser, type InsertUser, type GameState, type Lobby 
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: number): Promise<DbUser | undefined>;
  getUserByEmail(email: string): Promise<DbUser | undefined>;
  getUserByUsername(username: string): Promise<DbUser | undefined>;
  createUser(user: InsertUser): Promise<DbUser>;
  updateUserStats(id: number, won: boolean, ratingChange: number): Promise<DbUser | undefined>;
  updateUserPassword(id: number, passwordHash: string): Promise<DbUser | undefined>;
  
  // Password resets
  createPasswordReset(userId: number, token: string, expiresAt: Date): Promise<void>;
  getPasswordReset(token: string): Promise<{ userId: number; expiresAt: Date; used: boolean } | undefined>;
  markPasswordResetUsed(token: string): Promise<void>;
  
  // Game lobbies (in-memory for real-time)
  getLobby(id: string): Promise<Lobby | undefined>;
  createLobby(lobby: Omit<Lobby, "id">): Promise<Lobby>;
  updateLobby(id: string, lobby: Partial<Lobby>): Promise<Lobby | undefined>;
  deleteLobby(id: string): Promise<boolean>;
  getActiveLobbies(): Promise<Lobby[]>;
  
  // Active games (in-memory for real-time)
  getGame(id: string): Promise<GameState | undefined>;
  saveGame(game: GameState): Promise<GameState>;
  deleteGame(id: string): Promise<boolean>;
  
  // Match history
  recordMatch(
    gameMode: string,
    pointGoal: string,
    winningScore: number,
    losingScore: number,
    players: { userId: number | null; isBot: boolean; teamIndex: number; ratingChange: number }[]
  ): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private lobbies: Map<string, Lobby>;
  private games: Map<string, GameState>;

  constructor() {
    this.lobbies = new Map();
    this.games = new Map();
  }

  async getUser(id: number): Promise<DbUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<DbUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<DbUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<DbUser> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserStats(id: number, won: boolean, ratingChange: number): Promise<DbUser | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const [updated] = await db
      .update(users)
      .set({
        gamesPlayed: user.gamesPlayed + 1,
        gamesWon: user.gamesWon + (won ? 1 : 0),
        rating: Math.max(0, user.rating + ratingChange),
      })
      .where(eq(users.id, id))
      .returning();
    
    return updated;
  }

  async updateUserPassword(id: number, passwordHash: string): Promise<DbUser | undefined> {
    const [updated] = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id))
      .returning();
    
    return updated || undefined;
  }

  async createPasswordReset(userId: number, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResets).values({ userId, token, expiresAt });
  }

  async getPasswordReset(token: string): Promise<{ userId: number; expiresAt: Date; used: boolean } | undefined> {
    const [reset] = await db.select().from(passwordResets).where(eq(passwordResets.token, token));
    return reset || undefined;
  }

  async markPasswordResetUsed(token: string): Promise<void> {
    await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.token, token));
  }

  async getLobby(id: string): Promise<Lobby | undefined> {
    return this.lobbies.get(id);
  }

  async createLobby(lobbyData: Omit<Lobby, "id">): Promise<Lobby> {
    const id = randomUUID();
    const lobby: Lobby = { ...lobbyData, id };
    this.lobbies.set(id, lobby);
    return lobby;
  }

  async updateLobby(id: string, updates: Partial<Lobby>): Promise<Lobby | undefined> {
    const lobby = this.lobbies.get(id);
    if (!lobby) return undefined;
    
    const updatedLobby = { ...lobby, ...updates };
    this.lobbies.set(id, updatedLobby);
    return updatedLobby;
  }

  async deleteLobby(id: string): Promise<boolean> {
    return this.lobbies.delete(id);
  }

  async getActiveLobbies(): Promise<Lobby[]> {
    return Array.from(this.lobbies.values()).filter(
      (lobby) => lobby.status === "waiting"
    );
  }

  async getGame(id: string): Promise<GameState | undefined> {
    return this.games.get(id);
  }

  async saveGame(game: GameState): Promise<GameState> {
    this.games.set(game.id, game);
    return game;
  }

  async deleteGame(id: string): Promise<boolean> {
    return this.games.delete(id);
  }

  async recordMatch(
    gameMode: string,
    pointGoal: string,
    winningScore: number,
    losingScore: number,
    players: { userId: number | null; isBot: boolean; teamIndex: number; ratingChange: number }[]
  ): Promise<void> {
    const [match] = await db
      .insert(matchHistory)
      .values({
        gameMode,
        pointGoal,
        winningTeamScore: winningScore,
        losingTeamScore: losingScore,
      })
      .returning();

    for (const player of players) {
      await db.insert(matchPlayers).values({
        matchId: match.id,
        userId: player.userId,
        isBot: player.isBot,
        teamIndex: player.teamIndex,
        ratingChange: player.ratingChange,
      });
    }
  }
}

export const storage = new DatabaseStorage();
