// Audio utility for playing sound files from /public/sounds/

let currentAudio: HTMLAudioElement | null = null;

export function playSound(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Stop previous sound if still playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    const audio = new Audio(path);
    currentAudio = audio;
    audio.play()
      .then(() => {
        audio.onended = () => resolve();
      })
      .catch((e) => {
        console.warn(`Audio play failed for ${path}:`, e);
        reject(e);
      });
  });
}

// Play without stopping previous (for overlapping sounds like claps)
export function playSoundOverlap(path: string): void {
  const audio = new Audio(path);
  audio.play().catch((e) => {
    console.warn(`Audio play failed for ${path}:`, e);
  });
}

// Click/Success/Error sounds
export function playClick(): void {
  playSoundOverlap('/sounds/click.mp3');
}

export function playSuccess(): void {
  playSoundOverlap('/sounds/success.mp3');
}

export function playError(): void {
  playSoundOverlap('/sounds/error.mp3');
}

// Alippe letter sound
export function playAlippeSound(letter: string): void {
  const letterLower = letter.toLowerCase();
  const path = `/sounds/Alippe/Alippe_${letterLower}.mp3`;
  const audio = new Audio(path);
  audio.play().catch(() => {
    // Fallback to letters/ directory
    const fallback = `/sounds/letters/letter_${letterLower}.mp3`;
    new Audio(fallback).play().catch(() => { });
  });
}

// Letter sound for letter game
export function playLetterSound(letter: string): void {
  const letterLower = letter.toLowerCase();
  const path = `/sounds/letters/letter_${letterLower}.mp3`;
  new Audio(path).play().catch(() => {
    // Fallback to Alippe
    new Audio(`/sounds/Alippe/Alippe_${letterLower}.mp3`).play().catch(() => { });
  });
}

// Simple beep for sound detection task
export function playBeep(frequency = 440, duration = 500): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, duration);
  } catch { }
}
