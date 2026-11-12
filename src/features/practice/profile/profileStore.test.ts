import { describe, expect, it, vi } from 'vitest';
import { createProfileStore } from './profileStore';
import { ProfileRequestError, type PracticeAuth, type ProfileData } from './profileApi';

const user: PracticeAuth = { access_token: 'token-a', user: { id: 'a', email: 'a@example.test' } };
const data: ProfileData = { name: 'Alice', avatarUrl: '/alice.png', role: 'student', coins: 100 };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(initial: PracticeAuth | null = user) {
  let auth = initial;
  const api = { load: vi.fn().mockResolvedValue(data), save: vi.fn().mockResolvedValue(undefined), saveCoins: vi.fn().mockResolvedValue(undefined) };
  const store = createProfileStore({ api, getAuth: () => auth, clearAuth: token => { if (!token || token === auth?.access_token) auth = null; } });
  return { api, store, setAuth: (next: PracticeAuth | null) => { auth = next; } };
}

describe('profile and coin state', () => {
  it('keeps guest rewards local and prevents profile writes', async () => {
    const { store, api } = setup(null);
    await store.refresh(); store.addCoins(10); store.addCoins(5);
    expect(store.getSnapshot()).toMatchObject({ userId: null, coins: 15, rewardVersion: 2 });
    expect(api.load).not.toHaveBeenCalled(); expect(api.saveCoins).not.toHaveBeenCalled();
    await expect(store.saveName('Name', new AbortController().signal)).rejects.toThrow('Profile is not ready');
    expect(api.save).not.toHaveBeenCalled();
  });

  it('merges rewards earned during initial loading and serializes later coin writes', async () => {
    const { store, api } = setup();
    const load = deferred<ProfileData>(); const firstWrite = deferred<void>();
    api.load.mockReturnValueOnce(load.promise); api.saveCoins.mockReturnValueOnce(firstWrite.promise);
    const pending = store.refresh(); store.addCoins(10);
    expect(api.load).toHaveBeenCalledTimes(1); expect(api.saveCoins).not.toHaveBeenCalled();
    load.resolve(data); await pending;
    expect(store.getSnapshot().coins).toBe(110);
    expect(api.saveCoins.mock.calls[0][1]).toBe(110);
    store.addCoins(5); store.addCoins(10);
    expect(api.saveCoins).toHaveBeenCalledTimes(1);
    firstWrite.resolve(); await vi.waitFor(() => expect(api.saveCoins).toHaveBeenCalledTimes(2));
    expect(api.saveCoins.mock.calls[1][1]).toBe(125);
    await store.refresh();
    expect(store.getSnapshot().coins).toBe(125);
  });

  it('keeps unsaved rewards on a network failure and retries without duplicate rewards', async () => {
    const { store, api } = setup(); await store.refresh();
    api.saveCoins.mockRejectedValueOnce(new Error('offline'));
    store.addCoins(10);
    await vi.waitFor(() => expect(store.getSnapshot().coinSync).toBe('error'));
    expect(store.getSnapshot().coins).toBe(110);
    await store.retryCoins();
    expect(store.getSnapshot()).toMatchObject({ coins: 110, rewardVersion: 1, coinSync: 'idle' });
    expect(api.saveCoins.mock.calls.map(call => call[1])).toEqual([110, 110]);
  });

  it('does not write a zero-based balance when the initial load fails', async () => {
    const { store, api } = setup(); api.load.mockRejectedValueOnce(new Error('offline'));
    await store.refresh(); expect(store.getSnapshot().loadStatus).toBe('error');
    store.addCoins(10);
    await vi.waitFor(() => expect(store.getSnapshot().coins).toBe(110));
    expect(api.saveCoins.mock.calls.map(call => call[1])).toEqual([110]);
  });

  it('commits edits only after success and ignores an aborted late save', async () => {
    const { store, api } = setup(); await store.refresh();
    api.save.mockRejectedValueOnce(new Error('offline'));
    await expect(store.saveName('Bad', new AbortController().signal)).rejects.toThrow('offline');
    expect(store.getSnapshot().name).toBe('Alice');
    await store.saveName('  New Name  ', new AbortController().signal);
    expect(store.getSnapshot().name).toBe('New Name');
    const late = deferred<void>(); api.save.mockReturnValueOnce(late.promise);
    const controller = new AbortController();
    const pending = store.saveAvatar('/late.png', controller.signal);
    controller.abort(); late.resolve();
    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    expect(store.getSnapshot().avatarUrl).toBe('/alice.png');
    expect(api.save.mock.calls[2][2].aborted).toBe(true);
  });

  it('discards an old account response and cancels its requests', async () => {
    const { store, api, setAuth } = setup();
    const old = deferred<ProfileData>(); api.load.mockReturnValueOnce(old.promise);
    const pending = store.refresh();
    setAuth({ access_token: 'token-b', user: { id: 'b' } });
    api.load.mockResolvedValueOnce({ ...data, name: 'Bob', coins: 20 });
    await store.refresh(); old.resolve(data); await pending;
    expect(store.getSnapshot()).toMatchObject({ userId: 'b', name: 'Bob', coins: 20 });
    expect(api.load.mock.calls[0][1].aborted).toBe(true);
    store.logout(); expect(store.getSnapshot()).toMatchObject({ userId: null, coins: 0, role: null });
  });

  it('does not let a concurrent refresh overwrite a just-saved name', async () => {
    const { store, api } = setup(); await store.refresh();
    const save = deferred<void>(); const load = deferred<ProfileData>();
    api.save.mockReturnValueOnce(save.promise); api.load.mockReturnValueOnce(load.promise);
    const editing = store.saveName('New Name', new AbortController().signal);
    const refreshing = store.refresh();
    save.resolve(); await editing;
    load.resolve(data); await refreshing;
    expect(store.getSnapshot().name).toBe('New Name');
  });

  it('falls back to guest on unauthorized responses and restricts admin preferences', async () => {
    const { store, api } = setup(); api.load.mockResolvedValueOnce({ ...data, role: 'admin' });
    await store.refresh(); store.setAiWidgets('chat', false);
    expect(store.getSnapshot().aiWidgets).toEqual({ chat: false, speech: true });
    api.save.mockRejectedValueOnce(new ProfileRequestError(401));
    await expect(store.saveName('Name', new AbortController().signal)).rejects.toThrow();
    expect(store.getSnapshot()).toMatchObject({ userId: null, role: null, aiWidgets: { chat: true, speech: true } });
    store.setAiWidgets('all', false);
    expect(store.getSnapshot().aiWidgets).toEqual({ chat: true, speech: true });
  });
});
