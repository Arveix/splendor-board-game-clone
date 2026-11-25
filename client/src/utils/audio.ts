// Sound management utility for Renaissance merchant atmosphere per user design:
// - Gem collection: subtle gemstone / coin clink
// - Buying a card: quiet paper / card placement
// - Reserving a card: soft paper card slide
// - Noble visit: short orchestral / royal flourish
// - Game completion: restrained fanfare
// Includes full mute control and volume setting saved in localStorage.

export type SoundEvent =
  | 'gemCollect'
  | 'gemReturn'
  | 'cardBuy'
  | 'cardReserve'
  | 'nobleVisit'
  | 'gameWin';

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
    }
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
};

// Preference state helpers
const STORAGE_KEY_MUTED = 'splendor_sound_muted';
const STORAGE_KEY_VOLUME = 'splendor_sound_volume';

export const isSoundMuted = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
};

export const setSoundMuted = (muted: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
};

export const getSoundVolume = (): number => {
  if (typeof window === 'undefined') return 0.4;
  const saved = localStorage.getItem(STORAGE_KEY_VOLUME);
  return saved ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.4;
};

export const setSoundVolume = (volume: number): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_VOLUME, String(Math.max(0, Math.min(1, volume))));
};

// 1. Gemstone / Coin Clink: Pure, resonant mineral/metallic high-frequency chime
const playGemClink = (ctx: AudioContext, baseVolume: number, isGold = false) => {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(baseVolume * 0.35, now);
  masterGain.connect(ctx.destination);

  // Micro-randomization of pitch so repeated pickups sound natural and tactile
  const pitchVariation = 0.95 + Math.random() * 0.1;
  const baseFreq = isGold ? 1760 * pitchVariation : 2340 * pitchVariation;
  const harmonics = isGold ? [1, 2.76, 5.4] : [1, 1.58, 2.71, 4.2];

  harmonics.forEach((harmonicRatio, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = i === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq * harmonicRatio, now);

    const decayTime = 0.12 + (harmonics.length - i) * 0.04;
    gain.gain.setValueAtTime(0.4 / (i + 1), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + decayTime);
  });
};

// 2. Noble Visit: Short, elegant Renaissance royal flourish (stately plucked triad)
const playNobleFlourish = (ctx: AudioContext, baseVolume: number) => {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(baseVolume * 0.45, now);
  masterGain.connect(ctx.destination);

  // D major triumphant triad chords arpeggiated gracefully: D4, F#4, A4, D5
  const notes = [293.66, 369.99, 440.0, 587.33];
  notes.forEach((freq, idx) => {
    const noteTime = now + idx * 0.12;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(freq, noteTime);
    osc2.frequency.setValueAtTime(freq * 2.01, noteTime); // subtle chorusing

    gain.gain.setValueAtTime(0.0001, noteTime);
    gain.gain.linearRampToValueAtTime(0.3, noteTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.7);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc.start(noteTime);
    osc2.start(noteTime);
    osc.stop(noteTime + 0.75);
    osc2.stop(noteTime + 0.75);
  });
};

// 3. Game Completion: Restrained ceremonial fanfare (warm Renaissance brass/organ chords)
const playVictoryFanfare = (ctx: AudioContext, baseVolume: number) => {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(baseVolume * 0.5, now);
  masterGain.connect(ctx.destination);

  // Dignified Renaissance sequence: [G major] -> [C major] -> [D major]
  const chords = [
    { time: 0.0, notes: [196.0, 246.94, 293.66], duration: 0.35 },
    { time: 0.38, notes: [261.63, 329.63, 392.0], duration: 0.35 },
    { time: 0.76, notes: [293.66, 369.99, 440.0, 587.33], duration: 0.9 },
  ];

  chords.forEach(({ time, notes, duration }) => {
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + time;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  });
};

// 4. Physical Card sounds (curated quiet paper placement & soft slide)
const playCardAudioFile = (prefix: 'card-place' | 'card-slide', count: number, volume: number) => {
  try {
    const num = Math.floor(Math.random() * count) + 1;
    const audio = new Audio(`/assets/sounds/${prefix}-${num}.ogg`);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {});
  } catch {
    // Autoplay blocked or unmounted
  }
};

/**
 * Primary dispatch function for all sound events in the game.
 */
export const playSound = (event: SoundEvent, options?: { isGold?: boolean }): void => {
  if (isSoundMuted()) return;
  const volume = getSoundVolume();
  if (volume <= 0) return;

  try {
    switch (event) {
      case 'gemCollect': {
        const ctx = getAudioContext();
        if (ctx) playGemClink(ctx, volume, options?.isGold);
        break;
      }
      case 'gemReturn': {
        const ctx = getAudioContext();
        if (ctx) playGemClink(ctx, volume * 0.85, false);
        break;
      }
      case 'cardBuy':
        // Soft paper card placement (quiet & tactile)
        playCardAudioFile('card-place', 4, volume * 0.35);
        break;
      case 'cardReserve':
        // Gentle paper slide across table
        playCardAudioFile('card-slide', 8, volume * 0.28);
        break;
      case 'nobleVisit': {
        const ctx = getAudioContext();
        if (ctx) playNobleFlourish(ctx, volume);
        break;
      }
      case 'gameWin': {
        const ctx = getAudioContext();
        if (ctx) playVictoryFanfare(ctx, volume);
        break;
      }
    }
  } catch {
    // Silently handle any browser audio policy or disposal issues
  }
};
