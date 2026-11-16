/* Local practice only. Never converts viewing or teacher observations into speech scores. */
(function () {
  'use strict';
  function context() {
    try { if (parent !== window && typeof parent.CorexTaskContext === 'function') return parent.CorexTaskContext(); } catch (_) {}
    // Same local identity source as the host; do not move a guest's history into an account.
    try {
      const auth = JSON.parse(localStorage.getItem(window.INCLUSIVE_SUPABASE_AUTH_STORAGE_KEY || 'sb-mmugalgqdapidqqxekqt-auth-token') || 'null');
      const expired = Number(auth?.expires_at) > 0 && Date.now() >= Number(auth.expires_at) * 1000;
      if (auth?.access_token && typeof auth.user?.id === 'string' && auth.user.id && !expired) return { learner: auth.user.id, section: '0-1' };
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
  // Parent authentication may change without replacing the iframe. Cancel its old session.
  setInterval(() => { if (!current()) location.reload(); }, 250);
})();
