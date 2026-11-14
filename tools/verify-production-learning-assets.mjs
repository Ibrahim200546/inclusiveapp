import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const manifests = ['sounds/find-number/manifest.json', 'sounds/syllable-reading/manifest.json', 'sounds/curriculum/manifest.json'];
const lessonAudio = ['q-wolf-kk', 'q-rabbit-kk', 'q-tortoise-kk', ...['kk', 'ru'].flatMap(locale => ['arrived', 'cold', 'leaves'].map(key => `autumn-${key}-${locale}`))]
  .map(name => 'sounds/articulation-lessons/' + name + '.mp3');
const vowelAudio = [...['А ', 'У', 'О'].map(name => `sounds/letter-line/${name}.mp3`),
  ...['ауауа', 'уауауау', 'аоаоаоа', 'уоуоуоуо', 'аоуоа', 'уоаоу'].map(name => `sounds/kk-human/${name}.mp4`)];
const voiceAudio = [['loud', 'дауыстап'], ['normal', 'жай'], ['whisper', 'сыбырлап']]
  .flatMap(([folder, suffix]) => ['Топ-топ', 'Мяу-мяу', 'Бак-бак', 'Аф-аф'].map(sound => `sounds/${folder}/${sound} ${suffix}.mp4`));
const voicePictures = ['loud', 'normal', 'whisper'].flatMap(mode => ['bear', 'cat', 'frog', 'dog'].map(animal => `assets/voice-animals/${animal}-${mode}.png`));
const trainAudio = [...['а', 'ә', 'о', 'ө', 'ұ', 'ү', 'ы', 'і', 'п', 'б', 'т', 'к', 'у'].flatMap(letter => [`sounds/Alippe/Alippe_${letter}.mp3`, `sounds/letters/letter_${letter}.mp3`]),
  ...['а', 'о', 'ы', 'п', 'б', 'т', 'к', 'у'].map(letter => `sounds/ru/Alippe/Alippe_${letter}.mp3`)];
const audio = [...manifests.flatMap(manifest => JSON.parse(fs.readFileSync('public/original/' + manifest, 'utf8'))
  .map(item => item.file.includes('/') ? item.file : path.posix.join(path.posix.dirname(manifest), item.file))), ...lessonAudio, ...vowelAudio, ...voiceAudio, ...trainAudio];
const files = [...new Set([...audio, ...voicePictures, ...manifests, 'tasks/povtori_ritm.html', 'tasks/bir_tinispen_oku.html', 'js/phoneme-worker.js', 'js/phoneme-shared-worker.js', 'i18n-profile.js', 'js/curriculum-content.js', 'js/exercise-orbit-ui.js', 'learning-work.css', 'curriculum.css', 'exercise-orbit.css', 'exercise-surfaces.css'])];
for (const file of files) {
  const hash = prefix => crypto.createHash('sha256').update(fs.readFileSync(prefix + file)).digest('hex');
  if (hash('public/original/') !== hash('dist/original/')) throw new Error('Outdated production asset: ' + file);
}
// The HTML is now a Vite entry, so it is transformed rather than copied.
const entry = fs.readFileSync('dist/original/index2.html', 'utf8');
const breathLink = fs.readFileSync('dist/original/tasks/bir_tinispen_oku.html', 'utf8');
if (!entry.includes('data-one-breath-root') || /openEmbeddedTask|closeEmbeddedTask|embed-fullscreen/.test(entry)
  || !breathLink.includes('../index2.html?exercise=one-breath') || /<script|renderPyr|renderChips/.test(breathLink)) {
  throw new Error('One-breath reading must use React, with only a compatibility link at its old URL');
}
const rhythmLink = fs.readFileSync('dist/original/tasks/povtori_ritm.html', 'utf8');
if (!entry.includes('data-repeat-rhythm-root') || /closeEmbeddedTask\('g0TaskRepeatRhythm'/.test(entry)
  || !rhythmLink.includes('../index2.html?exercise=repeat-rhythm') || /<script|function make\(|function tap\(/.test(rhythmLink)) {
  throw new Error('Repeat rhythm must use the React entry, with only a compatibility link at its old URL');
}
if (!entry.includes('data-frog-root') || /handleFrogAction|resetFrogGame|closeFrogGame/.test(entry)
  || /frogWordsData|function initFrogGame|function jumpToElement/.test(fs.readFileSync('dist/original/script.js', 'utf8'))) {
  throw new Error('Frog reading must be owned by the compiled React entry');
}
if (/var jatChains|function jatPlayAll|function dshakTapStart|function dshakTapRender/.test(entry)) throw new Error('Obsolete inline vowel exercises remain in production');
if (/var dvCards|function dvPlayCard|function dvRenderAll|dauyspen-cards/.test(entry)) throw new Error('Obsolete inline voice mode exercises remain in production');
const practiceBundle = entry.match(/src="(\/assets\/practice-[^"]+\.js)"/);
if (!entry.includes('data-practice-root') || !practiceBundle || entry.includes('/src/features/practice/main.tsx')) {
  throw new Error('Missing compiled React practice entry');
}
if (!fs.existsSync(path.join('dist', practiceBundle[1].slice(1)))) throw new Error('Missing React practice bundle');
const modelBundle = entry.match(/href="(\/assets\/modelRuntime-[^"]+\.js)"/);
const landingEntry = fs.readFileSync('dist/index.html', 'utf8');
if (!modelBundle || !landingEntry.includes(modelBundle[1]) || !fs.existsSync(path.join('dist', modelBundle[1].slice(1)))) {
  throw new Error('Landing and practice must use the compiled shared model runtime');
}
if (/\/original\/(?:js\/train-|train-model-preload\.css)/.test(landingEntry)) throw new Error('Obsolete model preparation remains on the landing page');
if (entry.includes('/original/articulation-circles.js') || fs.existsSync('dist/original/articulation-circles.js')) {
  throw new Error('Obsolete articulation map remains in the production build');
}
for (const stylesheet of ['articulation-module.css', 'articulation-lessons.css', 'voice-presence.css', 'train-model-preload.css']) {
  if (entry.includes('/original/' + stylesheet) || fs.existsSync('dist/original/' + stylesheet)) throw new Error('Obsolete lesson stylesheet: ' + stylesheet);
}
for (const script of ['learning-session.js', 'curriculum-session.js', 'curriculum-ui.js', 'grade-menu.js', 'learning-work-ui.js', 'articulation-lessons.js', 'articulation-animations.js', 'q-sound-adventure.js', 'autumn-story-game.js', 'voice-presence.js', 'train-voice-menu.js', 'train-voice-ui.js', 'train-voice-session.js', 'train-model-transport.js', 'train-model-preload.js', 'train-phoneme-session.js']) {
  if (entry.includes('/js/' + script) || fs.existsSync('dist/original/js/' + script)) {
    throw new Error('Obsolete practice script remains in the production build: ' + script);
  }
}
const result = { checked: files.length + 1, audioFiles: audio.length, passed: true, scope: 'Static source/dist SHA-256 equality and compiled React practice entry; both relative and manifest-local audio paths resolved' };
fs.writeFileSync('docs/trello-verification/curriculum-build-assets.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
