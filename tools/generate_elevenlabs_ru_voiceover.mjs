#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_VOICE_NAME = /Rina\s*-\s*Soft\s*,\s*Clear\s+and\s+Comforting/i;
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128';
const DEFAULT_ROOTS = [
  path.join('public', 'original', 'sounds', 'ru'),
  path.join('public', 'sounds', 'ru'),
];

function parseArgs(argv) {
  const args = {
    manifest: path.join('tools', 'ru_voiceover_manifest.json'),
    prompt: path.join('tools', 'elevenlabs_ru_alippe_prompt.txt'),
    modelId: DEFAULT_MODEL_ID,
    outputFormat: DEFAULT_OUTPUT_FORMAT,
    voiceId: process.env.ELEVENLABS_VOICE_ID || '',
    force: false,
    dryRun: false,
    kinds: new Set(),
    limit: Number.POSITIVE_INFINITY,
    offset: 0,
    pauseMs: 450,
    roots: [...DEFAULT_ROOTS],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];

    if (arg === '--manifest') args.manifest = next();
    else if (arg === '--prompt') args.prompt = next();
    else if (arg === '--voice-id') args.voiceId = next();
    else if (arg === '--model-id') args.modelId = next();
    else if (arg === '--output-format') args.outputFormat = next();
    else if (arg === '--limit') args.limit = Number(next());
    else if (arg === '--offset') args.offset = Number(next());
    else if (arg === '--pause-ms') args.pauseMs = Number(next());
    else if (arg === '--kind') args.kinds.add(next());
    else if (arg === '--root') args.roots.push(next());
    else if (arg === '--force') args.force = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(args.offset) || args.offset < 0) {
    throw new Error('--offset must be a non-negative number.');
  }
  if (!Number.isFinite(args.limit) || args.limit < 1) {
    throw new Error('--limit must be a positive number.');
  }
  if (!Number.isFinite(args.pauseMs) || args.pauseMs < 0) {
    throw new Error('--pause-ms must be a non-negative number.');
  }

  return args;
}

function printHelp() {
  console.log(`
Generate Russian voiceover files with ElevenLabs.

Required environment:
  ELEVENLABS_API_KEY

Examples:
  node tools/generate_elevenlabs_ru_voiceover.mjs --dry-run
  node tools/generate_elevenlabs_ru_voiceover.mjs --kind ui --limit 50
  node tools/generate_elevenlabs_ru_voiceover.mjs --force --kind alippe-word
`);
}

function withoutWavExtension(target) {
  return target.replace(/\.wav$/i, '.mp3');
}

function cleanSpeechText(text) {
  return String(text || '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFE0E\uFE0F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeWord(text) {
  return cleanSpeechText(text).toLocaleLowerCase('ru-RU');
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function loadAlippePhraseMap(promptPath) {
  if (!existsSync(promptPath)) return new Map();

  const lines = (await readFile(promptPath, 'utf8'))
    .split(/\r?\n/)
    .map((line) => cleanSpeechText(line))
    .filter(Boolean);

  const map = new Map();
  for (const line of lines) {
    const [letter, ...wordParts] = line.split(' ');
    const word = cleanSpeechText(wordParts.join(' '));
    if (!letter || !word) continue;
    map.set(normalizeWord(word), `${letter}. ${word}.`);
  }

  return map;
}

function speechTextForItem(item, phraseMap) {
  const text = cleanSpeechText(item.text);
  if (item.kind === 'alippe-word') {
    return phraseMap.get(normalizeWord(text)) || `${text.slice(0, 1)}. ${text}.`;
  }
  if (item.kind === 'letter') {
    return `${text}.`;
  }
  return text;
}

function relativeOutputPath(item) {
  return withoutWavExtension(item.target).replaceAll('\\', '/');
}

async function fileExists(filePath) {
  try {
    const result = await stat(filePath);
    return result.isFile() && result.size > 0;
  } catch {
    return false;
  }
}

async function firstMissingRoot(roots, relativePath) {
  for (const root of roots) {
    if (!(await fileExists(path.join(root, relativePath)))) {
      return root;
    }
  }
  return null;
}

async function selectItems(manifest, args, phraseMap) {
  const result = [];

  for (const item of manifest) {
    if (args.kinds.size && !args.kinds.has(item.kind)) continue;

    const relativePath = relativeOutputPath(item);
    const missingRoot = await firstMissingRoot(args.roots, relativePath);
    if (!args.force && !missingRoot) continue;

    result.push({
      ...item,
      relativePath,
      speechText: speechTextForItem(item, phraseMap),
    });
  }

  return result.slice(args.offset, args.offset + args.limit);
}

async function elevenLabsRequest(url, options) {
  const response = await fetch(url, options);
  if (response.ok) return response;

  const body = await response.text().catch(() => '');
  const message = body ? `${response.status} ${response.statusText}: ${body}` : `${response.status} ${response.statusText}`;
  const error = new Error(message);
  error.status = response.status;
  error.body = body;
  throw error;
}

async function resolveVoiceId(apiKey, explicitVoiceId) {
  if (explicitVoiceId) return explicitVoiceId;

  const response = await elevenLabsRequest('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  });
  const payload = await response.json();
  const voices = payload.voices || [];
  const rina = voices.find((voice) => DEFAULT_VOICE_NAME.test(voice.name || ''))
    || voices.find((voice) => /rina/i.test(voice.name || ''));

  if (!rina?.voice_id) {
    const names = voices.map((voice) => voice.name).filter(Boolean).join(', ');
    throw new Error(`Cannot find ElevenLabs voice "Rina". Available voices: ${names}`);
  }

  return rina.voice_id;
}

async function generateAudio(apiKey, voiceId, args, text) {
  const endpoint = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  endpoint.searchParams.set('output_format', args.outputFormat);

  const response = await elevenLabsRequest(endpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: args.modelId,
      voice_settings: {
        stability: 0.34,
        similarity_boost: 0.58,
        style: 0,
        use_speaker_boost: true,
        speed: 0.81,
      },
    }),
  });

  return Buffer.from(await response.arrayBuffer());
}

async function writeToRoots(roots, relativePath, audio) {
  for (const root of roots) {
    const outputPath = path.join(root, relativePath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, audio);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey && !args.dryRun) {
    throw new Error('ELEVENLABS_API_KEY is required.');
  }

  const manifest = await loadJson(args.manifest);
  const phraseMap = await loadAlippePhraseMap(args.prompt);
  const selected = await selectItems(manifest, args, phraseMap);

  console.log(`Selected ${selected.length} item(s).`);
  if (selected.length === 0) return;

  if (args.dryRun) {
    for (const item of selected) {
      console.log(`[dry-run] ${item.kind} -> ${item.relativePath}: ${item.speechText}`);
    }
    return;
  }

  const voiceId = await resolveVoiceId(apiKey, args.voiceId);
  console.log(`Using ElevenLabs voice: ${voiceId}`);

  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const ordinal = `${index + 1}/${selected.length}`;
    console.log(`[${ordinal}] ${item.kind} ${item.relativePath} <= ${item.speechText}`);

    let audio = null;
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        audio = await generateAudio(apiKey, voiceId, args, item.speechText);
        break;
      } catch (error) {
        lastError = error;
        if (error.status === 401 || error.status === 402 || /quota_exceeded|payment_required/i.test(error.message)) {
          throw error;
        }
        const waitMs = 1200 * attempt;
        console.warn(`  attempt ${attempt} failed: ${error.message}`);
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    if (!audio) {
      throw lastError || new Error(`Failed to generate ${item.relativePath}`);
    }

    await writeToRoots(args.roots, item.relativePath, audio);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
