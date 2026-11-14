import { describe, expect, it } from 'vitest';
import * as api from '../features/practice/train/signal';
function tone(frequency = 220) { return Float32Array.from({ length: 2048 }, (_, i) => Math.sin(i * frequency / 48000 * Math.PI * 2) * 0.15); }
describe('sustained voiced activity', () => {
  it('rejects silence and deterministic broadband noise, accepts sustained periodic signal', () => {
    expect(api.classifyFrame(new Float32Array(2048), 48000).voiced).toBe(false);
    let seed = 123;
    const noise = Float32Array.from({ length: 2048 }, () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed / 4294967296 - 0.5) * 0.5; });
    expect(api.classifyFrame(noise, 48000).voiced).toBe(false);
    expect(api.classifyFrame(tone(), 48000).voiced).toBe(true);
    expect(api.classifyFrame(tone(80), 48000).voiced).toBe(true);
    expect(api.classifyFrame(tone(430), 48000).voiced).toBe(true);
  });
  it.each([30, 60, 120])('uses 2 seconds at %s FPS', fps => {
    const meter = api.createMeter();
    let result = meter.update(0, true);
    for (let i = 1; i <= fps * 2; i++) result = meter.update(i * 1000 / fps, true);
    expect(result.durationMs).toBeCloseTo(2000);
    expect(result.complete).toBe(true);
  });
  it('long silence and hidden-frame gaps reset sustain', () => {
    const meter = api.createMeter();
    for (let t = 0; t <= 1000; t += 50) meter.update(t, true);
    expect(meter.update(1050, false).progress).toBe(50);
    for (let t = 1100; t <= 1300; t += 50) meter.update(t, false);
    expect(meter.update(1350, true).progress).toBe(0);
    expect(meter.update(9000, true).progress).toBe(0);
  });
});
