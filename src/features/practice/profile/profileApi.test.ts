import { afterEach, expect, it, vi } from 'vitest';
import { authStorageKey, clearPracticeAuth, profileApi, readPracticeAuth, safeProfileAvatar } from './profileApi';
import { readAvatar } from './readAvatar';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it('rejects missing, malformed and expired sessions without clearing a newer token', () => {
  localStorage.setItem(authStorageKey(), '{broken'); expect(readPracticeAuth()).toBeNull();
  localStorage.setItem(authStorageKey(), JSON.stringify({ access_token: 'old', user: { id: 'a' }, expires_at: 1 }));
  expect(readPracticeAuth()).toBeNull(); expect(localStorage.getItem(authStorageKey())).toBeNull();
  localStorage.setItem(authStorageKey(), JSON.stringify({ access_token: 'new', user: { id: 'b' } }));
  clearPracticeAuth('old'); expect(readPracticeAuth()?.user.id).toBe('b');
});
it('sends profile fields and coin totals to their existing upsert endpoints', async () => {
  vi.stubGlobal('INCLUSIVE_SUPABASE_URL', 'https://api.test/');
  vi.stubGlobal('INCLUSIVE_SUPABASE_ANON_KEY', 'public-key');
  const fetch = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetch);
  const auth = { access_token: 'token', user: { id: 'learner' } }; const signal = new AbortController().signal;
  await profileApi.save(auth, { full_name: 'Name' }, signal);
  await profileApi.saveCoins(auth, 120, signal);
  expect(fetch.mock.calls[0][0]).toBe('https://api.test/rest/v1/profiles?on_conflict=id');
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', signal, headers: { Authorization: 'Bearer token', Prefer: 'resolution=merge-duplicates' } });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ id: 'learner', full_name: 'Name' });
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ user_id: 'learner', coins: 120 });
});
it('validates avatar size/type, supports cancellation and rejects executable avatar URLs', async () => {
  const signal = new AbortController().signal;
  await expect(readAvatar(new File(['bad'], 'x.txt', { type: 'text/plain' }), signal)).rejects.toThrow('image-type');
  await expect(readAvatar(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'x.png', { type: 'image/png' }), signal)).rejects.toThrow('image-size');
  const controller = new AbortController(); controller.abort();
  await expect(readAvatar(new File(['x'], 'x.png', { type: 'image/png' }), controller.signal)).rejects.toHaveProperty('name', 'AbortError');
  expect(safeProfileAvatar('javascript:alert(1)')).toContain('ui-avatars.com');
  expect(safeProfileAvatar('data:text/html;base64,abc')).toContain('ui-avatars.com');
  expect(safeProfileAvatar('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
});
