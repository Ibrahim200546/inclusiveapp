import { create, shuffle, type Answer, type LearningState } from './session';
import { numbers, soundItems, type ListeningItem, type ListeningMode, type Locale } from './content';
import type { ListeningPlayback } from './playback';

export interface SoundProfile { category: string; stage: string; items: ListeningItem[] }
export interface SoundLibrary {
  categories: Record<string, { labels: [string, string]; icon: string; screen: string }>;
  stages(grade: number, category: string): string[];
  profile(grade: number, category: string, stage?: string): SoundProfile;
  options(items: ListeningItem[], target: ListeningItem): ListeningItem[];
}
export interface ListeningRequest { host: string; mode: ListeningMode; grade: number; category?: string; stage?: string }
export interface ListeningChoice { value: Answer; kk: string; ru: string; icon?: string; angle: number; orbit: number; tilt: number }
export type Feedback = 'prompt' | 'listening' | 'choose' | 'correct' | 'wrong' | 'error' | 'sample' | 'compare' | 'sampleError';
export interface ListeningSnapshot {
  request: ListeningRequest; profile: SoundProfile | null; locale: Locale; learner: string | null;
  state: LearningState; choices: ListeningChoice[]; target: Answer | null; round: number;
  ready: boolean; playing: boolean; feedback: Feedback; persisted: boolean;
}
interface Dependencies {
  player: ListeningPlayback; sounds: SoundLibrary; getLocale(): Locale; getLearner(): string | null;
  save(learner: string | null, grade: number, context: string, objective: string, result: Record<string, unknown>): boolean;
  reward(): void;
}

export function createListeningStore(deps: Dependencies) {
  let snapshot: ListeningSnapshot | null = null;
  let session: ReturnType<typeof create<ListeningItem>> | null = null;
  let generation = 0, round = 0;
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach(listener => listener());
  function patch(changes: Partial<ListeningSnapshot>) { if (snapshot) { snapshot = { ...snapshot, ...changes }; publish(); } }
  function cancel() { generation++; deps.player.stop(); }
  function stop() { cancel(); patch({ playing: false, ready: false, feedback: session?.state.answered ? 'correct' : 'prompt' }); }
  function close() { cancel(); session = null; snapshot = null; publish(); }
  function save() {
    const { learner, request, profile, state } = snapshot!;
    return deps.save(learner, request.grade, profile ? 'recognition' : 'listening', profile ? profile.category + ':' + profile.stage : request.mode,
      { ...(profile && { stage: profile.stage }), completed: state.results.length, attempts: state.attempts, results: state.results });
  }
  function choices(): ListeningChoice[] {
    if (!session?.current) return [];
    const { request: { mode }, profile } = snapshot!;
    const same = (value: Answer, label: string, icon?: string) => ({ value, kk: label, ru: label, icon });
    const available = profile ? deps.sounds.options(profile.items, session.current).map(item => ({ value: item.id, kk: item.kk!, ru: item.ru!, icon: item.icon }))
      : mode === 'numbers' ? numbers.map(item => same(item.answer, String(item.answer)))
      : mode === 'dance' ? soundItems('dance').map(item => same(item.answer, item.label!, item.icon))
      : mode === 'count' ? [1, 2, 3].map(value => same(value, String(value), '👏'))
      : mode === 'pitch' ? [{ value: 'low', kk: 'Төмен', ru: 'Низкий', icon: '⬇️' }, { value: 'mid', kk: 'Орташа', ru: 'Средний', icon: '↔️' }, { value: 'high', kk: 'Жоғары', ru: 'Высокий', icon: '⬆️' }]
      : mode === 'tempo' ? [{ value: 'fast', kk: 'Тез', ru: 'Быстро', icon: '🐇' }, { value: 'slow', kk: 'Баяу', ru: 'Медленно', icon: '🐢' }]
      : [same('one', 'ТА', '🥁'), same('two', 'ТА–ТА', '🥁')];
    return (profile ? available : shuffle(available)).map((choice, index) => ({ ...choice,
      angle: -90 + index * 360 / available.length + (mode === 'numbers' ? (Math.random() - .5) * 8 : 0),
      orbit: mode === 'numbers' ? 36.5 + Math.random() * 4 : 34, tilt: Math.random() * 12 - 6,
    }));
  }
  function prepareRound() {
    cancel();
    snapshot = { ...snapshot!, state: session!.state, target: session!.current?.answer ?? null,
      round: ++round, playing: false, ready: false, feedback: 'prompt' };
    snapshot.choices = choices();
    if (snapshot.state.complete) {
      snapshot.persisted = save();
      if (!snapshot.profile) deps.reward();
    }
    publish();
  }
  async function listen() {
    if (!session?.current || !snapshot) return;
    cancel(); const token = generation, currentSession = session;
    patch({ ready: false, playing: true, feedback: 'listening' });
    try {
      await deps.player.play(currentSession.current!, snapshot.locale);
      if (generation !== token) return;
      currentSession.markHeard();
      patch({ state: currentSession.state, playing: false, ready: true, feedback: currentSession.state.answered ? 'correct' : 'choose' });
    } catch {
      if (generation === token) patch({ playing: false, ready: false, feedback: 'error' });
    }
  }
  function start(request: ListeningRequest) {
    const profile = request.mode === 'recognition' ? deps.sounds.profile(request.grade, request.category!, request.stage) : null;
    const items = profile?.items || (request.mode === 'numbers' ? numbers : soundItems(request.mode as Exclude<ListeningMode, 'numbers' | 'recognition'>));
    cancel(); session = create<ListeningItem>(items);
    snapshot = { request: { ...request }, profile, learner: deps.getLearner(), locale: deps.getLocale(), state: session.state,
      choices: [], target: session.current?.answer ?? null, round, ready: false, playing: false, feedback: 'prompt', persisted: true };
    prepareRound(); void listen();
  }
  function answer(value: Answer, now?: number) {
    if (!snapshot?.ready || snapshot.playing || !session || !snapshot.choices.some(choice => choice.value === value)) return;
    const verdict = session.answer(value, now);
    if (!verdict.accepted) return;
    patch({ state: session.state, feedback: verdict.correct ? 'correct' : 'wrong' });
    if (verdict.correct && snapshot.profile) { patch({ persisted: save() }); deps.reward(); }
  }
  async function compare(value: Answer) {
    if (!snapshot?.ready || snapshot.playing || snapshot.state.answered || snapshot.request.mode !== 'rhythm') return;
    const item = soundItems('rhythm').find(item => item.answer === value);
    if (!item?.events) return;
    cancel(); const token = generation;
    patch({ playing: true, feedback: 'sample' });
    try {
      await deps.player.events(item.events);
      if (token === generation) patch({ playing: false, feedback: 'compare' });
    } catch { if (token === generation) patch({ playing: false, feedback: 'sampleError' }); }
  }
  return {
    start, listen, answer, compare, stop, close,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    next() { if (session?.next()) { prepareRound(); if (session.current) void listen(); } },
    restart() { if (session) { session.restart(); patch({ persisted: true }); prepareRound(); void listen(); } },
    setLocale(locale: Locale) { if (snapshot && snapshot.locale !== locale) { stop(); patch({ locale }); } },
    setStage(stage: string) { if (snapshot?.profile) start({ ...snapshot.request, stage }); },
    dispose() { cancel(); snapshot = null; session = null; listeners.clear(); },
  };
}
export type ListeningStore = ReturnType<typeof createListeningStore>;
