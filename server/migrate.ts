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
        remove_ads BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS remove_ads BOOLEAN NOT NULL DEFAULT false
    `);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(80)`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY, requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending', created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(), CHECK (requester_id <> recipient_id),
        UNIQUE (requester_id, recipient_id)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_invites (
        id SERIAL PRIMARY KEY, sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, room_id VARCHAR(255) NOT NULL,
        game_mode VARCHAR(50) NOT NULL, point_goal VARCHAR(10) NOT NULL DEFAULT '300',
        status VARCHAR(20) NOT NULL DEFAULT 'pending', created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS multiplayer_rooms (
        id VARCHAR(64) PRIMARY KEY, room_code VARCHAR(6) NOT NULL UNIQUE,
        room_type VARCHAR(16) NOT NULL DEFAULT 'private', host_user_id INTEGER NOT NULL REFERENCES users(id),
        status VARCHAR(16) NOT NULL DEFAULT 'waiting', max_players INTEGER NOT NULL DEFAULT 4,
        bot_fill_enabled BOOLEAN NOT NULL DEFAULT true, game_mode VARCHAR(50) NOT NULL DEFAULT 'ace_high',
        point_goal VARCHAR(10) NOT NULL DEFAULT '300', game_session_id VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS multiplayer_room_players (
        id SERIAL PRIMARY KEY, room_id VARCHAR(64) NOT NULL REFERENCES multiplayer_rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, seat_number INTEGER NOT NULL,
        team INTEGER NOT NULL DEFAULT 1, ready BOOLEAN NOT NULL DEFAULT false,
        is_host BOOLEAN NOT NULL DEFAULT false, is_bot BOOLEAN NOT NULL DEFAULT false,
        joined_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE(room_id, user_id), UNIQUE(room_id, seat_number)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS multiplayer_rooms_code_status ON multiplayer_rooms(room_code, status)`);

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

    // Session table for connect-pg-simple (express sessions)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        PRIMARY KEY ("sid")
      )
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
    `);

    console.log("Database migration complete");
  } catch (error) {
    console.error("Database migration failed:", error);
    throw error;
  }
}
