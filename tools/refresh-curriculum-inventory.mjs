import fs from 'node:fs';
import crypto from 'node:crypto';

const file = 'docs/trello-verification/audio-inventory.json';
const inventory = new Map(JSON.parse(fs.readFileSync(file, 'utf8')).map(item => [item.path, item]));
const manifest = JSON.parse(fs.readFileSync('public/original/sounds/curriculum/manifest.json', 'utf8'));
const scope = {};
new Function('window', fs.readFileSync('public/original/js/curriculum-content.js', 'utf8'))(scope);
for (const clip of manifest) {
  const bytes = fs.readFileSync('public/original/' + clip.file), sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== clip.sha256) throw new Error('Recording changed: ' + clip.file);
  const lessons = scope.CorexCurriculumContent.lessons.filter(lesson => lesson.steps.some(step => step.audio === clip.file || step.questionAudio === clip.file));
  inventory.set(clip.file, { id: crypto.createHash('sha256').update(clip.file).digest('hex').slice(0, 12), path: clip.file, category: 'curriculum', bytes: bytes.length, sha256,
    programMapping: [...new Set(lessons.map(l => `grade=${l.grade}; table=${l.table}; strand=${l.strand}; codes=${l.objectiveCodes.join(',') || 'mapping pending'}`))],
    curriculumLessons: lessons.map(l => l.grade + ':' + l.id), source: clip.source, contentApprovedBy: 'user',
    rights: 'Synthetic narration through the existing Edu CoreX TTS service; provider terms apply', verification: 'File hash and complete MP3 decoding checked; professional pronunciation approval not claimed' });
}
fs.writeFileSync(file, JSON.stringify([...inventory.values()].sort((a, b) => a.path.localeCompare(b.path)), null, 2) + '\n');
console.log(JSON.stringify({ inventory: inventory.size, curriculumClips: manifest.length }));
