const fs = require('fs');
const path = require('path');

const workspace = path.resolve(__dirname, '..');
const promptDir = path.join(workspace, '.voice-cache', 'prompt voices');
const manifestPath = path.join(__dirname, 'ru_voiceover_manifest.json');
const outputRoots = [
  path.join(workspace, 'public', 'original', 'sounds', 'ru'),
  path.join(workspace, 'public', 'sounds', 'ru'),
];

const filenameAliases = new Map([
  ['облоко', 'облако'],
  ['пиянино', 'пианино'],
]);

function normalizeWord(value) {
  return String(value)
    .normalize('NFC')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^а-я]/g, '');
}

function wordFromPromptFilename(filename) {
  const base = path.basename(filename, path.extname(filename)).trim();
  const parts = base.split(/\s+/);

  if (parts.length > 1 && /^[а-яё]$/i.test(parts[0])) {
    return parts.slice(1).join(' ');
  }

  return base;
}

function buildAlippeWordTargets() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const targets = new Map();

  for (const entry of manifest) {
    if (entry.kind !== 'alippe-word') continue;

    const key = normalizeWord(entry.text);
    const target = entry.target.replace(/\.wav$/i, '.mp3');
    targets.set(key, target);
  }

  return targets;
}

function copyPromptVoices() {
  if (!fs.existsSync(promptDir)) {
    throw new Error(`Prompt voice folder not found: ${promptDir}`);
  }

  const alippeWordTargets = buildAlippeWordTargets();
  const files = fs.readdirSync(promptDir).filter(file => /\.mp3$/i.test(file));
  const unmatched = [];
  let copied = 0;

  for (const file of files) {
    const promptWord = wordFromPromptFilename(file);
    const normalizedPromptWord = normalizeWord(promptWord);
    const key = filenameAliases.get(normalizedPromptWord) || normalizedPromptWord;
    const target = alippeWordTargets.get(key);

    if (!target) {
      unmatched.push(file);
      continue;
    }

    const source = path.join(promptDir, file);

    for (const outputRoot of outputRoots) {
      const destination = path.join(outputRoot, target);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
      copied++;
    }
  }

  if (unmatched.length > 0) {
    throw new Error(`No Alippe word target for prompt files: ${unmatched.join(', ')}`);
  }

  console.log(`Copied ${files.length} prompt voice files into ${outputRoots.length} site roots (${copied} files).`);
}

copyPromptVoices();
