export function classifyFrame(samples: Float32Array, sampleRate: number) {
  let energy = 0, mean = 0;
  for (const value of samples) mean += value;
  mean /= samples.length || 1;
  for (const value of samples) energy += (value - mean) ** 2;
  const rms = Math.sqrt(energy / (samples.length || 1));
  // Fixed RMS gate and periodicity suppress silence/broadband noise. Music or humming can still qualify; no letter identity is inferred.
  if (rms < 0.015 || !sampleRate || samples.length < 64) return { voiced: false, rms, periodicity: 0 };
  let best = 0;
  const minLag = Math.floor(sampleRate / 500), maxLag = Math.min(Math.ceil(sampleRate / 65), Math.floor(samples.length / 2));
  for (let lag = minLag; lag <= maxLag; lag += 2) {
    let cross = 0, left = 0, right = 0;
    for (let i = 0; i < samples.length - lag; i += 4) {
      const a = samples[i] - mean, b = samples[i + lag] - mean;
      cross += a * b; left += a * a; right += b * b;
    }
    best = Math.max(best, cross / (Math.sqrt(left * right) || 1));
  }
  return { voiced: best >= 0.65, rms, periodicity: best };
}
export function createMeter(requiredMs = 2000) {
  let previous: number | null = null, previousVoiced = false, duration = 0, silence = 0;
  return {
    update(now: number, voiced: boolean) {
      const gap = previous === null ? 0 : Math.max(0, now - previous);
      previous = now;
      if (gap > 150) { duration = 0; silence = 0; }
      else if (voiced && previousVoiced) { duration += gap; silence = 0; }
      else if (!voiced) { silence += gap; if (silence > 200) duration = 0; }
      previousVoiced = voiced;
      return { durationMs: Math.min(duration, requiredMs), progress: Math.min(100, duration / requiredMs * 100), complete: duration >= requiredMs };
    }
  };
}
