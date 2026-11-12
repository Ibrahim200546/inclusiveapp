import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const manifests = ['sounds/find-number/manifest.json', 'sounds/syllable-reading/manifest.json', 'sounds/curriculum/manifest.json'];
const audio = manifests.flatMap(manifest => JSON.parse(fs.readFileSync('public/original/' + manifest, 'utf8'))
  .map(item => item.file.includes('/') ? item.file : path.posix.join(path.posix.dirname(manifest), item.file)));
const files = [...new Set([...audio, ...manifests, 'i18n-profile.js', 'js/learning-work-ui.js', 'js/curriculum-content.js', 'js/exercise-orbit-ui.js', 'learning-work.css', 'curriculum.css', 'exercise-orbit.css', 'exercise-surfaces.css'])];
for (const file of files) {
  const hash = prefix => crypto.createHash('sha256').update(fs.readFileSync(prefix + file)).digest('hex');
  if (hash('public/original/') !== hash('dist/original/')) throw new Error('Outdated production asset: ' + file);
}
// The HTML is now a Vite entry, so it is transformed rather than copied.
const entry = fs.readFileSync('dist/original/index2.html', 'utf8');
const practiceBundle = entry.match(/src="(\/assets\/practice-[^"]+\.js)"/);
if (!entry.includes('data-practice-root') || !practiceBundle || entry.includes('/src/features/practice/main.tsx')) {
  throw new Error('Missing compiled React practice entry');
}
if (!fs.existsSync(path.join('dist', practiceBundle[1].slice(1)))) throw new Error('Missing React practice bundle');
for (const script of ['learning-session.js', 'curriculum-session.js', 'curriculum-ui.js']) {
  if (entry.includes('/js/' + script) || fs.existsSync('dist/original/js/' + script)) {
    throw new Error('Obsolete practice script remains in the production build: ' + script);
  }
}
const result = { checked: files.length + 1, audioFiles: audio.length, passed: true, scope: 'Static source/dist SHA-256 equality and compiled React practice entry; both relative and manifest-local audio paths resolved' };
fs.writeFileSync('docs/trello-verification/curriculum-build-assets.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
