import type { Locale } from '../learning/content';
import { buildRows, normalizeInput, splitSentence, syllableAudio, type ReadingMode, type SplitItem } from './content';
import type { ReadingPlayback } from './playback';

export type ReadingStatus = '' | 'playing' | 'audioError' | 'generating' | 'generated' | 'generationError';
export type ReadingProgress = '' | 'listenFirst' | 'heard' | 'confirmed' | 'unsaved';
export interface ReadingRequest { host: string; mode: ReadingMode; returnScreen: string; context: 'voice' | 'breathing' | 'sounds' }
export interface ReadingIdentity { locale: Locale; grade: number; learner: string | null }
export interface ReadingSnapshot extends ReadingRequest, ReadingIdentity {
  input: string; rows: string[][]; split: SplitItem[]; playing: boolean; activeIndex: number | null;
  loading: boolean; status: ReadingStatus; progress: ReadingProgress; lastSample: string; confirmed: boolean;
}
interface Dependencies {
  player: ReadingPlayback;
  identity(): ReadingIdentity;
  generate(seed: string, locale: Locale, signal: AbortSignal): Promise<string[][]>;
  save(identity: ReadingIdentity, context: string, detail: Record<string, unknown>): boolean;
}

export function createReadingStore({ player, identity, generate: generateSentences, save }: Dependencies) {
  let snapshot: ReadingSnapshot | null = null;
  const listeners = new Set<() => void>();
  const drafts = new Map<string, Pick<ReadingSnapshot, 'input' | 'rows' | 'split'>>();
  let draftLearner = identity().learner;
  let audioVersion = 0, generationVersion = 0;
  let delayCancel: (() => void) | undefined, request: AbortController | undefined;
  let requestTimer: ReturnType<typeof setTimeout> | undefined;
  function notify() { listeners.forEach(listener => listener()); }
  function update(changes: Partial<ReadingSnapshot>) { if (snapshot) { snapshot = { ...snapshot, ...changes }; notify(); } }
  function stop() {
    audioVersion++; delayCancel?.(); delayCancel = undefined; player.stop();
    update({ playing: false, activeIndex: null, ...(snapshot?.status === 'playing' ? { status: '' } : {}) });
  }
  function cancelGeneration() {
    generationVersion++; clearTimeout(requestTimer); requestTimer = undefined;
    request?.abort(); request = undefined;
  }
  function clearAttempt() {
    stop(); cancelGeneration();
    update({ loading: false, status: '', progress: '', lastSample: '', confirmed: false });
  }
  function close() {
    if (snapshot) drafts.set(`${snapshot.locale}:${snapshot.mode}`, { input: snapshot.input, rows: snapshot.rows, split: snapshot.split });
    stop(); cancelGeneration(); snapshot = null; notify();
  }
  function setInput(value: string) {
    if (!snapshot) return;
    clearAttempt(); update({ input: normalizeInput(snapshot.mode, value), rows: [], split: [] });
  }
  async function generate() {
    if (!snapshot) return;
    clearAttempt();
    const input = normalizeInput(snapshot.mode, snapshot.input, true);
    update({ input, rows: [], split: [] });
    if (!input) return;
    if (snapshot.mode === 'split') { update({ split: splitSentence(input) }); return; }
    if (snapshot.mode !== 'sentences' || input.includes(' ')) { update({ rows: buildRows(snapshot.mode, input) }); return; }
    const token = generationVersion, controller = new AbortController(); request = controller;
    update({ loading: true, status: 'generating' });
    requestTimer = setTimeout(() => {
      if (token !== generationVersion) return;
      cancelGeneration(); update({ loading: false, status: 'generationError' });
    }, 30_000);
    try {
      const rows = await generateSentences(input, snapshot.locale, controller.signal);
      if (token === generationVersion) update({ rows, status: 'generated' });
    } catch { if (token === generationVersion) update({ status: 'generationError' }); }
    finally {
      if (token === generationVersion) {
        clearTimeout(requestTimer); requestTimer = undefined; request = undefined; update({ loading: false });
      }
    }
  }
  const delay = (ms: number) => new Promise<void>(resolve => {
    const timer = setTimeout(() => { delayCancel = undefined; resolve(); }, ms);
    delayCancel = () => { clearTimeout(timer); resolve(); };
  });
  function samples(current: ReadingSnapshot) {
    if (current.mode === 'split') return current.split.flatMap((part, index) => 'text' in part ? [{ text: part.text, index }] : []);
    if (current.mode === 'syllables') return current.rows.flat().map((text, index) => ({ text, index }));
    return current.rows.map((parts, index) => ({ text: parts.join(' '), index }));
  }
  async function play(index?: number) {
    if (!snapshot || snapshot.loading) return;
    const current = snapshot, selected = samples(current).filter(item => index === undefined || item.index === index);
    stop();
    if (!selected.length) return;
    const token = audioVersion;
    update({ playing: true, status: 'playing', lastSample: '', confirmed: false, progress: '' });
    for (let position = 0; position < selected.length; position++) {
      const item = selected[position];
      if (token !== audioVersion) return;
      update({ activeIndex: item.index });
      let ok = false;
      try { ok = await player.play(item.text, current.locale, {
        path: current.mode === 'syllables' ? syllableAudio(item.text) : undefined,
        speed: current.mode === 'split' ? (index === undefined ? .65 : .7) : .78,
      }); } catch { /* Playback failures remain retryable. */ }
      if (token !== audioVersion || !snapshot) return;
      if (!ok) { update({ playing: false, activeIndex: null, status: 'audioError' }); return; }
      if (current.mode === 'syllables') {
        save(current, current.context, { listened: true, repeatedWithTeacher: false, sample: item.text });
        update({ lastSample: item.text, progress: 'heard', confirmed: false });
      }
      if (position < selected.length - 1) await delay(current.mode === 'split' ? 350 : 450);
    }
    if (token === audioVersion) update({ playing: false, activeIndex: null, status: '' });
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start(options: ReadingRequest) {
      close(); const owner = identity();
      if (owner.learner !== draftLearner) { drafts.clear(); draftLearner = owner.learner; }
      snapshot = { ...options, ...owner, input: '', rows: [], split: [], ...drafts.get(`${owner.locale}:${options.mode}`),
        playing: false, activeIndex: null, loading: false, status: '', progress: '', lastSample: '', confirmed: false };
      notify();
    },
    syncIdentity() {
      const next = identity();
      if (next.learner !== draftLearner) { drafts.clear(); draftLearner = next.learner; }
      if (!snapshot) return;
      if (next.locale === snapshot.locale && next.grade === snapshot.grade && next.learner === snapshot.learner) return;
      const localeChanged = next.locale !== snapshot.locale, learnerChanged = next.learner !== snapshot.learner;
      clearAttempt();
      if (learnerChanged) drafts.clear();
      update({ ...next, ...(localeChanged || learnerChanged ? { input: '', rows: [], split: [] } : {}) });
    },
    setInput, generate, play, stop, close,
    preset(value: string) { setInput(value); return generate(); },
    confirm() {
      if (!snapshot || snapshot.mode !== 'syllables' || snapshot.playing) return;
      if (!snapshot.lastSample) { update({ progress: 'listenFirst' }); return; }
      if (snapshot.confirmed) return;
      const persisted = save(snapshot, snapshot.context, { listened: true, repeatedWithTeacher: true, sample: snapshot.lastSample });
      update({ confirmed: persisted, progress: persisted ? 'confirmed' : 'unsaved' });
    },
    dispose() { close(); drafts.clear(); listeners.clear(); },
  };
}
export type ReadingStore = ReturnType<typeof createReadingStore>;
