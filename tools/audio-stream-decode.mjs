import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

/** Decode the entire primary audio stream, without comparing decoder-specific PCM bytes. */
export function verifyAudioStream(file, ffmpeg = process.env.FFMPEG || 'ffmpeg') {
  const run = spawnSync(ffmpeg, [
    '-nostdin', '-v', 'error', '-xerror', '-abort_on', 'empty_output',
    '-threads', '1', '-i', file, '-map', '0:a:0', '-vn', '-f', 'null', '-',
  ], { windowsHide: true, encoding: 'utf8' });
  if (run.error) throw new Error(`${file}: could not run ${ffmpeg}`, { cause: run.error });
  assert.equal(run.status, 0, `${file}: ${run.stderr.trim() || run.signal || 'audio decode failed'}`);
}
