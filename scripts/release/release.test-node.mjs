import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseVersion } from './version.mjs';
import { ensureRelease, releaseMetadata } from './publish.mjs';

const meta = { repo: 'Ibrahim200546/inclusiveapp', sha: 'a'.repeat(40), version: '1.1.134', tag: 'v1.1.134', title: 'Edu CoreX v1.1.134' };
test('release versions are deterministic and monotonic for full commit counts', () => {
  assert.deepEqual(releaseVersion('134'), { version: '1.1.134', versionCode: 1134 });
  assert.deepEqual(releaseVersion(135), { version: '1.1.135', versionCode: 1135 });
  for (const value of [0, -1, 'bad', 1.5, 65536, 2100000000]) assert.throws(() => releaseVersion(value));
});
test('publication requires exact repository, version, and commit metadata', () => {
  assert.equal(releaseMetadata({ RELEASE_VERSION: meta.version, GITHUB_SHA: meta.sha, GITHUB_REPOSITORY: meta.repo }).tag, meta.tag);
  assert.throws(() => releaseMetadata({ RELEASE_VERSION: meta.version, GITHUB_SHA: meta.sha, GITHUB_REPOSITORY: 'other/repo' }));
});
test('concurrent release creation is recovered by rechecking and validating the tag', () => {
  let views = 0;
  const invoke = args => {
    if (args[0] === 'api') return { ok: true, text: JSON.stringify({ object: { type: 'commit', sha: meta.sha } }) };
    if (args[1] === 'view') return { ok: ++views > 1, text: '{}' };
    if (args[1] === 'create') return { ok: false, text: '' };
    throw new Error('Unexpected command');
  };
  assert.doesNotThrow(() => ensureRelease(meta, meta.tag, invoke));
});
test('release creation failures and unrelated tags stop publication', () => {
  assert.throws(() => ensureRelease(meta, meta.tag, () => ({ ok: false, text: '' })), /Unable/);
  assert.throws(() => ensureRelease(meta, meta.tag, args => args[0] === 'api'
    ? { ok: true, text: JSON.stringify({ object: { type: 'commit', sha: 'b'.repeat(40) } }) }
    : { ok: true, text: '{}' }), /unrelated tag/);
});
