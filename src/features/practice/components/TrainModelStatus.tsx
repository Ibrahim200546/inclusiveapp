import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '../learning/content';
import type { TrainModel } from '../train/model';
import '../train/modelStatus.css';

export function TrainModelStatus({ model, locale }: { model: TrainModel; locale: Locale }) {
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot), [dismissed, setDismissed] = useState(false);
  useEffect(() => { void model.preload().catch(() => {}); }, [model]);
  useEffect(() => {
    setDismissed(false);
    if (state.status === 'ready') { const timer = setTimeout(() => setDismissed(true), 3500); return () => clearTimeout(timer); }
  }, [state.status, locale]);
  const kk = locale === 'kk', ready = state.status === 'ready', failed = state.status === 'error';
  const label = ready ? kk ? '✓ Дыбыс дайын' : '✓ Голос готов' : failed ? kk ? 'Дыбыс дайын емес' : 'Голос не готов' : kk ? 'Дыбыс дайындалуда' : 'Подготовка голоса';
  return createPortal(<aside id="trainModelStatus" className="train-model-status" data-state={state.status} hidden={ready && dismissed} data-react-owned="true" data-i18n-managed="true">
    <span role="status" aria-live="polite">{label}</span><span aria-hidden="true">{!ready && !failed ? `${Math.round(state.progress)}%` : ''}</span>
    <button type="button" hidden={!failed} aria-label={kk ? 'Қайта жүктеу' : 'Загрузить снова'}
      title={kk ? 'Дыбысты тануды қайта дайындау' : 'Повторить подготовку распознавания'} onClick={() => { void model.preload().catch(() => {}); }}>↻</button>
    <progress max={100} value={state.progress > 0 ? state.progress : undefined} hidden={ready || failed} aria-label={kk ? 'Дыбысты тануды жүктеу' : 'Загрузка распознавания'} />
  </aside>, document.body);
}
