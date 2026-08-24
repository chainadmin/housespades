import crypto from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { multiplayerRoomPlayers, multiplayerRooms, users, type GameMode, type PointGoal } from "@shared/schema";

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const ROOM_LIFETIME_MS = 30 * 60 * 1000;

export class PrivateRoomError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function normalizeRoomCode(code: unknown) {
  return String(code ?? "").toUpperCase().replace(/\s/g, "").trim();
}

function generateCode(length = 5) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

async function expireIfNeeded(room: typeof multiplayerRooms.$inferSelect) {
  if (room.status === "waiting" && room.expiresAt <= new Date()) {
    await db.update(multiplayerRooms).set({ status: "expired", updatedAt: new Date() }).where(eq(multiplayerRooms.id, room.id));
    throw new PrivateRoomError("This room has expired.", 410);
  }
  return room;
}

export async function roomView(roomId: string) {
  const [room] = await db.select().from(multiplayerRooms).where(eq(multiplayerRooms.id, roomId)).limit(1);
  if (!room) throw new PrivateRoomError("Room not found.", 404);
  await expireIfNeeded(room);
  const players = await db.select({
    id: multiplayerRoomPlayers.id, userId: multiplayerRoomPlayers.userId,
    username: users.username, displayName: users.displayName, avatar: users.avatar,
    seatNumber: multiplayerRoomPlayers.seatNumber, team: multiplayerRoomPlayers.team,
    ready: multiplayerRoomPlayers.ready, isHost: multiplayerRoomPlayers.isHost,
    isBot: multiplayerRoomPlayers.isBot, joinedAt: multiplayerRoomPlayers.joinedAt,
  }).from(multiplayerRoomPlayers).leftJoin(users, eq(multiplayerRoomPlayers.userId, users.id))
    .where(eq(multiplayerRoomPlayers.roomId, roomId)).orderBy(asc(multiplayerRoomPlayers.seatNumber));
  return { ...room, players };
}

export async function createPrivateRoom(userId: number, settings: { gameMode?: GameMode; pointGoal?: PointGoal }) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const id = crypto.randomUUID();
    try {
      const room = await db.transaction(async tx => {
        const [room] = await tx.insert(multiplayerRooms).values({
          id, roomCode: generateCode(), hostUserId: userId,
          gameMode: settings.gameMode ?? "ace_high", pointGoal: settings.pointGoal ?? "300",
          expiresAt: new Date(Date.now() + ROOM_LIFETIME_MS),
        }).returning();
        await tx.insert(multiplayerRoomPlayers).values({ roomId: id, userId, seatNumber: 1, team: 1, isHost: true });
        return room;
      });
      return roomView(room.id);
    } catch (error: any) {
      if (error?.code !== "23505") throw error;
    }
  }
  throw new PrivateRoomError("Could not create a unique room code. Please try again.", 503);
}

export async function joinPrivateRoom(userId: number, rawCode: unknown) {
  const code = normalizeRoomCode(rawCode);
  if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5,6}$/.test(code)) throw new PrivateRoomError("Room not found.", 404);
  return db.transaction(async tx => {
    const rows = await tx.execute(sql`SELECT * FROM multiplayer_rooms WHERE room_code = ${code} FOR UPDATE`);
    const raw = rows.rows[0] as any;
    if (!raw) throw new PrivateRoomError("Room not found.", 404);
    const roomId = raw.id as string;
    if (raw.status === "waiting" && new Date(raw.expires_at) <= new Date()) {
      await tx.update(multiplayerRooms).set({ status: "expired" }).where(eq(multiplayerRooms.id, roomId));
      throw new PrivateRoomError("This room has expired.", 410);
    }
    if (raw.status !== "waiting") throw new PrivateRoomError(raw.status === "expired" ? "This room has expired." : "This game has already started.", 409);
    const existing = await tx.select().from(multiplayerRoomPlayers).where(and(eq(multiplayerRoomPlayers.roomId, roomId), eq(multiplayerRoomPlayers.userId, userId))).limit(1);
    if (existing.length) throw new PrivateRoomError("You are already in this room.", 409);
    const occupied = await tx.select({ seat: multiplayerRoomPlayers.seatNumber }).from(multiplayerRoomPlayers).where(eq(multiplayerRoomPlayers.roomId, roomId));
    if (occupied.length >= raw.max_players) throw new PrivateRoomError("This room is already full.", 409);
    const seats = new Set(occupied.map(p => p.seat));
    const seatNumber = [1, 2, 3, 4].find(seat => !seats.has(seat))!;
    await tx.insert(multiplayerRoomPlayers).values({ roomId, userId, seatNumber, team: seatNumber % 2 ? 1 : 2 });
    await tx.update(multiplayerRooms).set({ updatedAt: new Date(), expiresAt: new Date(Date.now() + ROOM_LIFETIME_MS) }).where(eq(multiplayerRooms.id, roomId));
    return roomId;
  }).then(roomView);
}

export async function assertMember(roomId: string, userId: number) {
  const [member] = await db.select().from(multiplayerRoomPlayers).where(and(eq(multiplayerRoomPlayers.roomId, roomId), eq(multiplayerRoomPlayers.userId, userId))).limit(1);
  if (!member) throw new PrivateRoomError("You are not a member of this room.", 403);
  return member;
}

export async function assertHost(roomId: string, userId: number) {
  const member = await assertMember(roomId, userId);
  if (!member.isHost) throw new PrivateRoomError("Only the host can do that.", 403);
  return member;
}

export async function leavePrivateRoom(roomId: string, userId: number) {
  const member = await assertMember(roomId, userId);
  await db.transaction(async tx => {
    await tx.delete(multiplayerRoomPlayers).where(eq(multiplayerRoomPlayers.id, member.id));
    if (member.isHost) {
      const [next] = await tx.select().from(multiplayerRoomPlayers).where(and(eq(multiplayerRoomPlayers.roomId, roomId), eq(multiplayerRoomPlayers.isBot, false))).orderBy(asc(multiplayerRoomPlayers.joinedAt)).limit(1);
      if (next) {
        await tx.update(multiplayerRoomPlayers).set({ isHost: true }).where(eq(multiplayerRoomPlayers.id, next.id));
        await tx.update(multiplayerRooms).set({ hostUserId: next.userId!, updatedAt: new Date() }).where(eq(multiplayerRooms.id, roomId));
      } else await tx.update(multiplayerRooms).set({ status: "closed", updatedAt: new Date() }).where(eq(multiplayerRooms.id, roomId));
    }
  });
}
