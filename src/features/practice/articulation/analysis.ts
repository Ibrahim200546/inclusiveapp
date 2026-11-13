import { normalizeLetter } from './content';

export interface AcousticFrame { energy: number; centroid: number }
export interface AcousticResult { kind: 'silent' | 'quiet' | 'heard' | 'matched' | 'retry'; success: boolean; score: number }
// Retained from the original exercise. These spectral heuristics are not a
// validated phoneme recognizer; feedback must not assert correct pronunciation.
const profiles: Record<string, [number, number]> = {
  'А': [60, 35], 'О': [50, 30], 'У': [35, 25], 'И': [95, 40], 'Ы': [75, 35], 'С': [180, 60], 'Ш': [140, 50], 'Р': [80, 40],
};
export function extractFrame(bins: Uint8Array): AcousticFrame {
  let energy = 0, weighted = 0;
  bins.forEach((value, index) => { energy += value; weighted += value * index; });
  return { energy: bins.length ? energy / bins.length : 0, centroid: weighted / (energy || 1) };
}
export function analyzeRecording(letter: string, frames: AcousticFrame[]): AcousticResult {
  const voiced = frames.filter(frame => Number.isFinite(frame.energy) && Number.isFinite(frame.centroid) && frame.energy > 15);
  if (voiced.length < 5) return { kind: 'silent', success: false, score: 0 };
  const loud = voiced.filter(frame => frame.energy > 30);
  if (!loud.length) return { kind: 'quiet', success: false, score: .1 };
  const profile = profiles[normalizeLetter(letter)];
  if (!profile) return { kind: 'heard', success: true, score: .7 };
  const centroid = loud.reduce((sum, frame) => sum + frame.centroid, 0) / loud.length;
  const distance = Math.abs(centroid - profile[0]), score = Math.max(0, 1 - distance / (profile[1] * 2));
  return distance <= profile[1] ? { kind: 'matched', success: true, score: .8 + score * .2 } : { kind: 'retry', success: false, score };
}
