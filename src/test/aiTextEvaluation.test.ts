// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import handler from '../../api/ai-evaluate.js';
import { requireAiAccess } from '../../server/ai-access.js';

// Provider-response unit tests isolate access; aiAccess.test.ts exercises the real guard.
vi.mock('../../server/ai-access.js', () => ({ requireAiAccess: vi.fn() }));

async function evaluate(spoken = 'Бала') {
  const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
  await handler({ method: 'POST', body: { target: 'Бала', spoken } }, res);
  return { status: res.status.mock.calls[0][0], data: res.json.mock.calls[0][0] };
}
beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.mocked(requireAiAccess).mockReset().mockResolvedValue(true);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it.each(['{', '{"score":101,"feedback":"ok"}', '{"score":75}', '{}'])('rejects malformed model output %s without a score', async text => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ candidates: [{ content: { parts: [{ text }] } }] })));
  const result = await evaluate();
  expect(result.status).toBe(502); expect(result.data).not.toHaveProperty('score');
});
it('propagates upstream and connection failures without a score', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 429 })).mockRejectedValueOnce(new Error('offline')));
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await evaluate(); expect(result.status).toBe(502); expect(result.data).not.toHaveProperty('score');
  }
});
it('rejects missing transcripts and missing service credentials', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  expect((await evaluate(' ')).status).toBe(400);
  vi.stubEnv('GEMINI_API_KEY', '');
  expect((await evaluate()).status).toBe(503); expect(fetch).not.toHaveBeenCalled();
});
it('accepts an actual zero score and valid feedback', async () => {
  const data = { score: 0, feedback: 'Қайталап көріңіз.' };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] })));
  expect(await evaluate()).toEqual({ status: 200, data });
});

it('does not call the provider when access is denied', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  vi.mocked(requireAiAccess).mockImplementationOnce(async (_req, res) => {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  });
  expect((await evaluate()).status).toBe(401);
  expect(requireAiAccess).toHaveBeenCalledWith(
    expect.objectContaining({ method: 'POST' }), expect.anything(), 'ai-evaluate',
  );
  expect(fetch).not.toHaveBeenCalled();
});
