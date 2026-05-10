const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(workspaceRoot, 'tools', 'ru_voiceover_manifest.json');
const namedManifestPath = path.join(workspaceRoot, 'tools', 'ru_named_voiceover_manifest.json');
const outputPath = path.join(workspaceRoot, 'public', 'original', 'js', 'ru-voiceover-map.js');

function normalizeForLookup(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFE0E\uFE0F]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getLookupVariants(value) {
  const raw = String(value || '').normalize('NFC').trim();
  const normalized = normalizeForLookup(raw);
  const variants = new Set([raw, normalized]);
  const unquoted = normalized.replace(/[«»]/g, '').trim();

  if (unquoted) {
    variants.add(unquoted);
  }

  return [...variants].filter(Boolean);
}

function readManifestItems(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const manifest = [
  ...readManifestItems(manifestPath),
  ...readManifestItems(namedManifestPath),
];
const audioMap = {};

for (const item of manifest) {
  const target = String(item.target || '')
    .replace(/\\/g, '/')
    .replace(/\.wav$/i, '.mp3');
  const audioUrl = encodeURI(`sounds/ru/${target}`);

  for (const variant of getLookupVariants(item.text)) {
    audioMap[variant] = audioUrl;
  }
}

const sortedMap = Object.fromEntries(
  Object.entries(audioMap).sort((left, right) => left[0].localeCompare(right[0], 'ru')),
);

const normalizedMap = {};
for (const [text, audioUrl] of Object.entries(sortedMap)) {
  const lookupKey = normalizeForLookup(text).toLocaleLowerCase('ru-RU');
  if (lookupKey && !normalizedMap[lookupKey]) {
    normalizedMap[lookupKey] = audioUrl;
  }
}

const sortedNormalizedMap = Object.fromEntries(
  Object.entries(normalizedMap).sort((left, right) => left[0].localeCompare(right[0], 'ru')),
);

const fallbackEntries = Object.entries(sortedNormalizedMap)
  .filter(([text]) => text.length >= 5)
  .sort((left, right) => right[0].length - left[0].length);

const output = `(() => {
  const RU_VOICEOVER_AUDIO = Object.freeze(${JSON.stringify(sortedMap, null, 2)});
  const RU_VOICEOVER_AUDIO_NORMALIZED = Object.freeze(${JSON.stringify(sortedNormalizedMap, null, 2)});
  const RU_VOICEOVER_FALLBACKS = Object.freeze(${JSON.stringify(fallbackEntries, null, 2)});

  function normalizeRuVoiceoverText(value) {
    return String(value || '')
      .normalize('NFC')
      .replace(/[\\u200B-\\u200D\\uFE0E\\uFE0F]/g, '')
      .replace(/[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/gu, ' ')
      .replace(/[•·]/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  function isRussianSpeechLang(lang) {
    const speechLang = String(lang || '').toLowerCase();
    if (speechLang.startsWith('ru')) return true;

    try {
      if (window.getProfileLang && window.getProfileLang() === 'ru') return true;
      const savedLang = localStorage.getItem('profileLang') || localStorage.getItem('locale');
      return savedLang === 'ru';
    } catch (error) {
      return false;
    }
  }

  function getRuVoiceoverAudioPath(text, lang) {
    if (!isRussianSpeechLang(lang)) return '';

    const normalized = normalizeRuVoiceoverText(text);
    if (!normalized) return '';

    if (RU_VOICEOVER_AUDIO[normalized]) {
      return RU_VOICEOVER_AUDIO[normalized];
    }

    const lookupKey = normalized.toLocaleLowerCase('ru-RU');
    if (RU_VOICEOVER_AUDIO_NORMALIZED[lookupKey]) {
      return RU_VOICEOVER_AUDIO_NORMALIZED[lookupKey];
    }

    for (const [fallbackText, fallbackAudio] of RU_VOICEOVER_FALLBACKS) {
      if (lookupKey.includes(fallbackText) || fallbackText.includes(lookupKey)) {
        return fallbackAudio;
      }
    }

    return '';
  }

  window.ruVoiceoverAudio = RU_VOICEOVER_AUDIO;
  window.ruVoiceoverAudioNormalized = RU_VOICEOVER_AUDIO_NORMALIZED;
  window.normalizeRuVoiceoverText = normalizeRuVoiceoverText;
  window.getRuVoiceoverAudioPath = getRuVoiceoverAudioPath;
})();
`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Wrote ${Object.keys(sortedMap).length} Russian voiceover entries to ${path.relative(workspaceRoot, outputPath)}`);
