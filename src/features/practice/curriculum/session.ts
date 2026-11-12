import type { Lesson, SessionState, StepResult } from './types';

export function identity(lesson: Lesson) {
  return [lesson.grade, lesson.table, lesson.strand, [...lesson.objectiveCodes].sort().join(',') || 'unmapped', lesson.id].join(':');
}

export function create(lesson: Lesson, resume?: Record<string, unknown>) {
  if (!lesson.steps.length || new Set(lesson.steps.map(step => step.id)).size !== lesson.steps.length) throw new Error('Invalid curriculum lesson');
  let index: number, solved: boolean, heard: boolean, attempts: number, helped: boolean, modelled: boolean;
  let order: string[], records: StepResult[], heardSources: Set<string>, responseAt: number;
  function prepare() {
    solved = false; attempts = 0; helped = false; modelled = false; responseAt = -Infinity;
    const step = lesson.steps[index]; heard = Boolean(step?.audio && heardSources.has(step.audio));
    order = step?.kind === 'order' ? [...step.initialOrder] : [];
  }
  function restart() { index = 0; records = []; heardSources = new Set(); prepare(); }
  function resolve(correct: boolean, assessment: StepResult['assessment']) {
    attempts++;
    if (correct) { solved = true; records.push({ step: lesson.steps[index].id, attempts, assessment, supportUsed: helped, modelledByTeacher: modelled }); }
    return { accepted: true, correct };
  }
  restart();
  if (resume && Array.isArray(resume.results) && resume.results.length <= lesson.steps.length && resume.results.every((record, i) =>
    record && typeof record === 'object' && record.step === lesson.steps[i].id && record.assessment === (lesson.steps[i].kind === 'teacher' ? 'teacher' : 'choice') && Number.isInteger(record.attempts) && record.attempts > 0)) {
    records = resume.results.map(record => ({ step: record.step, attempts: record.attempts, assessment: record.assessment,
      supportUsed: Boolean(record.supportUsed), modelledByTeacher: Boolean(record.modelledByTeacher) }));
    index = records.length; prepare();
    if (!resume.solved && resume.index === index && Number.isInteger(resume.attempts) && Number(resume.attempts) >= 0) attempts = Number(resume.attempts);
    helped = !resume.solved && resume.index === index && Boolean(resume.supportUsed);
    if (!resume.solved && resume.index === index && Array.isArray(resume.order) && resume.order.length === order.length && new Set(resume.order).size === order.length && resume.order.every(value => order.includes(value))) order = [...resume.order];
  }
  return {
    restart,
    get step() { return lesson.steps[index] || null; },
    get state(): SessionState { return { index, total: lesson.steps.length, complete: index === lesson.steps.length, solved, heard, attempts, supportUsed: helped, order: [...order], records: records.map(record => ({ ...record })) }; },
    hear() { const audio = lesson.steps[index]?.audio; if (!audio) return false; heard = true; heardSources.add(audio); return true; },
    model() { if (!lesson.steps[index]?.teacherModel) return false; heard = true; modelled = true; return true; },
    support() { helped = true; },
    move(from: number, to: number) {
      if (!heard || solved || lesson.steps[index]?.kind !== 'order' || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= order.length || to >= order.length) return false;
      const [value] = order.splice(from, 1); order.splice(to, 0, value); return true;
    },
    answer(value: string, now = Date.now()): { accepted: boolean; correct?: boolean } {
      const step = lesson.steps[index];
      if (!step || !heard || solved || now - responseAt < 350) return { accepted: false };
      if (step.kind === 'teacher') {
        if (value !== 'teacher-confirmed') return { accepted: false };
        responseAt = now; return resolve(true, 'teacher');
      }
      if (step.kind === 'order') {
        if (value !== 'check-order') return { accepted: false };
        responseAt = now; return resolve(order.join('|') === step.expectedOrder.join('|'), 'choice');
      }
      if (!step.options.some(option => option.value === value)) return { accepted: false };
      responseAt = now; return resolve(value === step.answer, 'choice');
    },
    next() { if (!solved || index >= lesson.steps.length) return false; index++; prepare(); return true; },
  };
}
