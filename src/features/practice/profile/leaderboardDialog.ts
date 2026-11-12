// A fresh request id on every open also handles reopening an already open modal.
let request: number | null = null;
let sequence = 0;
const listeners = new Set<() => void>();
export const leaderboardDialog = {
  getSnapshot: () => request,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  open() { request = ++sequence; listeners.forEach(listener => listener()); },
  close() { request = null; listeners.forEach(listener => listener()); },
};
