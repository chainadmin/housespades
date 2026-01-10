import { type User, type InsertUser, type GameState, type Lobby } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStats(id: string, won: boolean): Promise<User | undefined>;
  
  // Game lobbies
  getLobby(id: string): Promise<Lobby | undefined>;
  createLobby(lobby: Omit<Lobby, "id">): Promise<Lobby>;
  updateLobby(id: string, lobby: Partial<Lobby>): Promise<Lobby | undefined>;
  deleteLobby(id: string): Promise<boolean>;
  getActiveLobbies(): Promise<Lobby[]>;
  
  // Active games
  getGame(id: string): Promise<GameState | undefined>;
  saveGame(game: GameState): Promise<GameState>;
  deleteGame(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private lobbies: Map<string, Lobby>;
  private games: Map<string, GameState>;

  constructor() {
    this.users = new Map();
    this.lobbies = new Map();
    this.games = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      gamesPlayed: 0,
      gamesWon: 0,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStats(id: string, won: boolean): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      gamesPlayed: user.gamesPlayed + 1,
      gamesWon: user.gamesWon + (won ? 1 : 0),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
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
}

export const storage = new MemStorage();
