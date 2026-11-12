export interface PracticeAuth { access_token: string; user: { id: string; email?: string }; expires_at?: number }
export interface ProfileData { name: string; avatarUrl: string; role: string | null; coins: number }
export interface ProfilePatch { full_name?: string; avatar_url?: string }
export interface ProfileApi {
  load(auth: PracticeAuth, signal: AbortSignal): Promise<ProfileData>;
  save(auth: PracticeAuth, patch: ProfilePatch, signal: AbortSignal): Promise<void>;
  saveCoins(auth: PracticeAuth, coins: number, signal: AbortSignal): Promise<void>;
}

type RuntimeWindow = Window & {
  INCLUSIVE_SUPABASE_URL?: string; INCLUSIVE_SUPABASE_ANON_KEY?: string; INCLUSIVE_SUPABASE_AUTH_STORAGE_KEY?: string;
};
export const guestAvatar = 'https://ui-avatars.com/api/?name=G&background=667eea&color=fff&rounded=true';
export const defaultAvatar = 'https://ui-avatars.com/api/?name=U&background=667eea&color=fff&rounded=true';
export function authStorageKey() {
  return (window as RuntimeWindow).INCLUSIVE_SUPABASE_AUTH_STORAGE_KEY || 'sb-mmugalgqdapidqqxekqt-auth-token';
}
export function readPracticeAuth(): PracticeAuth | null {
  try {
    const value = JSON.parse(localStorage.getItem(authStorageKey()) || 'null');
    if (typeof value?.access_token !== 'string' || !value.access_token || typeof value?.user?.id !== 'string' || !value.user.id) return null;
    if (Number(value.expires_at) > 0 && Date.now() >= Number(value.expires_at) * 1000) {
      localStorage.removeItem(authStorageKey());
      return null;
    }
    return { access_token: value.access_token, user: { id: value.user.id, email: typeof value.user.email === 'string' ? value.user.email : '' } };
  } catch { return null; }
}
export function clearPracticeAuth(token?: string) {
  if (!token || readPracticeAuth()?.access_token === token) localStorage.removeItem(authStorageKey());
}
export class ProfileRequestError extends Error {
  constructor(public status: number) { super(`Profile request failed (${status})`); }
}
export function safeProfileAvatar(value: unknown): string {
  if (typeof value !== 'string' || !value) return defaultAvatar;
  if (/^data:image\/(?:png|jpeg|jpg|gif|webp|bmp|avif|svg\+xml);base64,/i.test(value)) return value;
  try {
    const url = new URL(value, window.location.href);
    if (['https:', 'http:'].includes(url.protocol)) return url.href;
  } catch { /* Use the default avatar. */ }
  return defaultAvatar;
}
async function request(auth: PracticeAuth, path: string, signal: AbortSignal, body?: object) {
  const app = window as RuntimeWindow;
  if (!app.INCLUSIVE_SUPABASE_URL || !app.INCLUSIVE_SUPABASE_ANON_KEY) throw new Error('Practice API configuration is missing');
  const response = await fetch(`${app.INCLUSIVE_SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${path}`, {
    method: body ? 'POST' : 'GET', signal,
    headers: { apikey: app.INCLUSIVE_SUPABASE_ANON_KEY, Authorization: `Bearer ${auth.access_token}`,
      ...(body ? { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new ProfileRequestError(response.status);
  return response;
}
export const profileApi: ProfileApi = {
  async load(auth, signal) {
    const id = encodeURIComponent(auth.user.id);
    const [profileResponse, progressResponse] = await Promise.all([
      request(auth, `profiles?id=eq.${id}&select=full_name,avatar_url,role`, signal),
      request(auth, `game_progress?user_id=eq.${id}&select=coins`, signal),
    ]);
    const [profiles, progress] = await Promise.all([profileResponse.json(), progressResponse.json()]);
    if (!Array.isArray(profiles) || !Array.isArray(progress)) throw new Error('Invalid profile response');
    const coins = Number(progress[0]?.coins || 0);
    return {
      name: typeof profiles[0]?.full_name === 'string' && profiles[0].full_name ? profiles[0].full_name : auth.user.email?.split('@')[0] || 'User',
      avatarUrl: safeProfileAvatar(profiles[0]?.avatar_url),
      role: typeof profiles[0]?.role === 'string' ? profiles[0].role : null,
      coins: Number.isFinite(coins) ? coins : 0,
    };
  },
  async save(auth, patch, signal) { await request(auth, 'profiles?on_conflict=id', signal, { id: auth.user.id, ...patch }); },
  async saveCoins(auth, coins, signal) { await request(auth, 'game_progress?on_conflict=user_id', signal, { user_id: auth.user.id, coins }); },
};
