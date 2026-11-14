import type { Segment, TrainMode, Verdict } from './types';

export const targets: Record<string, string[]> = { 'А':['a','ɑ'], 'Ә':['æ','ɛ'], 'О':['o','oː'], 'Ө':['ø','œ'], 'Ұ':['ʊ'], 'Ү':['y','yː'], 'Ы':['ɯ','ɨ'], 'І':['ɪ','ɘ'], 'У':['u','uː'], 'П':['p'], 'Б':['b'], 'Т':['t'], 'К':['k'] };
const normalizePhone = (phone: string) => phone.replace(/[ːˑ]/g, '');
const carriers = new Set(['a','ɑ','æ','ɛ','ə','ɐ','ɨ','ɯ','ɪ','ɘ','ʌ','ɜ','u','o','ʊ','ø','œ','y','i','e','ɤ']);
export const consonants = new Set(['П','Б','Т','К']);
export function assess(letter: string, mode: TrainMode, segments: Segment[], voicedDurationMs = 0): Verdict {
  const accepted = (targets[letter] || []).map(normalizePhone);
  const voiced = segments.filter(s => s.phone).map(s => ({ ...s, phone:normalizePhone(s.phone) }));
  const isConsonant = consonants.has(letter);
  if (!voiced.length) return { correct:false, reason:'empty', phones:[], score:0, confidence:0, dominance:0, progress:0 };
  const phones = voiced.map(s => s.phone);
  const reliable = voiced.filter(s => (s.confidence ?? 1) >= 0.35);
  const hits = reliable.filter(s => accepted.includes(s.phone));
  const competitors = reliable.filter(s => !accepted.includes(s.phone) && !(isConsonant && carriers.has(s.phone)));
  const targetWeight = hits.reduce((sum,s) => sum + (s.confidence ?? 1),0);
  const otherWeight = competitors.reduce((sum,s) => sum + (s.confidence ?? 1),0);
  const dominance = targetWeight / (targetWeight + otherWeight || 1);
  const confidence = hits.length ? targetWeight / hits.length : 0;
  const score = Math.round(100 * dominance * confidence);
  const contradictory = competitors.some(s => (s.confidence ?? 1) >= 0.85);
  const identity = hits.length > 0 && confidence >= 0.5 && dominance >= 0.7 && !contradictory;
  const enough = isConsonant ? hits.length >= (mode === 'short' ? 1 : 3) : mode === 'short' || voicedDurationMs >= 2000;
  const correct = identity && enough;
  return { correct, reason:!identity ? 'different' : isConsonant ? 'repetitions' : 'duration', phones,
    score, confidence, dominance, ignoredPhones:voiced.filter(s => (s.confidence ?? 1) < 0.35).map(s => s.phone),
    durationMs:voicedDurationMs, progress:correct ? 100 : Math.min(90,Math.round(score * (enough ? 0.9 : 0.6))) };
}
export function signalProgress(milliseconds: number) { return Math.min(70,Math.max(0,milliseconds) / 500 * 70); }
export function speechBounds(pcm: Float32Array) {
  let first = -1, last = 0, maxRms = 0;
  for (let i = 0; i < pcm.length; i += 320) {
    let energy = 0; for (let j = i; j < Math.min(i + 320, pcm.length); j++) energy += pcm[j] * pcm[j];
    const rms = Math.sqrt(energy / 320); maxRms = Math.max(maxRms, rms);
    if (rms > 0.006) { if (first < 0) first = i; last = i + 320; }
  }
  if (first < 0) return null;
  first = Math.max(0, first - 4800);
  last = Math.min(pcm.length, last + 4800, first + 80000);
  return { first, last, maxRms };
}
