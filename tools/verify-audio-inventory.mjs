import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const base = 'public/original';
const audit = 'docs/trello-verification';
const inventory = JSON.parse(fs.readFileSync(audit + '/audio-inventory.json', 'utf8'));
const objectives = JSON.parse(fs.readFileSync(audit + '/objective-audit.json', 'utf8'));
const scope = {};
for (const script of ['grade-sounds', 'audio-preload-manifest']) {
  new Function('window', fs.readFileSync(base + '/js/' + script + '.js', 'utf8'))(scope);
}
const sounds = scope.CorexGradeSounds;
const byPath = new Map(inventory.map(row => [row.path, row]));
const sha256 = input => createHash('sha256').update(input).digest('hex');
const media = fs.readdirSync(base + '/sounds', { recursive: true })
  .filter(file => /\.(mp3|mp4|wav|mpeg|m4a|ogg|aac|opus|webm|flac)$/i.test(file))
  .map(file => 'sounds/' + file.split(path.sep).join('/'));
assert.equal(byPath.size, inventory.length, 'Duplicate path in inventory');
assert.deepEqual(new Set(byPath.keys()), new Set(media), 'Inventory and sound files differ');

const hashes = new Map();
const decode = process.argv.includes('--decode');
for (const row of inventory) {
  const file = base + '/' + row.path;
  const data = fs.readFileSync(file);
  assert.equal(row.id, sha256(row.path).slice(0, 12), row.path);
  assert.equal(row.bytes, data.length, row.path);
  assert.equal(row.sha256, sha256(data), row.path);
  hashes.set(row.sha256, (hashes.get(row.sha256) || 0) + 1);
  if (decode) {
    const output = row.gradeSound ? ['-ac', '1', '-ar', '16000', '-f', 's16le', 'pipe:1'] : ['-f', 'null', '-'];
    const run = spawnSync(process.env.FFMPEG || 'ffmpeg', [
      '-nostdin', '-v', 'error', '-threads', '1', '-xerror', '-i', file, '-map', '0:a:0', '-vn', ...output,
    ], { windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    if (run.error) throw run.error;
    assert.equal(run.status, 0, row.path + ' ' + run.stderr.toString());
    if (row.gradeSound) {
      assert.equal(row.decodedAudio.samples, run.stdout.length / 2, row.path);
      assert.equal(row.decodedAudio.sha256, sha256(run.stdout), row.path);
    }
  }
}

const assignments = new Map();
let profiles = 0;
for (let grade = 0; grade <= 4; grade++) {
  for (const category of Object.keys(sounds.categories)) {
    for (const stage of sounds.stages(grade, category)) {
      const profile = sounds.profile(grade, category, stage);
      const codes = profile.objectiveCodes.join(',') || 'mapping pending';
      const mapping = `grade=${grade}; table=${profile.table}; strand=listening; category=${category}; stage=${stage}; codes=${codes}`;
      for (const item of profile.items) {
        if (!assignments.has(item.audio)) assignments.set(item.audio, []);
        assignments.get(item.audio).push(mapping);
      }
      profiles++;
    }
  }
}
for (const [category, group] of Object.entries(sounds.categories)) {
  for (const [firstGrade, id, kk, ru, pictogram, audio] of group.sounds) {
    const row = byPath.get(audio);
    assert.ok(row?.decodedAudio.samples > 0, audio);
    assert.deepEqual(row.gradeSound, {
      id, category, screen: group.screen, kk, ru, pictogram, firstGrade,
      simplifiedGrades: [0, 1].filter(grade => grade >= firstGrade),
      teacherApproved: row.gradeSound.teacherApproved,
    }, audio);
    assert.equal(typeof row.gradeSound.teacherApproved, 'boolean', audio);
    assert.deepEqual(row.programMapping, assignments.get(audio), audio);
    assert.ok(row.source && row.rights, audio);
    if (row.sourceArchive && !row.sourceArchive.repair) {
      assert.equal(row.sha256, row.sourceArchive.sha256, audio);
    }
  }
}
const active = inventory.filter(row => row.gradeSound);
assert.deepEqual(new Set(active.map(row => row.path)), new Set(assignments.keys()), 'Stale grade sound assignment');
assert.equal(new Set(active.map(row => row.decodedAudio.sha256)).size, active.length, 'Grade sounds share audio');

const preload = scope.APP_AUDIO_PRELOAD_MANIFEST;
for (const entry of preload) assert.equal(entry.bytes, byPath.get(entry.src)?.bytes, entry.src);
for (const row of objectives) {
  for (const file of row.resourceCandidates) assert.ok(byPath.has(file), row.key + ' ' + file);
  for (const file of row.activeForObjective) assert.ok(row.resourceCandidates.includes(file), row.key + ' ' + file);
}
const repeated = [...hashes.values()].filter(count => count > 1);
console.log(JSON.stringify({
  files: media.length, uniqueFileHashes: hashes.size, duplicateGroups: repeated.length,
  filesInDuplicateGroups: repeated.reduce((total, count) => total + count, 0),
  gradeSounds: active.length, profiles, preload: preload.length, objectives: objectives.length,
  fullDecoded: decode ? inventory.length : 0,
}));
