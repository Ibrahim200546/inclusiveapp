const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(workspaceRoot, 'tools', 'ru_voiceover_manifest.json');
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

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
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

const output = `(() => {
  const RU_VOICEOVER_AUDIO = Object.freeze(${JSON.stringify(sortedMap, null, 2)});

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

    return RU_VOICEOVER_AUDIO[normalized] || '';
  }

  window.ruVoiceoverAudio = RU_VOICEOVER_AUDIO;
  window.normalizeRuVoiceoverText = normalizeRuVoiceoverText;
  window.getRuVoiceoverAudioPath = getRuVoiceoverAudioPath;
})();
`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Wrote ${Object.keys(sortedMap).length} Russian voiceover entries to ${path.relative(workspaceRoot, outputPath)}`);
