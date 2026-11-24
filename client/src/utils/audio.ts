// Sound effect utility using Kenney casino audio pack assets (section 4A.4)

export type SoundEvent = 'chip' | 'cardPlace' | 'cardSlide' | 'chipsCollide';

export const playSound = (sound: SoundEvent) => {
  try {
    let file = 'chips-collide-1.ogg';
    if (sound === 'chip') {
      const num = Math.floor(Math.random() * 6) + 1;
      file = `chips-handle-${num}.ogg`;
    } else if (sound === 'cardPlace') {
      const num = Math.floor(Math.random() * 4) + 1;
      file = `card-place-${num}.ogg`;
    } else if (sound === 'cardSlide') {
      const num = Math.floor(Math.random() * 8) + 1;
      file = `card-slide-${num}.ogg`;
    } else if (sound === 'chipsCollide') {
      const num = Math.floor(Math.random() * 4) + 1;
      file = `chips-collide-${num}.ogg`;
    }
    const audio = new Audio(`/assets/sounds/${file}`);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // Autoplay policy or muted environment
  }
};
