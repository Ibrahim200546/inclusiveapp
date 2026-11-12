import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { closePracticeProfile, openPracticeLeaderboard, setPracticeLocale } from '../legacy/bridge';
import { profileStore } from '../profile/profileRuntime';
import { readAvatar } from '../profile/readAvatar';
import { ThemeSwitch } from './ThemeSwitch';
import { usePracticeTheme } from '../hooks/usePracticeTheme';

const labels = {
  kk: {
    profile: 'Профиль', close: 'Жабу', guest: 'Қонақ', optional: 'Кіру міндетті емес',
    notice: 'Кіру міндетті емес. Қонақ режимінде аты, аватар және монеталар сақталмайды.',
    login: 'Кіру', logout: 'Шығу', coins: 'Монеталар', rating: 'Рейтинг', theme: 'Тақырып', language: 'Тіл',
    edit: 'Атын өзгерту', photo: 'Фотоны өзгерту', prompt: 'Атыңызды енгізіңіз:',
    loading: 'Жүктелуде...', loadError: 'Профильді жүктеу мүмкін болмады.', retry: 'Қайталау',
    saving: 'Сақталуда...', saveError: 'Өзгерістер сақталмады. Қайта көріңіз.',
    coinError: 'Монеталар серверде сақталмады.', imageSize: 'Фото өлшемі 2 МБ-тан аспауы керек.', imageType: 'Сурет файлын таңдаңыз.',
    admin: 'Админ: ЖИ батырмалары', chat: 'ЖИ-Логопед', speech: 'ЖИ Сөйлеуді бағалау', all: 'ЖИ',
  },
  ru: {
    profile: 'Профиль', close: 'Закрыть', guest: 'Гость', optional: 'Вход необязателен',
    notice: 'Вход необязателен. В гостевом режиме имя, аватар и монеты не сохраняются.',
    login: 'Войти', logout: 'Выйти', coins: 'Монеты', rating: 'Рейтинг', theme: 'Тема', language: 'Язык',
    edit: 'Изменить имя', photo: 'Изменить фото', prompt: 'Введите ваше имя:',
    loading: 'Загрузка...', loadError: 'Не удалось загрузить профиль.', retry: 'Повторить',
    saving: 'Сохранение...', saveError: 'Изменения не сохранены. Попробуйте ещё раз.',
    coinError: 'Монеты не сохранены на сервере.', imageSize: 'Размер фото не должен превышать 2 МБ.', imageType: 'Выберите файл изображения.',
    admin: 'Админ: кнопки ИИ', chat: 'ИИ-Логопед', speech: 'ИИ Оценка речи', all: 'ИИ',
  },
};

export function ProfileModal({ locale, active }: { locale: 'kk' | 'ru'; active: boolean }) {
  const profile = useSyncExternalStore(profileStore.subscribe, profileStore.getSnapshot);
  const { dark, changeTheme } = usePracticeTheme();
  const text = labels[locale];
  const guest = profile.userId === null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<'saveError' | 'imageSize' | 'imageType' | null>(null);
  const operations = useRef(new Set<AbortController>());
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const allToggle = useRef<HTMLInputElement>(null);
  const editable = !guest && !saving && profile.loadStatus === 'ready';

  useEffect(() => {
    if (allToggle.current) allToggle.current.indeterminate = profile.aiWidgets.chat !== profile.aiWidgets.speech;
  }, [profile.aiWidgets]);
  useEffect(() => {
    setSaving(false); setError(null);
    if (!active) return;
    const pending = operations.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('.profile-close-btn')?.focus();
    return () => {
      pending.forEach(controller => controller.abort()); pending.clear();
      if (previous?.isConnected) previous.focus();
    };
  }, [active, profile.userId]);

  async function runSave(work: (signal: AbortSignal) => Promise<void>) {
    if (!editable || !active) return;
    const controller = new AbortController(); operations.current.add(controller);
    setSaving(true); setError(null);
    try { await work(controller.signal); }
    catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error && failure.message === 'image-size' ? 'imageSize'
        : failure instanceof Error && failure.message === 'image-type' ? 'imageType' : 'saveError');
    } finally {
      operations.current.delete(controller);
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return <div id="profileModal" className={`modal${active ? ' active' : ''}`} data-react-owned="true" data-i18n-managed="true"
    role={active ? 'dialog' : undefined} aria-modal={active ? true : undefined} aria-hidden={!active} aria-label={text.profile} ref={dialog}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); closePracticeProfile(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([type="file"])'))
        .filter(control => !control.closest('[hidden]'));
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div className="modal-content profile-modal-content">
      <button type="button" className="profile-close-btn" aria-label={text.close} onClick={closePracticeProfile}>×</button>
      <div className="profile-header">
        <button type="button" className={`profile-photo-wrapper${guest ? ' profile-control-disabled' : ''}`} id="profilePhotoWrapper"
          disabled={!editable} onClick={() => fileInput.current?.click()} aria-label={text.photo}>
          <img src={profile.avatarUrl} id="modalProfileImg" alt="" />
          <span className="profile-photo-overlay">📷</span>
        </button>
        <input type="file" id="profileImageInput" accept="image/*" hidden ref={fileInput} disabled={!editable}
          onChange={event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (file) void runSave(async signal => { const image = await readAvatar(file, signal); await profileStore.saveAvatar(image, signal); });
          }} />
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span id="profileNameDisplay">{guest ? text.guest : profile.name}</span>
          <button type="button" className="name-edit-icon" id="profileNameEditIcon" hidden={guest} disabled={!editable} aria-label={text.edit}
            onClick={() => {
              const name = window.prompt(text.prompt, profile.name);
              if (name?.trim()) void runSave(signal => profileStore.saveName(name, signal));
            }}>✏️</button>
        </h2>
        <p className="profile-email" id="profileEmailDisplay">{guest ? text.optional : profile.email}</p>
        <div className="profile-level">LEVEL 1</div>
      </div>
      <div className="profile-stats-grid"><div className="profile-stat-box">
        <span className="stat-icon">🪙</span><span className="stat-value" id="profileModalCoinCount">{profile.coins}</span><span className="stat-label">{text.coins}</span>
      </div></div>
      <div className="profile-actions">
        {profile.loadStatus === 'loading' && <div role="status">{text.loading}</div>}
        {profile.loadStatus === 'error' && <div role="alert">{text.loadError} <button type="button" className="btn-secondary" onClick={() => void profileStore.refresh()}>{text.retry}</button></div>}
        {saving && <div role="status">{text.saving}</div>}
        {error && <div role="alert">{text[error]}</div>}
        {profile.coinSync === 'error' && <div role="alert">{text.coinError} <button type="button" className="btn-secondary" onClick={() => void profileStore.retryCoins()}>{text.retry}</button></div>}
        <div id="profileGuestNotice" className="profile-guest-notice" hidden={!guest}>{text.notice}</div>
        <button type="button" id="profileLoginBtn" className="profile-login-btn" hidden={!guest} onClick={() => { window.location.href = '/login'; }}>🔐 {text.login}</button>
        <button type="button" className="profile-action-row" onClick={openPracticeLeaderboard}><span>🏆 {text.rating}</span><span style={{ opacity: 0.5 }}>▶</span></button>
        <div className="profile-action-row"><span>{text.theme}</span><ThemeSwitch id="profile_theme_toggle_input" dark={dark} onChange={changeTheme} locale={locale} /></div>
        <div className="profile-action-row"><span>{text.language}</span><div className="profile-lang-switch">
          {(['kk', 'ru'] as const).map(lang => <button key={lang} type="button" className={`profile-lang-btn${locale === lang ? ' active' : ''}`} id={`lang-btn-${lang}`} data-lang={lang}
            aria-pressed={locale === lang} onClick={() => setPracticeLocale(lang)}>{lang === 'kk' ? 'ҚАЗ' : 'РУС'}</button>)}
        </div></div>
        <div id="profileAdminAiControls" className="profile-admin-controls" hidden={profile.role !== 'admin'}>
          <div className="profile-admin-title">{text.admin}</div>
          {(['chat', 'speech', 'all'] as const).map(kind => <div key={kind} className="profile-action-row profile-admin-row"><span>{text[kind]}</span>
            <label className="profile-mini-switch"><input type="checkbox" id={`admin_ai_${kind}_toggle`} aria-label={text[kind]} ref={kind === 'all' ? allToggle : undefined}
              checked={kind === 'all' ? profile.aiWidgets.chat && profile.aiWidgets.speech : profile.aiWidgets[kind]}
              onChange={event => profileStore.setAiWidgets(kind, event.target.checked)} /><span /></label>
          </div>)}
        </div>
        <button type="button" id="profileLogoutBtn" className="profile-logout-btn" hidden={guest} onClick={() => { profileStore.logout(); window.location.href = '/'; }}>🚪 {text.logout}</button>
      </div>
    </div>
  </div>;
}
