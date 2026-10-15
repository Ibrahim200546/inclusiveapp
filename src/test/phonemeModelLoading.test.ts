import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('public/original/js/phoneme-worker.js', 'utf8')
  .replace(/^import .*\r?\n/, '')
  .split('import.meta.url').join(JSON.stringify('https://edu-corex.kz/original/js/phoneme-worker.js'));
const repository = 'qnighy/wav2vec2-xlsr-53-espeak-cv-ft-ONNX';
const revision = 'd2987af7ae07d53eafee15dc7190479062faa1e8';

async function load(local: () => Promise<Response>, offline = false) {
  const env = { allowLocalModels: true, allowRemoteModels: false, backends: { onnx: { wasm: {} } } };
  const messages: { id: number; ready?: boolean; error?: string }[] = [];
  const self: {
    navigator: { hardwareConcurrency: number };
    postMessage: (message: typeof messages[number]) => void;
    onmessage?: (event: { data: { id: number; type: string } }) => Promise<void>;
  } = { navigator: { hardwareConcurrency: 4 }, postMessage: message => messages.push(message) };
  // Reproduce Transformers' local-first resolution on a host returning SPA HTML.
  const model = vi.fn(async (name: string) => {
    if (name === repository && env.allowLocalModels) throw new Error('SPA HTML parsed as JSON');
    if (offline) throw new Error('Network unavailable');
    return {};
  });
  const extractor = vi.fn(async () => ({}));
  const fetch = vi.fn(async (url: URL | string) => String(url).endsWith('/config.json')
    ? local()
    : new Response(JSON.stringify({ '<pad>': 0, a: 1 })));
  new Function('env', 'AutoModelForCTC', 'Wav2Vec2FeatureExtractor', 'self', 'fetch', source)(
    env, { from_pretrained: model }, { from_pretrained: extractor }, self, fetch,
  );
  await self.onmessage!({ data: { id: 1, type: 'load' } });
  return { env, messages, model, extractor, fetch };
}

describe('phoneme model source selection', () => {
  it.each(['spa', '404', 'rejected'] as const)('downloads the pinned model when local config is %s', async kind => {
    const result = await load(async () => {
      if (kind === 'rejected') throw new TypeError('File not found');
      return kind === 'spa'
        ? new Response('<!doctype html><html></html>', { headers: { 'Content-Type': 'text/html' } })
        : new Response('', { status: 404 });
    });
    expect(result.env.allowLocalModels).toBe(false);
    expect(result.env.allowRemoteModels).toBe(true);
    expect(result.model).toHaveBeenCalledWith(repository, expect.objectContaining({ revision, dtype: 'q4', device: 'wasm' }));
    expect(result.extractor).toHaveBeenCalledWith(repository, { revision });
    expect(result.fetch).toHaveBeenLastCalledWith(`https://huggingface.co/${repository}/resolve/${revision}/vocab.json`);
    expect(result.messages).toEqual([{ id: 1, ready: true }]);
  });

  it('keeps bundled weights local when their config is present', async () => {
    const result = await load(async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }));
    expect(result.env.allowLocalModels).toBe(true);
    expect(result.env.allowRemoteModels).toBe(false);
    expect(result.model).toHaveBeenCalledWith('phoneme', expect.objectContaining({ dtype: 'q4', device: 'wasm' }));
    expect(result.extractor).toHaveBeenCalledWith('phoneme', {});
    expect(result.messages).toEqual([{ id: 1, ready: true }]);
  });

  it('reports an actual remote failure without claiming readiness', async () => {
    const result = await load(async () => new Response('', { status: 404 }), true);
    expect(result.messages).toEqual([{ id: 1, error: 'Network unavailable' }]);
  });
});
