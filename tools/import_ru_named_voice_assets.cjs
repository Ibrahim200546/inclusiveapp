const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(workspaceRoot, 'tools', 'ru_voiceover_manifest.json');
const namedManifestPath = path.join(workspaceRoot, 'tools', 'ru_named_voiceover_manifest.json');
const manifestVoiceDir = path.join(workspaceRoot, '.voice-cache', 'manifest voices');
const regeneratedVoiceDir = path.join(workspaceRoot, '.voice-cache', 'regenerated voices');
const outputRoots = [
  path.join(workspaceRoot, 'public', 'original', 'sounds', 'ru'),
  path.join(workspaceRoot, 'public', 'sounds', 'ru'),
];

const sourceAliases = new Map([
  ['каш', 'кашель'],
  ['напрвления звука', 'направление звука'],
  ['не услышан', 'звук не услышан'],
  ['орьентация в пространстве', 'ориентация в пространстве'],
  ['остонави', 'остановить'],
  ['откуда изходит звук', 'откуда исходит звук'],
  ['откройте рот и округлейте губы', 'откройте рот и округлите губы'],
  ['песнь', 'песни'],
  ['правин', 'правильно'],
  ['прослушивание рассказа', 'прослушивание рассказов'],
  ['разпознование', 'распознавание'],
  ['разпознование звуков', 'распознавание звука'],
  ['разпознование слов', 'распознавание слов'],
]);

const alphabetAliases = new Map([
  ['облоко', 'облако'],
  ['пиянино', 'пианино'],
  ['подьезд', 'подъезд'],
]);

function ffmpegPath() {
  const local = path.join(workspaceRoot, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  return fs.existsSync(local) ? local : 'ffmpeg';
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFC')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSourceText(fileName) {
  return path.basename(fileName, path.extname(fileName))
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function duplicateBaseKey(fileName) {
  const text = cleanSourceText(fileName).replace(/[0-9]+$/g, '').trim();
  return normalizeKey(text);
}

function relativeMp3Target(target) {
  return String(target || '').replace(/\\/g, '/').replace(/\.wav$/i, '.mp3');
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function resetGeneratedNamedDirs() {
  for (const root of outputRoots) {
    const namedDir = path.join(root, 'named');
    const relative = path.relative(workspaceRoot, namedDir);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Refusing to remove generated files outside workspace: ${namedDir}`);
    }

    fs.rmSync(namedDir, { recursive: true, force: true });
  }
}

function runFfmpeg(source, target) {
  const result = spawnSync(ffmpegPath(), [
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
    target,
  ], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${source}:\n${result.stderr || result.stdout || ''}`);
  }
}

function writeAudioToRoots(source, relativeTarget) {
  const firstTarget = path.join(outputRoots[0], relativeTarget);
  ensureParent(firstTarget);

  if (/\.mp3$/i.test(source)) {
    fs.copyFileSync(source, firstTarget);
  } else {
    runFfmpeg(source, firstTarget);
  }

  for (const root of outputRoots.slice(1)) {
    const mirrorTarget = path.join(root, relativeTarget);
    ensureParent(mirrorTarget);
    fs.copyFileSync(firstTarget, mirrorTarget);
  }
}

function getLookupKeys(text) {
  const raw = String(text || '').normalize('NFC').trim();
  const withoutMarks = raw
    .replace(/[\u200B-\u200D\uFE0E\uFE0F]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ');
  return new Set([
    normalizeKey(raw),
    normalizeKey(withoutMarks),
  ]);
}

function pushMapItem(map, key, value) {
  if (!key) return;
  const items = map.get(key) || [];
  items.push(value);
  map.set(key, items);
}

function uniqueTargets(entries) {
  return [...new Set(entries.map(entry => relativeMp3Target(entry.target)))];
}

function namedTargetFor(fileName) {
  const text = cleanSourceText(fileName);
  const hash = crypto.createHash('sha1').update(text).digest('hex').slice(0, 12);
  return `named/${hash}.mp3`;
}

function isDuplicateSource(fileName, sourceByBaseKey) {
  const sourceText = cleanSourceText(fileName);
  if (!/[0-9]+$/.test(sourceText)) return false;

  const baseKey = duplicateBaseKey(fileName);
  const siblings = sourceByBaseKey.get(baseKey) || [];
  return siblings.some(sibling => !/[0-9]+$/.test(cleanSourceText(sibling)));
}

function buildRegeneratedWordKey(fileName, alippeWordKeys) {
  const key = normalizeKey(cleanSourceText(fileName));
  let best = '';

  for (const wordKey of alippeWordKeys) {
    if (key.endsWith(wordKey) && wordKey.length > best.length) {
      best = wordKey;
    }
  }

  return best;
}

function importManifestVoices(manifest) {
  if (!fs.existsSync(manifestVoiceDir)) {
    return { replaced: 0, named: 0, skippedAlphabet: 0, skippedDuplicate: 0 };
  }

  const uiByKey = new Map();
  const uiEntries = [];
  const alphabetKeys = new Set();

  for (const entry of manifest) {
    if (entry.kind === 'ui') {
      uiEntries.push({
        entry,
        key: normalizeKey(entry.text),
      });

      for (const key of getLookupKeys(entry.text)) {
        pushMapItem(uiByKey, key, entry);
      }
    }

    if (entry.kind === 'letter' || entry.kind === 'alippe-word') {
      for (const key of getLookupKeys(entry.text)) {
        alphabetKeys.add(key);
        alphabetKeys.add(alphabetAliases.get(key) || key);
      }
    }
  }

  for (const [alias, target] of alphabetAliases) {
    if (alphabetKeys.has(target)) {
      alphabetKeys.add(alias);
    }
  }

  const files = fs.readdirSync(manifestVoiceDir)
    .filter(file => /\.(wav|mp3|mp4)$/i.test(file))
    .sort((left, right) => left.localeCompare(right, 'ru'));

  const sourceByBaseKey = new Map();
  for (const file of files) {
    pushMapItem(sourceByBaseKey, duplicateBaseKey(file), file);
  }

  const namedEntries = [];
  const namedTextKeys = new Set();
  const containsTargetUse = new Map();
  let replaced = 0;
  let named = 0;
  let skippedAlphabet = 0;
  let skippedDuplicate = 0;

  function getContainedUiCandidates(sourceKeyValue) {
    if (!sourceKeyValue || sourceKeyValue.length < 5) {
      return [];
    }

    return uiEntries
      .filter(({ key }) => key.includes(sourceKeyValue) || sourceKeyValue.includes(key))
      .sort((left, right) => {
        const leftDelta = Math.abs(left.key.length - sourceKeyValue.length);
        const rightDelta = Math.abs(right.key.length - sourceKeyValue.length);
        return leftDelta - rightDelta || left.key.localeCompare(right.key, 'ru');
      })
      .map(({ entry }) => entry);
  }

  function getUnusedContainedTargets(sourceKeyValue, candidates) {
    const usedTargets = containsTargetUse.get(sourceKeyValue) || new Set();
    const targets = uniqueTargets(candidates).filter(target => !usedTargets.has(target));
    const selected = targets.length > 0 ? targets : uniqueTargets(candidates);

    if (!containsTargetUse.has(sourceKeyValue)) {
      containsTargetUse.set(sourceKeyValue, usedTargets);
    }

    for (const target of selected) {
      usedTargets.add(target);
    }

    return selected.slice(0, 1);
  }

  for (const file of files) {
    const source = path.join(manifestVoiceDir, file);
    const sourceText = cleanSourceText(file);
    const sourceKey = normalizeKey(sourceText);
    const baseKey = duplicateBaseKey(file);
    const aliasKey = sourceAliases.get(sourceKey) || sourceAliases.get(baseKey);
    const alphabetKey = alphabetAliases.get(baseKey) || baseKey;

    let candidates = [
      ...(uiByKey.get(sourceKey) || []),
      ...(uiByKey.get(baseKey) || []),
      ...(aliasKey ? (uiByKey.get(aliasKey) || []) : []),
    ];

    let targets = uniqueTargets(candidates);

    if (targets.length === 0) {
      const containsKey = aliasKey || baseKey || sourceKey;
      candidates = getContainedUiCandidates(containsKey);
      targets = getUnusedContainedTargets(containsKey, candidates);
    }

    if (targets.length > 0) {
      for (const target of targets) {
        writeAudioToRoots(source, target);
        replaced++;
      }
      continue;
    }

    if (alphabetKeys.has(alphabetKey)) {
      skippedAlphabet++;
      continue;
    }

    if (isDuplicateSource(file, sourceByBaseKey)) {
      skippedDuplicate++;
      continue;
    }

    const namedTextKey = normalizeKey(sourceText);
    if (namedTextKeys.has(namedTextKey)) {
      skippedDuplicate++;
      continue;
    }

    const target = namedTargetFor(file);
    writeAudioToRoots(source, target);
    namedEntries.push({
      text: sourceText,
      target: target.replace(/\.mp3$/i, '.wav'),
      kind: 'named-ui',
    });
    namedTextKeys.add(namedTextKey);
    named++;
  }

  namedEntries.sort((left, right) => left.text.localeCompare(right.text, 'ru'));
  fs.writeFileSync(namedManifestPath, `${JSON.stringify(namedEntries, null, 2)}\n`, 'utf8');

  return { replaced, named, skippedAlphabet, skippedDuplicate };
}

function importRegeneratedAlippeWords(manifest) {
  if (!fs.existsSync(regeneratedVoiceDir)) {
    return { replaced: 0, skipped: 0 };
  }

  const alippeByKey = new Map();
  for (const entry of manifest) {
    if (entry.kind !== 'alippe-word') continue;

    const key = normalizeKey(entry.text);
    alippeByKey.set(key, relativeMp3Target(entry.target));
  }

  const wordKeys = [...alippeByKey.keys()].sort((left, right) => right.length - left.length);
  const files = fs.readdirSync(regeneratedVoiceDir)
    .filter(file => /\.(wav|mp3|mp4)$/i.test(file))
    .sort((left, right) => left.localeCompare(right, 'ru'));

  let replaced = 0;
  let skipped = 0;

  for (const file of files) {
    const wordKey = buildRegeneratedWordKey(file, wordKeys);
    const target = wordKey ? alippeByKey.get(wordKey) : '';

    if (!target) {
      skipped++;
      continue;
    }

    writeAudioToRoots(path.join(regeneratedVoiceDir, file), target);
    replaced++;
  }

  return { replaced, skipped };
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
resetGeneratedNamedDirs();
const technical = importManifestVoices(manifest);
const regenerated = importRegeneratedAlippeWords(manifest);

console.log(`Technical voices: ${technical.replaced} UI targets replaced, ${technical.named} named files added, ${technical.skippedAlphabet} alphabet files skipped, ${technical.skippedDuplicate} duplicates skipped.`);
console.log(`Regenerated Alippe words: ${regenerated.replaced} replaced, ${regenerated.skipped} skipped.`);
