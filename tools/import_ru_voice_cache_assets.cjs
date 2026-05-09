const { spawnSync } = require('node:child_process');
const { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(workspaceRoot, 'tools', 'ru_voiceover_manifest.json');
const manifestVoiceDir = path.join(workspaceRoot, '.voice-cache', 'manifest voices');
const promptVoiceDir = path.join(workspaceRoot, '.voice-cache', 'prompt voices');
const outputRoots = [
  path.join(workspaceRoot, 'public', 'original', 'sounds', 'ru'),
  path.join(workspaceRoot, 'public', 'sounds', 'ru'),
];

function ffmpegPath() {
  const local = path.join(workspaceRoot, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  return existsSync(local) ? local : 'ffmpeg';
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFC')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^а-яъыьэюя]/g, '');
}

function relativeMp3Target(target) {
  return String(target || '').replace(/\\/g, '/').replace(/\.wav$/i, '.mp3');
}

function ensureParent(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function runFfmpeg(args) {
  const result = spawnSync(ffmpegPath(), args, {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed:\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
}

function convertWavToMp3(source, relativeTarget) {
  const firstTarget = path.join(outputRoots[0], relativeTarget);
  ensureParent(firstTarget);
  runFfmpeg([
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    source,
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '160k',
    firstTarget,
  ]);

  for (const root of outputRoots.slice(1)) {
    const mirrorTarget = path.join(root, relativeTarget);
    ensureParent(mirrorTarget);
    copyFileSync(firstTarget, mirrorTarget);
  }
}

function copyMp3ToRoots(source, relativeTarget) {
  for (const root of outputRoots) {
    const target = path.join(root, relativeTarget);
    ensureParent(target);
    copyFileSync(source, target);
  }
}

function wordFromPromptFile(fileName) {
  const stem = fileName.replace(/\.mp3$/i, '').normalize('NFC').trim();
  const parts = stem.split(/\s+/).filter(Boolean);
  if (parts.length > 1 && normalizeKey(parts[0]).length === 1) {
    return parts.slice(1).join(' ');
  }
  return stem;
}

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let manifestConverted = 0;
  let promptCopied = 0;
  const promptMisses = [];

  for (let index = 0; index < manifest.length; index += 1) {
    const source = path.join(manifestVoiceDir, `word_${String(index + 1).padStart(3, '0')}.wav`);
    if (!existsSync(source)) continue;

    convertWavToMp3(source, relativeMp3Target(manifest[index].target));
    manifestConverted += 1;
  }

  const alippeByWord = new Map(
    manifest
      .filter((item) => item.kind === 'alippe-word')
      .map((item) => [normalizeKey(item.text), item]),
  );
  const aliases = new Map([
    ['облоко', 'облако'],
    ['пиянино', 'пианино'],
  ]);

  for (const fileName of readdirSync(promptVoiceDir).filter((name) => /\.mp3$/i.test(name)).sort((a, b) => a.localeCompare(b, 'ru'))) {
    const word = wordFromPromptFile(fileName);
    const key = aliases.get(normalizeKey(word)) || normalizeKey(word);
    const item = alippeByWord.get(key);

    if (!item) {
      promptMisses.push(fileName);
      continue;
    }

    copyMp3ToRoots(path.join(promptVoiceDir, fileName), relativeMp3Target(item.target));
    promptCopied += 1;
  }

  console.log(`Converted manifest voices: ${manifestConverted}`);
  console.log(`Copied prompt voices: ${promptCopied}`);
  if (promptMisses.length) {
    console.log(`Prompt files without manifest target: ${promptMisses.join(', ')}`);
    process.exitCode = 1;
  }
}

main();
