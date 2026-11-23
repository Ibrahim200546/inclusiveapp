import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { verifyAudioStream } from './audio-stream-decode.mjs';

const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const hasFfmpeg = spawnSync(ffmpeg, ['-version'], { windowsHide: true }).status === 0;

function wave(length) {
  const buffer = Buffer.alloc(44 + length);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(length, 40);
  return buffer;
}

test('strict decode accepts audio, rejects empty streams and corrupt input', { skip: !hasFfmpeg }, t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'corex-audio-stream-'));
  t.after(() => fs.rmSync(folder, { force: true, recursive: true }));
  const write = (name, bytes) => { const file = path.join(folder, name); fs.writeFileSync(file, bytes); return file; };
  verifyAudioStream(write('valid wave.wav', wave(3200)), ffmpeg);
  assert.throws(() => verifyAudioStream(write('empty.wav', wave(0)), ffmpeg), /empty\.wav/);
  assert.throws(() => verifyAudioStream(write('corrupt.wav', Buffer.from('not audio')), ffmpeg), /corrupt\.wav/);
});

test('strict decode reports a missing decoder as a failure', () => {
  const missing = path.join(os.tmpdir(), `not-an-ffmpeg-executable-${process.pid}`);
  assert.throws(() => verifyAudioStream('example.wav', missing), /could not run/);
});
