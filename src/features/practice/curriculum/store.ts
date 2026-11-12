import { shuffle } from '../learning/session';
import type { Locale } from '../learning/content';
import { create, identity } from './session';
import type { Category, Choice, Lesson, Participation, SavedProgress, SessionState, Step } from './types';
import type { CurriculumProgress } from './progress';
import type { CurriculumPlayback } from './playback';

export type Feedback = 'prompt' | 'listening' | 'choose' | 'correct' | 'wrong' | 'model' | 'error' | 'interrupted' | 'stopped';
export interface PracticeSnapshot {
  lesson: Lesson; state: SessionState; step: Step | null; choices: Choice[]; learner: string | null; returnTo: string;
  active: boolean; playing: boolean; paused: boolean; feedback: Feedback; persisted: boolean;
  participation: Participation; breathSyllable: string; round: number; pairBase: Lesson | null; pairKey: number;
}
export interface CurriculumSnapshot {
  locale: Locale; learner: string | null;
  catalog: { grade: number; category: Category; page: number; parent: string };
  progress: Record<string, SavedProgress>; practice: PracticeSnapshot | null;
}
interface Dependencies {
  lessons: Lesson[]; player: CurriculumPlayback; progress: CurriculumProgress;
  getLocale(): Locale; getLearner(): string | null; navigate(id: string): void; reward(): void;
}

export function createCurriculumStore(deps: Dependencies) {
  let snapshot: CurriculumSnapshot = { locale: deps.getLocale(), learner: deps.getLearner(),
    catalog: { grade: 0, category: 'comprehension', page: 0, parent: 'grade0Menu' },
    progress: deps.progress.read(deps.getLearner()), practice: null };
  let session: ReturnType<typeof create> | null = null;
  let generation = 0, round = 0, pairKey = 0, rewarded = false;
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach(listener => listener());
  function patch(changes: Partial<PracticeSnapshot>) {
    if (!snapshot.practice) return;
    snapshot = { ...snapshot, practice: { ...snapshot.practice, ...changes } }; publish();
  }
  function cancel() { generation++; deps.player.stop(); }
  function active() { return session && snapshot.practice?.active && snapshot.practice.learner === deps.getLearner(); }
  function save() {
    const p = snapshot.practice;
    if (!p || !session || p.learner !== deps.getLearner()) return false;
    return deps.progress.save(p.learner, p.lesson, session.state, p.participation);
  }
  function refreshProgress() { snapshot = { ...snapshot, progress: deps.progress.read(snapshot.learner) }; publish(); }
  function stop() { cancel(); patch({ playing: false, paused: false, feedback: 'stopped' }); }
  function leave() { cancel(); patch({ active: false, playing: false, paused: false }); }
  function prepare() {
    cancel();
    const step = session!.step;
    snapshot = { ...snapshot, practice: { ...snapshot.practice!, state: session!.state, step,
      choices: step?.kind === 'choice' ? shuffle(step.options) : [], round: ++round,
      playing: false, paused: false, feedback: 'prompt' } };
    if (session!.state.complete) {
      snapshot.practice!.persisted = save();
      if (!rewarded) { rewarded = true; deps.reward(); }
      snapshot = { ...snapshot, progress: deps.progress.read(snapshot.learner) };
    }
    publish();
  }
  function begin(lesson: Lesson, returnTo: string, pairBase: Lesson | null, toolsKey: number) {
    cancel();
    const learner = deps.getLearner(), prior = deps.progress.read(learner)[identity(lesson)];
    session = create(lesson, prior?.completed ? undefined : prior as unknown as Record<string, unknown>);
    rewarded = false;
    snapshot = { ...snapshot, learner, practice: { lesson, learner, returnTo, pairBase, pairKey: toolsKey,
      state: session.state, step: session.step, choices: [], active: true, playing: false, paused: false,
      feedback: 'prompt', persisted: true, participation: prior?.participation === 'independent' ? 'independent' : 'together', breathSyllable: 'та', round } };
    prepare();
  }
  function openLesson(lesson: Lesson, returnTo = 'curriculumCatalog') {
    deps.navigate('curriculumPractice');
    begin(lesson, returnTo, /^pair-\d+$/.test(lesson.id) ? lesson : null, ++pairKey);
  }
  function setCatalog(changes: Partial<CurriculumSnapshot['catalog']>) {
    const catalog = { ...snapshot.catalog, ...changes };
    const available = deps.lessons.filter(lesson => lesson.grade === catalog.grade);
    if (!available.some(lesson => lesson.category === catalog.category)) catalog.category = available[0]?.category || 'comprehension';
    catalog.page = Math.max(0, Math.min(catalog.page, Math.ceil(available.filter(lesson => lesson.category === catalog.category).length / 4) - 1));
    snapshot = { ...snapshot, catalog }; publish();
  }
  async function play(path: string | undefined, model = false) {
    if (!active() || !path) return;
    cancel(); const token = generation, current = session!;
    patch({ playing: true, paused: false, feedback: 'listening' });
    const result = await deps.player.play(path).catch(() => 'error' as const);
    if (token !== generation || !active()) return;
    if (result === 'ended' && model) current.hear();
    patch({ state: current.state, playing: false, paused: false,
      feedback: result === 'ended' ? current.state.solved ? 'correct' : 'choose' : result === 'error' ? 'error' : 'interrupted' });
  }
  return {
    lessons: deps.lessons, openLesson, leave, stop, refreshProgress,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    openCatalog(grade: number, parent = 'grade0Menu') {
      deps.navigate('curriculumCatalog'); setCatalog({ grade, parent, page: 0 }); refreshProgress();
    },
    selectGrade: (grade: number) => setCatalog({ grade, page: 0 }),
    selectCategory: (category: Category) => setCatalog({ category, page: 0 }),
    selectPage: (page: number) => setCatalog({ page }),
    back() { const to = snapshot.practice?.returnTo; if (to) deps.navigate(to); },
    listen: () => play(session?.step?.audio, true),
    question: () => play(session?.step?.questionAudio),
    sample: (path: string) => play(path),
    togglePause() {
      if (!active() || !snapshot.practice!.playing) return;
      const paused = !snapshot.practice!.paused;
      patch({ paused }); if (paused) deps.player.pause(); else deps.player.resume();
    },
    answer(value: string, now?: number) {
      if (!active() || snapshot.practice!.playing) return;
      const verdict = session!.answer(value, now); if (!verdict.accepted) return;
      patch({ state: session!.state, feedback: verdict.correct ? 'correct' : 'wrong', persisted: save() });
    },
    model() {
      if (!active() || snapshot.practice!.playing || session!.state.heard || !session!.model()) return;
      patch({ state: session!.state, feedback: 'model' });
    },
    support() { if (active()) { session!.support(); patch({ state: session!.state, persisted: save() }); } },
    move(from: number, to: number) {
      if (!active() || snapshot.practice!.playing || !session!.move(from, to)) return;
      patch({ state: session!.state, persisted: save() });
    },
    setParticipation(participation: Participation) { if (active()) { patch({ participation }); patch({ persisted: save() }); } },
    setSyllable(breathSyllable: string) { if (active() && !session!.state.heard && !session!.state.solved) patch({ breathSyllable }); },
    next() {
      if (!active() || snapshot.practice!.playing || !session!.next()) return;
      patch({ persisted: save() }); prepare();
    },
    restart() {
      if (!active()) return;
      session!.restart(); rewarded = false; patch({ persisted: save() }); prepare();
    },
    startPair(base: Lesson, level: string, mode: 'choice' | 'repeat') {
      if (!active() || base.grade !== snapshot.practice!.lesson.grade) return;
      const variant: Lesson = { ...base, id: [base.id, level, mode].join('/'), pairVariant: true };
      const available = base.steps.filter(step => step.id.startsWith(level + '-'));
      if (!available.length) return;
      const previous = deps.progress.read(snapshot.learner)[identity(variant)];
      const sequence = !previous?.completed && previous?.sequence;
      const ordered = Array.isArray(sequence) && sequence.length === available.length && new Set(sequence).size === available.length && available.every(step => sequence.includes(step.id))
        ? sequence.map(id => available.find(step => step.id === id)!) : shuffle(available);
      variant.steps = mode === 'repeat' ? ordered.map(step => ({ ...step, kind: 'teacher', prompt: 'Тыңдап, дауыстап қайталаңыз.', display: step.stimulus })) : ordered;
      begin(variant, snapshot.practice!.returnTo, snapshot.practice!.pairBase, snapshot.practice!.pairKey);
    },
    setLocale(locale: Locale) {
      if (locale === snapshot.locale) return;
      cancel(); snapshot = { ...snapshot, locale };
      if (snapshot.practice) patch({ playing: false, paused: false, feedback: snapshot.practice.state.solved ? 'correct' : 'prompt' }); else publish();
    },
    changeLearner() {
      const learner = deps.getLearner(); if (learner === snapshot.learner) return;
      const wasActive = snapshot.practice?.active;
      cancel(); session = null; snapshot = { ...snapshot, learner, practice: null, progress: deps.progress.read(learner) }; publish();
      if (wasActive) deps.navigate('curriculumCatalog');
    },
    dispose() { cancel(); session = null; snapshot = { ...snapshot, practice: null }; listeners.clear(); },
  };
}
export type CurriculumStore = ReturnType<typeof createCurriculumStore>;
