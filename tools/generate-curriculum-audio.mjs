import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const manifestPath = 'public/original/sounds/curriculum/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const endpoint = process.env.COREX_TTS_ENDPOINT || 'https://edu-corex.kz/api/tts';
if (!/^https:\/\/edu-corex\.kz\/api\/tts$|^http:\/\/127\.0\.0\.1:\d+\/api\/tts$/.test(endpoint)) throw new Error('Unexpected TTS endpoint');
let next = 0, completed = 0;
const failures = [];
async function synthesize(item, target) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: item.text, lang: item.lang, voice: item.voice, speed: item.speed, provider: 'yandex' }), signal: AbortSignal.timeout(60_000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error('TTS status ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000) throw new Error('Empty audio'); fs.writeFileSync(target, bytes);
}
async function synthesizeLong(item, target) {
  const sentences = item.text.split(/(?<=[.!?])\s+/u), chunks = [];
  for (const sentence of sentences) {
    if (chunks.length && chunks.at(-1).length + sentence.length < 150) chunks[chunks.length - 1] += ' ' + sentence;
    else chunks.push(sentence);
  }
  const directory = path.resolve('test-results-final/audio-parts', item.id); fs.mkdirSync(directory, { recursive: true });
  const parts = [];
  for (const [index, text] of chunks.entries()) {
    const file = path.join(directory, index + '.mp3');
    if (!fs.existsSync(file)) await synthesize({ ...item, text }, file);
    parts.push(file); await new Promise(resolve => setTimeout(resolve, 300));
  }
  const list = path.join(directory, 'concat.txt');
  fs.writeFileSync(list, parts.map(file => "file '" + file.replaceAll('\\', '/') + "'").join('\n'));
  const encoded = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '64k', target], { windowsHide: true, encoding: 'utf8' });
  if (encoded.status !== 0) throw new Error('Cannot assemble narration: ' + encoded.stderr?.slice(0, 200));
  item.assembly = 'Sentence chunks joined into one MP3'; item.segmentTexts = chunks;
}
async function worker() {
  while (next < manifest.length) {
    const item = manifest[next++];
    const target = path.join('public/original', item.file);
    if (fs.existsSync(target) && fs.statSync(target).size > 1000) {
      item.bytes = fs.statSync(target).size;
      item.sha256 = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
      completed++; continue;
    }
    let success = false;
    for (let attempt = 0; attempt < 3 && !success; attempt++) {
      try {
        if (item.text.length > 250) await synthesizeLong(item, target);
        else await synthesize(item, target);
        const bytes = fs.readFileSync(target); item.bytes = bytes.length; item.sha256 = crypto.createHash('sha256').update(bytes).digest('hex'); success = true; completed++;
      } catch (error) {
        if (attempt === 2) failures.push({ id: item.id, error: String(error.message) });
        else await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
      }
    }
    if (completed % 20 === 0) console.log(`${completed}/${manifest.length} clips ready`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}
await Promise.all([worker(), worker()]);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ completed, total: manifest.length, failures }));
if (failures.length) process.exitCode = 1;
