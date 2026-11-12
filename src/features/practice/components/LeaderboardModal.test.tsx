import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LeaderboardModal } from './LeaderboardModal';
import { parseLeaderboard } from '../profile/leaderboard';

beforeEach(() => {
  vi.stubGlobal('INCLUSIVE_SUPABASE_URL', 'https://example.test');
  vi.stubGlobal('INCLUSIVE_SUPABASE_ANON_KEY', 'test-key');
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const response = (entries: unknown) => ({ ok: true, json: async () => entries });

it('renders untrusted names as text and rejects executable avatar URLs', async () => {
  const name = '<img src=x onerror="window.stolen=true">';
  const fetch = vi.fn().mockResolvedValue(response([{ profiles: { full_name: name, avatar_url: 'javascript:alert(1)' }, coins: 42 }]));
  vi.stubGlobal('fetch', fetch);
  const { container } = render(<LeaderboardModal locale="ru" onClose={vi.fn()} />);
  await screen.findByText(name);
  expect(container.querySelector('.lb-name img')).toBeNull();
  expect(container.querySelector('.leaderboard-item img')).toBeNull();
  expect(container.querySelector('.lb-coins')).toHaveTextContent('🪙 42');
  expect(fetch.mock.calls[0][1].headers).toEqual({ apikey: 'test-key' });
});

it('keeps HTTPS avatars as attributes and falls back to initials for broken images', async () => {
  vi.stubGlobal('getSupaAuth', () => ({ access_token: 'test-token' }));
  const fetch = vi.fn().mockResolvedValue(response([{ profiles: { full_name: 'Guest', avatar_url: 'https://example.test/photo?x=" onerror="alert(1)' }, coins: 'bad' }]));
  vi.stubGlobal('fetch', fetch);
  const { container } = render(<LeaderboardModal locale="kk" onClose={vi.fn()} />);
  await screen.findByText('Guest');
  const image = container.querySelector('img')!;
  expect(image.hasAttribute('onerror')).toBe(false);
  expect(container.querySelector('.lb-coins')).toHaveTextContent('🪙 0');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  fireEvent.error(image);
  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByText('G')).toBeInTheDocument();
});

it('aborts on close and ignores a late response after a new dialog opens', async () => {
  let resolveOld!: (value: unknown) => void;
  const fetch = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce(response([{ profiles: { full_name: 'New' }, coins: 5 }]));
  vi.stubGlobal('fetch', fetch);
  const old = render(<LeaderboardModal locale="ru" onClose={vi.fn()} />);
  const signal = fetch.mock.calls[0][1].signal as AbortSignal;
  old.unmount();
  expect(signal.aborted).toBe(true);
  render(<LeaderboardModal locale="ru" onClose={vi.fn()} />);
  await screen.findByText('New');
  await act(async () => { resolveOld(response([{ profiles: { full_name: 'Stale' }, coins: 500 }])); });
  expect(screen.queryByText('Stale')).toBeNull();
  expect(screen.getByText('New')).toBeInTheDocument();
});

it('localizes errors and empty results, retries and keeps one request during language changes', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce(response([]));
  vi.stubGlobal('fetch', fetch);
  const { rerender } = render(<LeaderboardModal locale="ru" onClose={vi.fn()} />);
  await screen.findByRole('alert');
  rerender(<LeaderboardModal locale="kk" onClose={vi.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Деректерді жүктеу мүмкін болмады.');
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Қайталау' }));
  await screen.findByText('Әлі рейтинг жоқ.');
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('handles network failures, traps focus and supports Escape and the backdrop', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const close = vi.fn();
  render(<LeaderboardModal locale="ru" onClose={close} />);
  await screen.findByRole('alert');
  const back = screen.getByRole('button', { name: '← Назад' });
  const retry = screen.getByRole('button', { name: 'Повторить' });
  expect(back).toHaveFocus();
  fireEvent.keyDown(back, { key: 'Tab', shiftKey: true });
  expect(retry).toHaveFocus();
  fireEvent.keyDown(retry, { key: 'Tab' });
  expect(back).toHaveFocus();
  fireEvent.click(screen.getByText('Лидеры'));
  expect(close).not.toHaveBeenCalled();
  fireEvent.keyDown(back, { key: 'Escape' });
  fireEvent.click(screen.getByRole('dialog'));
  expect(close).toHaveBeenCalledTimes(2);
});

it('rejects invalid payloads and tolerates missing profile records', async () => {
  expect(() => parseLeaderboard({}, 'https://example.test')).toThrow('Invalid leaderboard response');
  expect(parseLeaderboard([null, { coins: '12' }], 'https://example.test')).toEqual([
    { name: 'User', coins: 0, avatarUrl: null }, { name: 'User', coins: 12, avatarUrl: null },
  ]);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: 'invalid' })));
  render(<LeaderboardModal locale="ru" onClose={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
});
