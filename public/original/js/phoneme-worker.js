import { env, AutoModelForCTC, Wav2Vec2FeatureExtractor } from '../vendor/phoneme/transformers.min.js';
const revision = 'd2987af7ae07d53eafee15dc7190479062faa1e8';
const repository = 'qnighy/wav2vec2-xlsr-53-espeak-cv-ft-ONNX';
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = true;
env.localModelPath = new URL('../models/', import.meta.url).href;
env.backends.onnx.wasm.wasmPaths = new URL('../vendor/phoneme/', import.meta.url).href;
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, self.navigator.hardwareConcurrency || 1) : 1;
let ready;
async function load() {
  let name = 'phoneme', options = {};
  const local = await fetch(new URL('../models/phoneme/config.json', import.meta.url));
  if (!local.ok || !(local.headers.get('content-type') || '').includes('json')) {
    name = repository; options = { revision };
    env.allowRemoteModels = true;
  }
  const model = await AutoModelForCTC.from_pretrained(name, { ...options, dtype: 'q4', device: 'wasm', progress_callback: event => {
    if (event.status === 'progress') self.postMessage({ type: 'download', progress: event.progress });
  } });
  const extractor = await Wav2Vec2FeatureExtractor.from_pretrained(name, options);
  const vocabURL = name === 'phoneme' ? new URL('../models/phoneme/vocab.json', import.meta.url).href : `https://huggingface.co/${repository}/resolve/${revision}/vocab.json`;
  const raw = await (await fetch(vocabURL)).json();
  const vocab = []; for (const [phone, id] of Object.entries(raw)) vocab[id] = phone;
  // All remote requests above download public weights/configuration; PCM never enters fetch.
  return { model, extractor, vocab };
}
self.onmessage = async event => {
  const { id, type, pcm } = event.data;
  try {
    ready ||= load(); const { model, extractor, vocab } = await ready;
    if (type === 'load') { self.postMessage({ id, ready: true }); return; }
    const audio = new Float32Array(pcm);
    try {
      const { logits } = await model(await extractor(audio));
      const [, frames, size] = logits.dims;
      const segments = []; let previous = -1;
      for (let frame = 0; frame < frames; frame++) {
        let best = 0; for (let i = 1; i < size; i++) if (logits.data[frame * size + i] > logits.data[frame * size + best]) best = i;
        let sum = 0; const maximum = logits.data[frame * size + best];
        for (let i = 0; i < size; i++) sum += Math.exp(logits.data[frame * size + i] - maximum);
        const confidence = 1 / sum;
        const segment = segments[segments.length - 1];
        if (best === previous && segment) { segment.end = (frame + 1) * 20; segment.confidence = Math.max(segment.confidence,confidence); }
        else segments.push({ phone: best === 0 ? '' : vocab[best], start: frame * 20, end: (frame + 1) * 20, confidence });
        previous = best;
      }
      self.postMessage({ id, segments });
    } finally { audio.fill(0); }
  } catch (error) { ready = undefined; self.postMessage({ id, error: String(error.message || error) }); }
};
