// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import chat from '../../api/ai-chat.js';
import evaluate from '../../api/ai-evaluate.js';
import tts from '../../api/tts.js';

const userId = '10000000-0000-0000-0000-000000000001';
const cases = [
  { name: 'ai-chat', handler: chat, body: { messages: [{ role: 'user', content: 'Hello' }] } },
  { name: 'ai-evaluate', handler: evaluate, body: { target: 'Hi', spoken: '' } },
  { name: 'tts', handler: tts, body: { text: 'Hello', lang: 'ru-RU' } },
];
function response() {
  return { statusCode: 200, headers: {} as Record<string, string>, payload: undefined as any,
    setHeader(key: string, value: string) { this.headers[key] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json(value: any) { this.payload = value; return this; },
    send(value: any) { this.payload = value; return this; }, end() { return this; } };
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://test.invalid');
  vi.stubEnv('SUPABASE_ANON_KEY', 'public-test-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'private-test-key');
  vi.stubEnv('GEMINI_API_KEY', 'provider-test-key');
  vi.stubEnv('OPENAI_API_KEY', 'provider-test-key');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected external request'); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe.each(cases)('$name access boundary', ({ name, handler, body }) => {
  const request = (overrides = {}) => ({ method: 'POST', body,
    headers: { 'content-type': 'application/json', authorization: 'Bearer user-token' }, ...overrides });
  it('rejects an unauthenticated call without network access', async () => {
    const res = response();
    await handler(request({ headers: { 'content-type': 'application/json' } }), res);
    expect(res.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects invalid, expired or public anon credentials before quota/provider calls', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ error: 'invalid JWT' }, 401));
    const res = response();
    await handler(request(), res);
    expect(res.statusCode).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not grant paid access to anonymous Auth accounts', async () => {
    vi.mocked(fetch).mockResolvedValue(json({ id: userId, role: 'authenticated', is_anonymous: true }));
    const res = response();
    await handler(request(), res);
    expect(res.statusCode).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([429, 500])('does not call a provider when quota responds %s', async (status) => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ id: userId, role: 'authenticated' }))
      .mockResolvedValueOnce(json({ error: 'quota' }, status));
    const res = response();
    await handler(request(), res);
    expect(res.statusCode).toBe(status === 429 ? 429 : 503);
    expect(fetch).toHaveBeenCalledTimes(2);
    if (status === 429) expect(res.headers['Retry-After']).toBe('60');
  });
  it('fails closed when configuration or authentication service is unavailable', async () => {
    let res = response();
    await handler(request(), res);
    expect(res.statusCode).toBe(503);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.mocked(fetch).mockClear();
    res = response();
    await handler(request(), res);
    expect(res.statusCode).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects oversized and malformed input before external calls', async () => {
    const res = response();
    await handler(request({ body: { ...body, padding: 'x'.repeat(32769) } }), res);
    expect(res.statusCode).toBe(413);
    const invalid = response();
    await handler(request({ body: {} }), invalid);
    expect(invalid.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('supports preflight with Authorization and blocks non-POST methods', async () => {
    const res = response();
    await handler(request({ method: 'OPTIONS' }), res);
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Authorization');
    await handler(request({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses the verified user for quota and preserves successful provider responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ id: userId, role: 'authenticated' }))
      .mockResolvedValueOnce(json({ allowed: true }))
      .mockResolvedValueOnce(name === 'tts' ? new Response('audio', { headers: { 'content-type': 'audio/mpeg' } })
        : json({ candidates: [{ content: { parts: [{ text: name === 'ai-chat' ? 'Hello!' : '{"score":90,"feedback":"Good"}' }] } }] }));
    const res = response();
    await handler(request({ body: { ...body, user_id: 'forged' } }), res);
    expect(res.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
    const quota = vi.mocked(fetch).mock.calls[1];
    expect(JSON.parse(quota[1]!.body as string)).toEqual({ p_user_id: userId, p_endpoint: name });
    expect(res.headers['Cache-Control']).toContain('no-store');
  });
});

it.each([
  ['ai-chat', { messages: [{ role: 'tool', content: 'x' }] }],
  ['ai-chat', { messages: Array(25).fill({ role: 'user', content: 'x' }) }],
  ['ai-chat', { messages: [{ role: 'user', content: 'x'.repeat(4001) }] }],
  ['ai-evaluate', { target: {}, spoken: 'x' }],
  ['ai-evaluate', { target: 'x', spoken: 'x'.repeat(2001) }],
  ['tts', { text: ['x'] }], ['tts', { text: 'x'.repeat(701) }], ['tts', { text: 'x', speed: -1 }],
])('validates %s input types and bounds', async (name, body) => {
  const res = response();
  await cases.find((entry) => entry.name === name)!.handler({ method: 'POST', body, headers: { 'content-type': 'application/json' } }, res);
  expect(res.statusCode).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
