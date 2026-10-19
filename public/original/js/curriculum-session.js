(function (root) {
  'use strict';
  function identity(lesson) { return [lesson.grade, lesson.table, lesson.strand, [...lesson.objectiveCodes].sort().join(',') || 'unmapped', lesson.id].join(':'); }
  function create(lesson, resume) {
    if (!lesson.steps.length || new Set(lesson.steps.map(s => s.id)).size !== lesson.steps.length) throw new Error('Invalid curriculum lesson');
    let index, solved, heard, attempts, helped, modelled, order, records, heardSources, responseAt;
    function prepare() {
      solved = false; attempts = 0; helped = false; modelled = false; responseAt = -Infinity;
      const step = lesson.steps[index]; heard = Boolean(step?.audio && heardSources.has(step.audio));
      order = step?.initialOrder ? [...step.initialOrder] : [];
    }
    function restart() { index = 0; records = []; heardSources = new Set(); prepare(); }
    function resolve(correct, assessment) {
      attempts++;
      if (correct) { solved = true; records.push({ step: lesson.steps[index].id, attempts, assessment, supportUsed: helped, modelledByTeacher: modelled }); }
      return { accepted: true, correct };
    }
    restart();
    if (resume && Array.isArray(resume.results) && resume.results.length <= lesson.steps.length && resume.results.every((record, i) => record && typeof record === 'object' && record.step === lesson.steps[i].id && record.assessment === (lesson.steps[i].kind === 'teacher' ? 'teacher' : 'choice') && Number.isInteger(record.attempts) && record.attempts > 0)) {
      records = resume.results.map(record => ({ ...record })); index = records.length; prepare();
      if (!resume.solved && resume.index === index && Number.isInteger(resume.attempts) && resume.attempts >= 0) attempts = resume.attempts;
      helped = !resume.solved && resume.index === index && Boolean(resume.supportUsed);
      if (!resume.solved && resume.index === index && Array.isArray(resume.order) && resume.order.length === order.length && new Set(resume.order).size === order.length && resume.order.every(value => order.includes(value))) order = [...resume.order];
    }
    return {
      restart,
      get step() { return lesson.steps[index] || null; },
      get state() { return { index, total: lesson.steps.length, complete: index === lesson.steps.length, solved, heard, attempts, supportUsed: helped, order: [...order], records: records.map(r => ({ ...r })) }; },
      hear() { if (!lesson.steps[index]?.audio) return false; heard = true; heardSources.add(lesson.steps[index].audio); return true; },
      model() { if (!lesson.steps[index]?.teacherModel) return false; heard = true; modelled = true; return true; },
      support() { helped = true; },
      move(from, to) {
        if (!heard || solved || lesson.steps[index]?.kind !== 'order' || from < 0 || to < 0 || from >= order.length || to >= order.length) return false;
        const [value] = order.splice(from, 1); order.splice(to, 0, value); return true;
      },
      answer(value, now = Date.now()) {
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
  root.CorexCurriculum = { create, identity };
})(window);
