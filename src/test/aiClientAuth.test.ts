// @vitest-environment node
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expect, it, vi } from 'vitest';

function client(session: unknown = { access_token: 'session-test-token' }) {
  const fetch = vi.fn().mockResolvedValue(new Response('{}'));
  const window = {} as { aiApiFetch: typeof globalThis.fetch };
  vm.runInNewContext(readFileSync('public/original/js/ai-api.js', 'utf8'), {
    window, Headers, Response, fetch, getSupaAuth: () => session,
  });
  return { fetch, call: window.aiApiFetch };
}
it('attaches the user token and keeps request options', async () => {
  const { call, fetch } = client();
  const controller = new AbortController();
  await call('/api/tts', { method: 'POST', body: '{"text":"Hi"}', signal: controller.signal });
  const options = fetch.mock.calls[0][1];
  expect(options.headers.get('Authorization')).toBe('Bearer session-test-token');
  expect(options.signal).toBe(controller.signal); expect(options.redirect).toBe('error');
});
it('never sends a token to an arbitrary origin', async () => {
  const { call, fetch } = client();
  await expect(call('https://attacker.invalid/api/tts')).rejects.toThrow('Unsupported AI route');
  expect(fetch).not.toHaveBeenCalled();
});
it('does not call the paid API when signed out', async () => {
  const { call, fetch } = client(null);
  expect((await call('/api/tts')).status).toBe(401); expect(fetch).not.toHaveBeenCalled();
});
it('retains the system message and recent conversation within the server limit', async () => {
  const { call, fetch } = client();
  const messages = [{ role: 'system', content: 'Brief replies' }, ...Array.from({ length: 40 }, (_, i) => ({ role: 'user', content: `Message ${i}` }))];
  await call('/api/ai-chat', { method: 'POST', body: JSON.stringify({ messages }) });
  const sent = JSON.parse(fetch.mock.calls[0][1].body).messages;
  expect(sent).toHaveLength(24); expect(sent[0]).toEqual(messages[0]); expect(sent.at(-1)).toEqual(messages.at(-1));
});
it('wires every legacy paid-API call through the authenticated wrapper', () => {
  for (const file of ['public/original/ai-tools.js', 'public/original/js/app-audio.js', 'public/original/index2.html']) {
    expect(readFileSync(file, 'utf8')).not.toMatch(/\bfetch\('\/api\/(tts|ai-chat|ai-evaluate)'/);
  }
});
