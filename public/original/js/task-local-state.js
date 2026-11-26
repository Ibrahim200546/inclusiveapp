/* Local practice only. Never converts viewing or teacher observations into speech scores. */
(function () {
  'use strict';
  const gradeScope = document.currentScript?.dataset.scope === 'grade';
  function context() {
    try {
      if (parent !== window && typeof parent.CorexTaskContext === 'function') {
        const host = parent.CorexTaskContext();
        const grade = parent.CorexGrades?.current;
        if (gradeScope && Number.isInteger(grade) && grade >= 0 && grade <= 4) {
          return { ...host, section: String(grade), grade };
        }
        return host;
      }
    } catch (_) {}
    return { learner: 'guest', section: '0-1' };
  }
  const initial = context();
  const signature = value => JSON.stringify([value.learner, value.section]);
  const current = () => signature(context()) === signature(initial);
  window.CorexTaskState = {
    context: initial,
    current,
    load(task) {
      try { const value = JSON.parse(localStorage.getItem(this.key(task)) || 'null'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch (_) { return {}; }
    },
    key(task) { return 'eduCorex.task.v1:' + JSON.stringify([initial.learner, initial.section, task]); },
    save(task, value) {
      if (!current()) { location.reload(); return false; }
      try { localStorage.setItem(this.key(task), JSON.stringify({ ...value, context: initial, updatedAt: new Date().toISOString() })); return true; } catch (_) { return false; }
    }
  };
  // Parent class or local exercise context may change without replacing the iframe.
  setInterval(() => { if (!current()) location.reload(); }, 250);
})();
