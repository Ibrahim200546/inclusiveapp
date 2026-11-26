import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cases, rehearse } from './card10.mjs';

const read = (file) => JSON.parse(readFileSync(new URL('../../' + file, import.meta.url), 'utf8'));
const drafts = read('docs/trello-verification/content-drafts.json');
const clips = read('public/original/sounds/curriculum/manifest.json');

test('rehearsal uses exact owner-approved script and the existing matched local audio bytes', () => {
  for (const item of cases) {
    const [section, sourceId] = item.source;
    const snippets = sourceId
      ? drafts[section].find(entry => entry.id === sourceId).turns.map(turn => turn.text)
      : drafts[section].items.map(entry => entry.text);
    for (const line of item.speech) {
      assert.ok(snippets.includes(line), line);
      const matched = clips.filter(entry => entry.text === line && entry.lang === 'kk-KZ');
      assert.equal(matched.length, 1, line);
      const clip = matched[0];
      const sample = readFileSync(new URL('../../public/original/' + clip.file, import.meta.url));
      assert.equal(createHash('sha256').update(sample).digest('hex'), clip.sha256);
    }
  }
});

for (const item of cases) {
  test(item.id + ': answer is locked until complete listening, incorrect answers are retryable', () => {
    const flow = rehearse(item);
    assert.deepEqual(flow.view().choices, []);
    assert.equal(flow.choose(item.answer), 'blocked');
    const token = flow.play();
    for (let i = 0; i < item.speech.length; i++) {
      assert.deepEqual(flow.view().choices, []);
      assert.equal(flow.clipEnded(token, i + 1), false);
      assert.equal(flow.clipEnded(token, i), true);
    }
    assert.deepEqual(flow.view().choices, ['a', 'b']);
    assert.equal(flow.choose('invalid'), 'blocked');
    assert.equal(flow.choose(item.answer === 'a' ? 'b' : 'a'), 'retry-answer');
    assert.equal(flow.view().credits, 0);
    assert.equal(flow.choose(item.answer), 'correct');
    assert.equal(flow.choose(item.answer), 'blocked');
    assert.equal(flow.view().credits, 1);
  });

  test(item.id + ': stale audio events cannot unlock after failure, repeat, or reset', () => {
    const flow = rehearse(item);
    const original = flow.play();
    assert.equal(flow.failed(original), true);
    assert.equal(flow.clipEnded(original, 0), false);
    const replay = flow.play();
    assert.equal(flow.failed(original), false);
    assert.equal(flow.clipEnded(original, 0), false);
    flow.reset();
    assert.equal(flow.clipEnded(replay, 0), false);
    assert.equal(flow.choose(item.answer), 'blocked');
    assert.equal(flow.view().phase, 'ready');
    assert.equal(flow.view().credits, 0);
  });
}
