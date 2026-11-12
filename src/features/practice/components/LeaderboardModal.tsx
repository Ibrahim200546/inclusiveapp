import { useEffect, useRef, useState } from 'react';
import { getLeaderboardConnection } from '../legacy/bridge';
import { fetchLeaderboard, type LeaderboardEntry } from '../profile/leaderboard';

const labels = {
  kk: { title: '🏆 Рейтинг', subtitle: 'Көшбасшылар', back: 'Артқа', loading: 'Жүктелуде...', empty: 'Әлі рейтинг жоқ.', error: 'Деректерді жүктеу мүмкін болмады.', retry: 'Қайталау' },
  ru: { title: '🏆 Рейтинг', subtitle: 'Лидеры', back: 'Назад', loading: 'Ожидание...', empty: 'Рейтинга пока нет.', error: 'Ошибка загрузки данных.', retry: 'Повторить' },
};
type State = { status: 'loading' | 'error' } | { status: 'ready'; entries: LeaderboardEntry[] };

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  const [failed, setFailed] = useState(false);
  return <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, fontWeight: 'bold', color: 'white', flexShrink: 0 }}>
    {entry.avatarUrl && !failed
      ? <img src={entry.avatarUrl} alt="" loading="lazy" onError={() => setFailed(true)} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
      : entry.name.charAt(0).toUpperCase()}
  </div>;
}

export function LeaderboardModal({ locale, onClose }: { locale: 'kk' | 'ru'; onClose: () => void }) {
  const text = labels[locale];
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    void (async () => {
      try {
        const entries = await fetchLeaderboard(getLeaderboardConnection(), controller.signal);
        if (!controller.signal.aborted) setState({ status: 'ready', entries });
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error' });
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);

  return <div id="leaderboardModal" className="modal active" data-react-owned="true" data-i18n-managed="true"
    role="dialog" aria-modal="true" aria-labelledby="leaderboardTitle" ref={dialog}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div className="modal-content profile-modal-content" style={{ maxWidth: 400 }}>
      <button type="button" className="profile-close-btn" onClick={onClose}>← {text.back}</button>
      <div style={{ marginTop: 30, textAlign: 'center' }}>
        <h2 id="leaderboardTitle" style={{ fontSize: 24, color: '#f3f4f6', marginBottom: 5 }}>{text.title}</h2>
        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>{text.subtitle}</p>
      </div>
      <div id="leaderboardList" className="leaderboard-list" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <div role="status" style={{ textAlign: 'center', padding: 20 }}>{text.loading}</div>}
        {state.status === 'error' && <div role="alert" style={{ textAlign: 'center' }}>{text.error} <button type="button" className="btn-secondary" onClick={() => setAttempt(value => value + 1)}>{text.retry}</button></div>}
        {state.status === 'ready' && (state.entries.length === 0
          ? <div role="status" style={{ textAlign: 'center' }}>{text.empty}</div>
          : state.entries.map((entry, index) => <div className="leaderboard-item" key={index}>
            <div className="lb-rank">{['🥇', '🥈', '🥉'][index] ?? `${index + 1}.`}</div>
            <Avatar entry={entry} />
            <div className="lb-name">{entry.name}</div>
            <div className="lb-coins">🪙 {entry.coins}</div>
          </div>))}
      </div>
    </div>
  </div>;
}
