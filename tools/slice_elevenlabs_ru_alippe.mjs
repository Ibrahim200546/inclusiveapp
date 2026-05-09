#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(SCRIPT_DIR, "..");

function parseArgs(argv) {
  const args = {
    source: "",
    manifest: join(APP_ROOT, "tools", "ru_voiceover_manifest.json"),
    outputRoot: join(APP_ROOT, "public", "original", "sounds", "ru"),
    mirrorRoot: join(APP_ROOT, "public", "sounds", "ru"),
    tempDir: join(APP_ROOT, ".voice-cache", "elevenlabs-slices"),
    planOut: join(APP_ROOT, "tools", "elevenlabs_ru_alippe_plan.json"),
    mode: "pair",
    limit: 50,
    offset: 0,
    noise: "-40dB",
    minSilence: 0.25,
    minSegment: 0.12,
    pauseMs: 450,
    force: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
      index += 1;
      return value;
    };

    if (name === "--source") args.source = resolve(readValue());
    else if (name === "--manifest") args.manifest = resolve(readValue());
    else if (name === "--output-root") args.outputRoot = resolve(readValue());
    else if (name === "--mirror-root") args.mirrorRoot = resolve(readValue());
    else if (name === "--temp-dir") args.tempDir = resolve(readValue());
    else if (name === "--plan-out") args.planOut = resolve(readValue());
    else if (name === "--mode") args.mode = readValue();
    else if (name === "--limit") args.limit = Number.parseInt(readValue(), 10);
    else if (name === "--offset") args.offset = Number.parseInt(readValue(), 10);
    else if (name === "--noise") args.noise = readValue();
    else if (name === "--min-silence") args.minSilence = Number.parseFloat(readValue());
    else if (name === "--min-segment") args.minSegment = Number.parseFloat(readValue());
    else if (name === "--pause-ms") args.pauseMs = Number.parseInt(readValue(), 10);
    else if (name === "--force") args.force = true;
    else if (name === "--dry-run") args.dryRun = true;
    else if (name === "--no-mirror") args.mirrorRoot = "";
    else if (name === "--help" || name === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${name}`);
    }
  }

  if (!["pair", "phrase"].includes(args.mode)) throw new Error("--mode must be pair or phrase");
  if (!Number.isFinite(args.limit) || args.limit < 0) args.limit = 0;
  if (!Number.isFinite(args.offset) || args.offset < 0) args.offset = 0;
  if (!args.source) args.source = findDefaultSource();
  return args;
}

function printHelp() {
  console.log(`
Slice one ElevenLabs MP3 into Russian Alippe audio assets.

Default mode is "pair": each target word consumes two detected chunks from source:
  chunk 1 = letter, chunk 2 = word, then script joins them with a fixed pause.

Usage:
  node tools/slice_elevenlabs_ru_alippe.mjs --limit 50 --force

Options:
  --source <mp3>          ElevenLabs source MP3. Default: first .voice-cache/ElevenLabs_*.mp3
  --mode <pair|phrase>    pair joins letter+word chunks; phrase consumes one chunk per word. Default: pair
  --limit <n>             Number of word assets to create. Default: 50
  --offset <n>            Skip detected chunks before mapping. Default: 0
  --pause-ms <n>          Pause inserted between letter and word in pair mode. Default: 450
  --min-silence <sec>     Silence duration used for chunk detection. Default: 0.25
  --noise <dB>            Silence threshold. Default: -40dB
  --dry-run               Write only the plan; do not create audio
  --force                 Overwrite existing files
`);
}

function findDefaultSource() {
  const cacheDir = join(APP_ROOT, ".voice-cache");
  const file = readdirSync(cacheDir)
    .filter((name) => /^ElevenLabs_.*\.mp3$/i.test(name))
    .sort((left, right) => {
      const leftTime = statSync(join(cacheDir, left)).mtimeMs;
      const rightTime = statSync(join(cacheDir, right)).mtimeMs;
      return rightTime - leftTime;
    })[0];
  if (!file) throw new Error(`No ElevenLabs_*.mp3 file found in ${cacheDir}`);
  return join(cacheDir, file);
}

function ffmpegPath() {
  const local = join(APP_ROOT, "node_modules", "ffmpeg-static", "ffmpeg.exe");
  return existsSync(local) ? local : "ffmpeg";
}

function runFfmpeg(args, options = {}) {
  const result = spawnSync(ffmpegPath(), args, {
    cwd: APP_ROOT,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function getDuration(source) {
  const result = spawnSync(ffmpegPath(), ["-hide_banner", "-i", source], {
    cwd: APP_ROOT,
    encoding: "utf8",
  });
  const text = `${result.stdout}\n${result.stderr}`;
  const match = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`Cannot read duration for ${source}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function detectSegments(source, args) {
  const result = runFfmpeg([
    "-hide_banner",
    "-i",
    source,
    "-af",
    `silencedetect=noise=${args.noise}:d=${args.minSilence}`,
    "-f",
    "null",
    "NUL",
  ], { stdio: "pipe" });

  const text = `${result.stdout}\n${result.stderr}`;
  const events = [];
  for (const line of text.split(/\r?\n/)) {
    let match = line.match(/silence_start:\s*([0-9.]+)/);
    if (match) events.push({ type: "start", at: Number(match[1]) });
    match = line.match(/silence_end:\s*([0-9.]+)/);
    if (match) events.push({ type: "end", at: Number(match[1]) });
  }

  const duration = getDuration(source);
  const segments = [];
  let start = 0;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event.type !== "start") continue;
    const end = event.at;
    if (end - start >= args.minSegment) {
      segments.push({ start, end, duration: end - start });
    }
    const next = events[index + 1];
    if (next?.type === "end") start = next.at;
  }
  if (duration - start >= args.minSegment) {
    segments.push({ start, end: duration, duration: duration - start });
  }
  return segments;
}

function buildWordTasks(manifestPath, limit) {
  const items = JSON.parse(readFileSync(manifestPath, "utf8"));
  const tasks = [];
  let letter = "";
  let letterTarget = "";
  const seenLetterTarget = new Set();

  for (const item of items) {
    if (item.kind === "letter" && item.target.startsWith("Alippe/Alippe_")) {
      letter = item.text;
      letterTarget = item.target.replace(/\.wav$/i, ".mp3");
      continue;
    }
    if (item.kind !== "alippe-word" || !letter) continue;
    const target = item.target.replace(/\.wav$/i, ".mp3");
    const shouldCopyToLetter = letterTarget && !seenLetterTarget.has(letterTarget);
    tasks.push({
      letter,
      word: item.text,
      phrase: `${letter} ${item.text}`,
      target,
      letterTarget: shouldCopyToLetter ? letterTarget : "",
      letterOnlyTarget: shouldCopyToLetter ? `letters/letter_${letter.toLocaleLowerCase("ru-RU")}.mp3` : "",
    });
    if (shouldCopyToLetter) seenLetterTarget.add(letterTarget);
    if (tasks.length >= limit) break;
  }
  return tasks;
}

function createSilence(target, pauseMs) {
  mkdirSync(dirname(target), { recursive: true });
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=44100:cl=mono",
    "-t",
    (Math.max(0, pauseMs) / 1000).toFixed(3),
    target,
  ]);
}

function cutToWav(source, segment, target) {
  mkdirSync(dirname(target), { recursive: true });
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    Math.max(0, segment.start).toFixed(3),
    "-to",
    Math.max(segment.start, segment.end).toFixed(3),
    "-i",
    source,
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-ar",
    "44100",
    "-ac",
    "1",
    target,
  ]);
}

function concatToMp3(files, target, force) {
  if (existsSync(target) && !force) return false;
  mkdirSync(dirname(target), { recursive: true });
  const listPath = join(dirname(target), ".concat-list.txt");
  writeFileSync(listPath, files.map((file) => `file '${file.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`).join("\n"), "utf8");
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.08",
    "-ar",
    "44100",
    "-ac",
    "1",
    "-b:a",
    "160k",
    target,
  ]);
  return true;
}

function encodeWavToMp3(source, target, force) {
  if (existsSync(target) && !force) return false;
  mkdirSync(dirname(target), { recursive: true });
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    source,
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.08",
    "-ar",
    "44100",
    "-ac",
    "1",
    "-b:a",
    "160k",
    target,
  ]);
  return true;
}

function cutPhraseToMp3(source, segment, target, force) {
  if (existsSync(target) && !force) return false;
  mkdirSync(dirname(target), { recursive: true });
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    Math.max(0, segment.start).toFixed(3),
    "-to",
    Math.max(segment.start, segment.end).toFixed(3),
    "-i",
    source,
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.08",
    "-ar",
    "44100",
    "-ac",
    "1",
    "-b:a",
    "160k",
    target,
  ]);
  return true;
}

function mirror(outputTarget, args) {
  if (!args.mirrorRoot) return;
  const relative = outputTarget.slice(args.outputRoot.length).replace(/^[/\\]/, "");
  const mirrorTarget = join(args.mirrorRoot, relative);
  mkdirSync(dirname(mirrorTarget), { recursive: true });
  copyFileSync(outputTarget, mirrorTarget);
}

function copyAsset(sourceTarget, relativeTarget, args) {
  if (!relativeTarget) return;
  const target = join(args.outputRoot, relativeTarget);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(sourceTarget, target);
  mirror(target, args);
}

function writeLetterOnly(sourceWav, relativeTarget, args) {
  if (!relativeTarget) return;
  const target = join(args.outputRoot, relativeTarget);
  encodeWavToMp3(sourceWav, target, args.force);
  mirror(target, args);
}

function writePlan(plan, planOut) {
  mkdirSync(dirname(planOut), { recursive: true });
  writeFileSync(planOut, JSON.stringify(plan, null, 2) + "\n", "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const segments = detectSegments(args.source, args);
  const tasks = buildWordTasks(args.manifest, args.limit);
  const requiredSegments = args.mode === "pair" ? tasks.length * 2 : tasks.length;
  const availableSegments = Math.max(0, segments.length - args.offset);
  if (availableSegments < requiredSegments) {
    throw new Error(`Not enough detected segments: need ${requiredSegments}, available ${availableSegments}`);
  }

  mkdirSync(args.outputRoot, { recursive: true });
  if (args.mirrorRoot) mkdirSync(args.mirrorRoot, { recursive: true });
  mkdirSync(args.tempDir, { recursive: true });
  const pauseFile = join(args.tempDir, `pause_${args.pauseMs}ms.wav`);
  if (!args.dryRun) createSilence(pauseFile, args.pauseMs);

  const plan = {
    source: args.source,
    mode: args.mode,
    offset: args.offset,
    noise: args.noise,
    minSilence: args.minSilence,
    pauseMs: args.pauseMs,
    detectedSegments: segments.length,
    created: [],
  };

  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    const target = join(args.outputRoot, task.target);
    let usedSegments = [];

    if (args.mode === "pair") {
      const letterSegment = segments[args.offset + index * 2];
      const wordSegment = segments[args.offset + index * 2 + 1];
      usedSegments = [letterSegment, wordSegment];
      if (!args.dryRun) {
        const letterWav = join(args.tempDir, `task_${String(index + 1).padStart(3, "0")}_letter.wav`);
        const wordWav = join(args.tempDir, `task_${String(index + 1).padStart(3, "0")}_word.wav`);
        cutToWav(args.source, letterSegment, letterWav);
        cutToWav(args.source, wordSegment, wordWav);
        concatToMp3([letterWav, pauseFile, wordWav], target, args.force);
        mirror(target, args);
        copyAsset(target, task.letterTarget, args);
        writeLetterOnly(letterWav, task.letterOnlyTarget, args);
      }
    } else {
      const segment = segments[args.offset + index];
      usedSegments = [segment];
      if (!args.dryRun) {
        cutPhraseToMp3(args.source, segment, target, args.force);
        mirror(target, args);
        copyAsset(target, task.letterTarget, args);
      }
    }

    plan.created.push({
      index: index + 1,
      phrase: task.phrase,
      target: task.target,
      letterTarget: task.letterTarget,
      letterOnlyTarget: task.letterOnlyTarget,
      segments: usedSegments,
    });
    console.log(`${args.dryRun ? "plan" : "write"} ${index + 1}/${tasks.length}: ${task.phrase} -> ${task.target}`);
  }

  writePlan(plan, args.planOut);
  console.log(`Plan: ${args.planOut}`);
  console.log(`Detected segments: ${segments.length}`);
}

main();
