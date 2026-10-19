import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(fs.readFileSync('public/original/sounds/curriculum/manifest.json', 'utf8'));
const results = [], errors = [];
for (const item of manifest) {
  const file = 'public/original/' + item.file;
  const decoded = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-f', 'null', '-'], { encoding: 'utf8', windowsHide: true });
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=sample_rate,channels', '-of', 'json', file], { encoding: 'utf8', windowsHide: true });
  if (decoded.status !== 0 || probe.status !== 0) { errors.push({ file, error: decoded.stderr || probe.stderr }); continue; }
  const metadata = JSON.parse(probe.stdout);
  results.push({ file: item.file, seconds: Number(metadata.format.duration), channels: metadata.streams[0].channels, sampleRate: Number(metadata.streams[0].sample_rate), bytes: fs.statSync(file).size, fullDecode: true });
}
fs.writeFileSync('docs/trello-verification/curriculum-audio-verification.json', JSON.stringify({ clips: results.length, failed: errors, scope: 'Full MP3 decoding and duration metadata; pronunciation/intonation quality is not inferred from decoding', results }, null, 2) + '\n');
console.log(JSON.stringify({ decoded: results.length, errors: errors.length, longestSeconds: Math.max(...results.map(r => r.seconds)), bytes: results.reduce((sum, r) => sum + r.bytes, 0) }));
if (errors.length) process.exitCode = 1;
