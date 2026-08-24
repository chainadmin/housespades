type PresenceStatus = "Online" | "In Game" | "Offline";

class PresenceService {
  private states = new Map<number, { status: PresenceStatus; seenAt: number }>();
  set(userId: number, status: PresenceStatus) { this.states.set(userId, { status, seenAt: Date.now() }); }
  touch(userId: number) {
    const current = this.states.get(userId);
    this.set(userId, current?.status === "In Game" ? "In Game" : "Online");
  }
  offline(userId: number) { this.states.delete(userId); }
  get(userId: number): PresenceStatus {
    const current = this.states.get(userId);
    if (!current || (current.status !== "In Game" && Date.now() - current.seenAt > 45_000)) return "Offline";
    return current.status;
  }
}

export const presence = new PresenceService();
