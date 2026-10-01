import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

function renderer() {
  const source = readFileSync(resolve('public/original/script.js'), 'utf8');
  const start = source.indexOf('async function loadLeaderboard()');
  const end = source.indexOf('// Ensure theme toggle', start);
  return new Function('document', 'fetch', 'getSupaAuth', 'SUPA_URL', 'SUPA_KEY', 'location', source.slice(start, end) + '; return loadLeaderboard;');
}

describe('leaderboard untrusted profile data', () => {
  it('renders names as text and rejects executable avatar URLs', async () => {
    document.body.innerHTML = '<div id="leaderboardList"></div>';
    const malicious = '<img src=x onerror="window.stolen=true">';
    const fetch = vi.fn().mockResolvedValue({ok:true,json:async()=>[{profiles:{full_name:malicious,avatar_url:'javascript:alert(1)'},coins:42}]});
    await renderer()(document, fetch, () => null, 'https://example.test', 'public-test-key', {href:'https://example.test'})();
    expect(document.querySelector('.lb-name')?.textContent).toBe(malicious);
    expect(document.querySelector('.lb-name img')).toBeNull();
    expect(document.querySelector('.leaderboard-item img')).toBeNull();
    expect(document.querySelector('.lb-coins')?.textContent).toBe('🪙 42');
  });
  it('keeps HTTPS avatars without treating quotes as attributes', async () => {
    document.body.innerHTML = '<div id="leaderboardList"></div>';
    const fetch = vi.fn().mockResolvedValue({ok:true,json:async()=>[{profiles:{full_name:'Guest',avatar_url:'https://example.test/photo?x=" onerror="alert(1)'},coins:'bad'}]});
    await renderer()(document, fetch, () => null, 'https://example.test', 'public-test-key', {href:'https://example.test'})();
    expect(document.querySelector('img')?.hasAttribute('onerror')).toBe(false);
    expect(document.querySelector('.lb-coins')?.textContent).toBe('🪙 0');
  });
});
