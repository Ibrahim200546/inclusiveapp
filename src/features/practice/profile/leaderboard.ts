export interface LeaderboardEntry {
  name: string;
  coins: number;
  avatarUrl: string | null;
}

export interface LeaderboardConnection {
  url: string;
  apiKey: string;
  accessToken?: string;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function parseLeaderboard(data: unknown, baseUrl: string): LeaderboardEntry[] {
  if (!Array.isArray(data)) throw new Error('Invalid leaderboard response');
  return data.slice(0, 50).map(value => {
    const entry = record(value);
    const profile = record(entry.profiles);
    const coins = Number(entry.coins);
    let avatarUrl: string | null = null;
    if (typeof profile.avatar_url === 'string' && profile.avatar_url) {
      try {
        const url = new URL(profile.avatar_url, baseUrl);
        if (url.protocol === 'https:' || url.protocol === 'http:') avatarUrl = url.href;
      } catch { /* Render initials for invalid image URLs. */ }
    }
    return { name: String(profile.full_name || 'User'), coins: Number.isFinite(coins) ? coins : 0, avatarUrl };
  });
}

export async function fetchLeaderboard(connection: LeaderboardConnection, signal: AbortSignal): Promise<LeaderboardEntry[]> {
  const headers: Record<string, string> = { apikey: connection.apiKey };
  if (connection.accessToken) headers.Authorization = `Bearer ${connection.accessToken}`;
  const response = await fetch(`${connection.url.replace(/\/+$/, '')}/rest/v1/game_progress?select=coins,profiles!fk_user_id(full_name,avatar_url)&order=coins.desc&limit=50`, {
    method: 'GET', headers, signal,
  });
  if (!response.ok) throw new Error(`Leaderboard request failed (${response.status})`);
  return parseLeaderboard(await response.json(), window.location.href);
}
