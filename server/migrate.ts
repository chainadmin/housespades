import { db } from "./db";
import { sql } from "drizzle-orm";

export async function migrate() {
  console.log("Running database migration...");
  
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL DEFAULT 1000,
        games_played INTEGER NOT NULL DEFAULT 0,
        games_won INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS match_history (
        id SERIAL PRIMARY KEY,
        game_mode VARCHAR(50) NOT NULL,
        point_goal INTEGER NOT NULL,
        winning_team_score INTEGER NOT NULL,
        losing_team_score INTEGER NOT NULL,
        played_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS match_players (
        id SERIAL PRIMARY KEY,
        match_id INTEGER NOT NULL REFERENCES match_history(id),
        user_id INTEGER REFERENCES users(id),
        team_index INTEGER NOT NULL,
        is_bot BOOLEAN NOT NULL DEFAULT false,
        rating_change INTEGER NOT NULL DEFAULT 0
      )
    `);

    console.log("Database migration complete");
  } catch (error) {
    console.error("Database migration failed:", error);
    throw error;
  }
}
