// Audio utility for playing sound files from /public/sounds/

let currentAudio: HTMLAudioElement | null = null;
const audioCache = new Map<string, HTMLAudioElement>();
const AUDIO_CACHE_LIMIT = 160;

function rememberAudio(path: string, audio: HTMLAudioElement) {
  if (audioCache.has(path)) {
    audioCache.delete(path);
  }

  audioCache.set(path, audio);

  while (audioCache.size > AUDIO_CACHE_LIMIT) {
    const oldestKey = audioCache.keys().next().value;
    if (!oldestKey) break;
    audioCache.delete(oldestKey);
  }
}

function getCachedAudio(path: string): HTMLAudioElement {
  const existing = audioCache.get(path);
  if (existing) {
    audioCache.delete(path);
    audioCache.set(path, existing);
    return existing;
  }

  const audio = new Audio(path);
  audio.preload = 'auto';
  try {
    audio.load();
  } catch {
    // The normal play fallback path handles missing legacy files.
  }
  rememberAudio(path, audio);
  return audio;
}

function preloadAudio(path: string): void {
  if (typeof window === 'undefined' || !path) return;
  getCachedAudio(path);
}

function preloadCandidates(paths: string[]): void {
  paths.forEach(preloadAudio);
}

function readProfileLang(): 'kk' | 'ru' {
  if (typeof window === 'undefined') return 'kk';
  const saved = window.localStorage.getItem('profileLang') || window.localStorage.getItem('locale');
  return saved === 'ru' ? 'ru' : 'kk';
}

function addWavFallback(path: string): string[] {
  return path.toLowerCase().endsWith('.mp3')
    ? [path, path.replace(/\.mp3$/i, '.wav')]
    : [path];
}

function getLocalizedAudioCandidates(path: string): string[] {
  if (readProfileLang() !== 'ru' || !path.startsWith('/sounds/')) {
    return [path];
  }

  const ruPath = path.replace('/sounds/', '/sounds/ru/');
  return [...addWavFallback(ruPath), path];
}

function playFirstAvailable(paths: string[], rejectOnFailure = true): Promise<void> {
  preloadCandidates(paths);

  return new Promise((resolve, reject) => {
    let index = 0;

    const playNext = () => {
      const path = paths[index++];
      if (!path) {
        if (rejectOnFailure) {
          reject(new Error('No playable audio source found.'));
        } else {
          resolve();
        }
        return;
      }

      const audio = getCachedAudio(path);
      currentAudio = audio;
      audio.pause();
      audio.currentTime = 0;
      audio.play()
        .then(() => {
          audio.onended = () => resolve();
        })
        .catch(playNext);
    };

    playNext();
  });
}

export function playSound(path: string): Promise<void> {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  return playFirstAvailable(getLocalizedAudioCandidates(path)).catch((e) => {
    console.warn(`Audio play failed for ${path}:`, e);
    throw e;
  });
}

// Play without stopping previous (for overlapping sounds like claps)
export function playSoundOverlap(path: string): void {
  const candidates = getLocalizedAudioCandidates(path);
  preloadCandidates(candidates);
  let index = 0;

  const playNext = () => {
    const candidate = candidates[index++];
    if (!candidate) return Promise.reject(new Error('No playable audio source found.'));
    const cachedAudio = getCachedAudio(candidate);
    const audio = cachedAudio.paused ? cachedAudio : (cachedAudio.cloneNode(true) as HTMLAudioElement);
    audio.preload = 'auto';
    audio.currentTime = 0;
    return audio.play().catch(playNext);
  };

  playNext().catch((e) => {
    console.warn(`Audio play failed for ${path}:`, e);
  });
}

if (typeof window !== 'undefined') {
  const preloadCommonAudio = () => {
    [
      '/sounds/click.mp3',
      '/sounds/success.mp3',
      '/sounds/error.mp3',
      '/sounds/clap.mp3',
    ].forEach((path) => preloadCandidates(getLocalizedAudioCandidates(path)));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preloadCommonAudio, { once: true });
  } else {
    preloadCommonAudio();
  }
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
  const candidates = [
    ...getLocalizedAudioCandidates(`/sounds/Alippe/Alippe_${letterLower}.mp3`),
    ...getLocalizedAudioCandidates(`/sounds/letters/letter_${letterLower}.mp3`),
  ];
  playFirstAvailable(candidates, false).catch(() => { });
}

// Letter sound for letter game
export function playLetterSound(letter: string): void {
  const letterLower = letter.toLowerCase();
  const candidates = [
    ...getLocalizedAudioCandidates(`/sounds/letters/letter_${letterLower}.mp3`),
    ...getLocalizedAudioCandidates(`/sounds/Alippe/Alippe_${letterLower}.mp3`),
  ];
  playFirstAvailable(candidates, false).catch(() => { });
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
