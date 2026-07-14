import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as SecureStore from 'expo-secure-store';

const SOUND_MUTED_KEY = 'house_spades_sound_muted';

export type SoundName =
  | 'card-play'
  | 'card-deal'
  | 'bid'
  | 'trick-win'
  | 'your-turn'
  | 'win'
  | 'lose';

const SOURCES: Record<SoundName, number> = {
  'card-play': require('@/assets/sounds/card-play.wav'),
  'card-deal': require('@/assets/sounds/card-deal.wav'),
  'bid': require('@/assets/sounds/bid.wav'),
  'trick-win': require('@/assets/sounds/trick-win.wav'),
  'your-turn': require('@/assets/sounds/your-turn.wav'),
  'win': require('@/assets/sounds/win.wav'),
  'lose': require('@/assets/sounds/lose.wav'),
};

let muted = false;
let initialized = false;
let ready = false;
let pendingSounds: SoundName[] = [];
const players: Partial<Record<SoundName, AudioPlayer>> = {};

export async function initSounds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
    });
  } catch (err) {
    if (__DEV__) console.log('[Sound] Audio mode setup failed:', err);
  }
  try {
    const stored = await SecureStore.getItemAsync(SOUND_MUTED_KEY);
    muted = stored === 'true';
  } catch {
    muted = false;
  }
  try {
    (Object.keys(SOURCES) as SoundName[]).forEach((name) => {
      players[name] = createAudioPlayer(SOURCES[name]);
    });
  } catch (err) {
    if (__DEV__) console.log('[Sound] Player creation failed:', err);
  }
  ready = true;
  const queued = pendingSounds;
  pendingSounds = [];
  queued.forEach((name) => playSound(name));
}

let lastPlayed: { name: SoundName; at: number } | null = null;

export function playSound(name: SoundName): void {
  if (muted) return;
  if (!ready) {
    if (pendingSounds.length < 3 && !pendingSounds.includes(name)) {
      pendingSounds.push(name);
    }
    return;
  }
  const now = Date.now();
  if (lastPlayed && lastPlayed.name === name && now - lastPlayed.at < 80) {
    return;
  }
  lastPlayed = { name, at: now };
  const player = players[name];
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch (err) {
    if (__DEV__) console.log('[Sound] Play failed:', name, err);
  }
}

export function isSoundMuted(): boolean {
  return muted;
}

export async function getSoundMuted(): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(SOUND_MUTED_KEY);
    muted = stored === 'true';
  } catch {}
  return muted;
}

export async function setSoundMuted(value: boolean): Promise<void> {
  muted = value;
  try {
    await SecureStore.setItemAsync(SOUND_MUTED_KEY, value ? 'true' : 'false');
  } catch (err) {
    if (__DEV__) console.log('[Sound] Failed to persist mute setting:', err);
  }
}
