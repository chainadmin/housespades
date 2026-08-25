---
name: Online reconnect ownership
description: Reliability constraints for replacing authenticated sockets during matchmaking and live games
---

Treat a reconnecting socket as a replacement generation: stale socket close events must never remove presence or matchmaking state owned by the active replacement. Serialize queue leave before rejoin, cancel delayed retries on unmount, and retain gameplay actions until the replacement socket has authenticated.

**Why:** A stale close can arrive after a replacement connects and silently remove the new queue entry. Likewise, reconnect timers and action flushes can create orphan sockets or send game actions before the server has restored the player identity.

**How to apply:** Any online lifecycle change must preserve active-connection ownership checks on disconnect, invalidate stale attempts, cancel timers during cleanup, reset local queue membership after unexpected disconnect, and flush pending bids/cards only after authenticated reconnection.