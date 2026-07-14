---
name: Sound playback readiness
description: Race conditions when wiring game sound effects to React state effects
---
- Rule: if an audio module initializes asynchronously (audio mode + storage read + player creation), `playSound` calls fired before init completes must be queued and flushed after init, or the first cue (e.g. deal sound on initial phase entry) is silently dropped.
- Rule: an effect that reads a value (e.g. trick card count) must list it in its dependency array, even when the "trigger" is another value — otherwise transitions that only change the read value never fire the effect.
- **Why:** both bugs were caught in code review of the House Spades sound wiring; they produce intermittent missing cues that are hard to reproduce.
- **How to apply:** any future event-sound wiring in game screens — gate on a ready flag with a small pending queue, and audit effect deps against everything read inside.
