import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const manifests = ['sounds/find-number/manifest.json', 'sounds/syllable-reading/manifest.json', 'sounds/curriculum/manifest.json'];
const audio = manifests.flatMap(manifest => JSON.parse(fs.readFileSync('public/original/' + manifest, 'utf8'))
  .map(item => item.file.includes('/') ? item.file : path.posix.join(path.posix.dirname(manifest), item.file)));
const files = [...new Set([...audio, ...manifests, 'index2.html', 'i18n-profile.js', 'js/learning-session.js', 'js/learning-work-ui.js', 'js/curriculum-content.js', 'js/curriculum-session.js', 'js/curriculum-ui.js', 'js/exercise-orbit-ui.js', 'learning-work.css', 'curriculum.css', 'exercise-orbit.css', 'exercise-surfaces.css'])];
for (const file of files) {
  const hash = prefix => crypto.createHash('sha256').update(fs.readFileSync(prefix + file)).digest('hex');
  if (hash('public/original/') !== hash('dist/original/')) throw new Error('Outdated production asset: ' + file);
}
const result = { checked: files.length, audioFiles: audio.length, passed: true, scope: 'Source and production dist SHA-256 equality; both relative and manifest-local audio paths resolved' };
fs.writeFileSync('docs/trello-verification/curriculum-build-assets.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
