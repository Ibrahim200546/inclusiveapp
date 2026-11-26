import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const verification = 'docs/trello-verification';
const original = 'public/original';
const reportArg = process.argv.find(arg => arg.startsWith('--report='));
const scope = {};
new Function('window', fs.readFileSync(path.join(original, 'js/grade-sounds.js'), 'utf8'))(scope);
const sounds = scope.CorexGradeSounds;
const bank = [];
const byHash = new Map();
const inventory = JSON.parse(fs.readFileSync(path.join(verification, 'audio-inventory.json'), 'utf8'));
const byPath = new Map(inventory.map(row => [row.path, row]));
for (const row of inventory) {
  if (!byHash.has(row.sha256)) byHash.set(row.sha256, []);
  byHash.get(row.sha256).push(row);
}

for (const grade of [0, 1, 2, 3, 4]) {
  const sourceGrade = sounds.releasedGrade(grade);
  for (const category of Object.keys(sounds.categories)) {
    for (const stage of sounds.stages(sourceGrade, category)) {
      const profile = sounds.profile(sourceGrade, category, stage);
      assert.ok(profile.items.length > 1, `Empty or insufficient bank for ${grade}/${category}/${stage}`);
      const targets = new Set(profile.items.map(item => item.audio));
      assert.equal(targets.size, profile.items.length);
      const assets = profile.items.map(item => {
        const row = byPath.get(item.audio);
        assert.equal(row?.gradeSound?.id, item.id, item.audio);
        return { id: item.id, kk: item.kk, ru: item.ru, path: item.audio,
          teacherApproved: row.gradeSound.teacherApproved, rights: row.rights };
      });
      bank.push({ grade, sourceGrade, sourceTable: profile.table, category, stage,
        sourceObjectiveCodes: profile.objectiveCodes, choiceCount: sourceGrade < 2 ? assets.length : Math.min(3, assets.length), assets });
    }
  }
}
const signature = grade => bank.filter(p => p.grade === grade).map(({ grade: _grade, ...definition }) => definition);
assert.deepEqual(signature(0), signature(2), 'Grade 2 must match the released entry-level banks');
assert.deepEqual(bank.filter(p => p.grade === 2 && p.category === 'instruments').map(p => p.assets.length), [2]);
assert.deepEqual(sounds.stages(2, 'instruments'), ['start', 'extended'], 'Historical stages are still available for rollback');

const present = new Set(bank.flatMap(p => p.assets.map(a => a.path)));
const duplicates = [...byHash].filter(([, files]) => files.length > 1).map(([sha256, files]) => ({
  sha256,
  files: files.map(row => ({
    path: row.path,
    inventoryCategory: row.category,
    inReleasedRecognition: present.has(row.path),
    source: row.source ?? null,
    rights: row.rights,
    // Check legacy requests, byte aliases or authored content separately before any deletion.
  })),
}));
assert.ok(duplicates.length);
if (reportArg) {
  fs.writeFileSync(reportArg.slice('--report='.length), JSON.stringify({ bank, duplicates }, null, 2) + '\n');
}
console.log(JSON.stringify({ releasedProfiles: bank.length, grade2Profiles: bank.filter(p => p.grade === 2).length, recognitionPaths: present.size,
  duplicateGroups: duplicates.length, duplicateFiles: duplicates.reduce((n, group) => n + group.files.length, 0) }));
