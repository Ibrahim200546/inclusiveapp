import { defaultAvatar, guestAvatar, ProfileRequestError, type PracticeAuth, type ProfileApi, type ProfilePatch } from './profileApi';

export interface AiWidgetPrefs { chat: boolean; speech: boolean }
export interface ProfileSnapshot {
  userId: string | null; name: string; email: string; role: string | null;
  avatarUrl: string; coins: number; rewardVersion: number;
  loadStatus: 'loading' | 'ready' | 'error'; coinSync: 'idle' | 'saving' | 'error'; aiWidgets: AiWidgetPrefs;
}
interface Dependencies {
  api: ProfileApi; getAuth(): PracticeAuth | null; clearAuth(token?: string): void;
  initialAiPrefs?: AiWidgetPrefs; saveAiPrefs?(prefs: AiWidgetPrefs): void;
}
const defaultPrefs = { chat: true, speech: true };
export function createProfileStore(deps: Dependencies) {
  let auth = deps.getAuth();
  let prefs = deps.initialAiPrefs ?? defaultPrefs;
  function initial(): ProfileSnapshot {
    return { userId: auth?.user.id ?? null, name: auth?.user.email?.split('@')[0] || 'User', email: auth?.user.email || '', role: null,
      avatarUrl: auth ? defaultAvatar : guestAvatar, coins: 0, rewardVersion: 0, loadStatus: auth ? 'loading' : 'ready', coinSync: 'idle', aiWidgets: defaultPrefs };
  }
  let snapshot = initial();
  const listeners = new Set<() => void>();
  const controllers = new Set<AbortController>();
  let generation = 0;
  let editRevision = 0;
  let loading: Promise<void> | null = null;
  let coinsReady = !auth;
  let coinsDirty = false;
  let flushing = false;
  function update(patch: Partial<ProfileSnapshot>) { snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener()); }
  function cancel() { generation++; controllers.forEach(controller => controller.abort()); controllers.clear(); loading = null; flushing = false; }
  function syncAuth() {
    const next = deps.getAuth();
    if ((next?.user.id ?? null) !== snapshot.userId) {
      cancel(); auth = next; coinsReady = !next; coinsDirty = false; snapshot = initial();
      listeners.forEach(listener => listener());
    } else auth = next;
    return auth;
  }
  function current(token: number) { syncAuth(); return token === generation; }
  function handleUnauthorized(error: unknown, requestAuth: PracticeAuth) {
    if (error instanceof ProfileRequestError && error.status === 401) {
      deps.clearAuth(requestAuth.access_token); syncAuth();
    }
  }
  async function flushCoins() {
    const requestAuth = syncAuth();
    if (!requestAuth || !coinsReady || !coinsDirty || flushing) return;
    const token = generation;
    const controller = new AbortController(); controllers.add(controller);
    const amount = snapshot.coins;
    flushing = true; update({ coinSync: 'saving' });
    let succeeded = false;
    try {
      await deps.api.saveCoins(requestAuth, amount, controller.signal);
      if (!current(token) || controller.signal.aborted) return;
      coinsDirty = snapshot.coins !== amount;
      succeeded = true; update({ coinSync: 'idle' });
    } catch (error) {
      handleUnauthorized(error, requestAuth);
      if (current(token) && !controller.signal.aborted) update({ coinSync: 'error' });
    } finally {
      controllers.delete(controller);
      if (token === generation) { flushing = false; if (succeeded && coinsDirty) void flushCoins(); }
    }
  }
  function refresh(): Promise<void> {
    const requestAuth = syncAuth();
    if (!requestAuth) return Promise.resolve();
    if (loading) return loading;
    const token = generation;
    const controller = new AbortController(); controllers.add(controller);
    update({ loadStatus: 'loading' });
    const revision = editRevision;
    loading = (async () => {
      try {
        const data = await deps.api.load(requestAuth, controller.signal);
        if (!current(token) || controller.signal.aborted) return;
        // Rewards earned before the first response are added to the stored balance.
        // Later profile refreshes must not overwrite locally earned/pending coins.
        const coins = coinsReady ? snapshot.coins : data.coins + snapshot.coins;
        coinsReady = true;
        update({ ...(revision === editRevision ? { name: data.name, avatarUrl: data.avatarUrl } : {}), role: data.role,
          coins, loadStatus: 'ready', aiWidgets: data.role === 'admin' ? prefs : defaultPrefs });
        void flushCoins();
      } catch (error) {
        handleUnauthorized(error, requestAuth);
        if (current(token) && !controller.signal.aborted) update({ loadStatus: 'error' });
      } finally {
        controllers.delete(controller);
        if (token === generation) loading = null;
      }
    })();
    return loading;
  }
  async function save(patch: ProfilePatch, signal: AbortSignal) {
    const requestAuth = syncAuth();
    if (!requestAuth || snapshot.loadStatus !== 'ready') throw new Error('Profile is not ready');
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const token = generation;
    const controller = new AbortController(); controllers.add(controller);
    const abort = () => controller.abort(); signal.addEventListener('abort', abort, { once: true });
    try {
      await deps.api.save(requestAuth, patch, controller.signal);
      if (!current(token) || controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      editRevision++;
      update({ ...(patch.full_name !== undefined ? { name: patch.full_name } : {}), ...(patch.avatar_url !== undefined ? { avatarUrl: patch.avatar_url } : {}) });
    } catch (error) { handleUnauthorized(error, requestAuth); throw error; }
    finally { signal.removeEventListener('abort', abort); controllers.delete(controller); }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh,
    addCoins(amount: number) {
      syncAuth();
      if (!Number.isFinite(amount)) return;
      coinsDirty = Boolean(auth);
      update({ coins: snapshot.coins + amount, rewardVersion: snapshot.rewardVersion + 1 });
      if (auth && !coinsReady) void refresh(); else void flushCoins();
    },
    retryCoins: flushCoins,
    saveName(name: string, signal: AbortSignal) {
      const trimmed = name.trim();
      if (!trimmed) return Promise.reject(new Error('Name is required'));
      return save({ full_name: trimmed }, signal);
    },
    saveAvatar: (avatarUrl: string, signal: AbortSignal) => save({ avatar_url: avatarUrl }, signal),
    setAiWidgets(kind: 'chat' | 'speech' | 'all', visible: boolean) {
      syncAuth(); if (snapshot.role !== 'admin') return;
      prefs = kind === 'all' ? { chat: visible, speech: visible } : { ...prefs, [kind]: visible };
      deps.saveAiPrefs?.(prefs); update({ aiWidgets: prefs });
    },
    logout() { deps.clearAuth(); syncAuth(); },
    dispose: cancel,
  };
}
export type ProfileStore = ReturnType<typeof createProfileStore>;
