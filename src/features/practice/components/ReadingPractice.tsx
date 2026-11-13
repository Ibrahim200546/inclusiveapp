import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { ReadingRuntime } from '../legacy/reading';
import type { GradeStore } from '../menus/gradeStore';
import { useNavigator } from '../navigation/navigationContext';
import { playPracticeClick } from '../legacy/bridge';
import { presets, splitWord, titles } from '../reading/content';
import type { ReadingProgress, ReadingSnapshot, ReadingStatus, ReadingStore } from '../reading/store';
import { AlphabetPanel } from './AlphabetPanel';
import '../reading/reading.css';
import '../reading/layout.css';

const statuses: Record<ReadingStatus, [string, string]> = {
  '': ['', ''], playing: ['Тыңдаңыз…', 'Слушайте…'], audioError: ['Дыбыс жүктелмеді. Қайталап көріңіз.', 'Звук не загрузился. Попробуйте ещё раз.'],
  generating: ['ЖИ сөйлемдер құрап жатыр…', 'ИИ составляет предложения…'], generated: ['ЖИ дайын. Сөйлем пирамидасы құрастырылды.', 'Пирамида предложений готова.'],
  generationError: ['ЖИ сөйлем құра алмады. Толық сөйлемді өзіңіз енгізіп көріңіз.', 'Не удалось составить предложение. Попробуйте ввести полное предложение.'],
};
const progress: Record<ReadingProgress, [string, string]> = {
  '': ['', ''], listenFirst: ['Алдымен үлгіні тыңдаңыз.', 'Сначала прослушайте образец.'], heard: ['✓ Үлгі тыңдалды. Енді қайталаңыз.', '✓ Образец прослушан. Теперь повторите.'],
  confirmed: ['✓ Педагог белгісі сақталды.', '✓ Отметка педагога сохранена.'], unsaved: ['✓ Қайталанды. Нәтиже осы экранда.', '✓ Повторено. Результат на этом экране.'],
};
function SyllableContext({ snapshot, store, grades }: { snapshot: ReadingSnapshot; store: ReadingStore; grades: GradeStore }) {
  const { junior } = useSyncExternalStore(grades.subscribe, grades.getSnapshot);
  const text = (kk: string, ru: string) => snapshot.locale === 'ru' ? ru : kk;
  return <div id="learningSyllableContext" className="learning-context-bar">
    <p>{snapshot.context === 'voice' ? text('Үлгіні тыңдаңыз. Буындарды анық дауыспен қайталаңыз.', 'Послушайте образец. Повторите слоги отчётливым голосом.')
      : snapshot.context === 'sounds' ? text('Буындарды тыңдап, дыбыстарды анық қайталаңыз.', 'Послушайте слоги и отчётливо повторите звуки.')
        : text('Буындарды бір деммен айтыңыз. Қиналсаңыз, тоқтап, демалыңыз.', 'Произнесите слоги на одном выдохе. Если трудно, остановитесь и отдохните.')}</p>
    <label>{text('Сынып: ', 'Класс: ')}<select aria-label={text('Сынып', 'Класс')} value={junior} onChange={event => grades.selectJunior(Number(event.target.value) as 0 | 1)}>
      <option value="0">0</option><option value="1">1</option>
    </select></label>
    <button type="button" className="btn btn-secondary" onClick={store.stop}>{text('⏹ Тоқтату', '⏹ Остановить')}</button>
    <button type="button" className="btn btn-secondary" onClick={() => void store.generate()}>{text('Қайта бастау', 'Начать заново')}</button>
    <button type="button" className="btn btn-secondary" disabled={snapshot.playing || snapshot.confirmed} onClick={store.confirm}>{text('Педагог: қайталады', 'Педагог: повторил')}</button>
    <p className="learning-context-progress" role="status">{progress[snapshot.progress][snapshot.locale === 'ru' ? 1 : 0]}</p>
  </div>;
}
function ReadingScreen({ runtime, grades, snapshot }: { runtime: ReadingRuntime; grades: GradeStore; snapshot: ReadingSnapshot }) {
  const { store, alphabet } = runtime;
  const { mode, locale, input, rows, split, playing, activeIndex, loading, status } = snapshot;
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);
  const navigator = useNavigator();
  const text = (kk: string, ru: string) => locale === 'ru' ? ru : kk;
  const suffix = { split: '', syllables: '2', words: '3', sentences: '4' }[mode];
  const placeholder = mode === 'split' ? text('Сөз немесе сөйлем енгізіңіз…', 'Введите слово или предложение…')
    : mode === 'syllables' ? text('БУЫН', 'СЛОГ') : mode === 'words' ? text('СӨЗ', 'СЛОВО') : text('СӨЗ НЕМЕСЕ СӨЙЛЕМ', 'СЛОВО ИЛИ ПРЕДЛОЖЕНИЕ');
  const listen = <button type="button" id={mode === 'split' ? 'tynsbyPlayAll' : `tynsbyListenBtn${suffix}`}
    style={{ display: (rows.length || split.length) ? (mode === 'split' ? 'inline-block' : 'block') : 'none' }}
    onClick={() => { if (playing) store.stop(); else void store.play(); }}>
    {playing ? text('⏹ Тоқтату', '⏹ Остановить') : mode === 'split' ? text('🔊 Барлығын тыңда', '🔊 Слушать всё') : text('🎧 Тыңдау', '🎧 Слушать')}
  </button>;
  const presetButtons = <div id={`tynsbyPresets${suffix}`}>{presets[mode][locale].map(value => <button type="button" key={value} className={`tynsby-preset-btn${suffix}`}
    onClick={() => void store.preset(value)}>{mode === 'split' ? splitWord(value).join('-') : value}</button>)}</div>;
  const inputRow = <form id={`tynsbyInputRow${suffix}`} onSubmit={event => { event.preventDefault(); void store.generate(); }}>
    <input id={`tynsbyInput${suffix}`} type="text" value={input} placeholder={placeholder} aria-label={placeholder}
      maxLength={mode === 'syllables' ? 2 : mode === 'words' ? 24 : mode === 'sentences' ? 64 : undefined} onChange={event => store.setInput(event.target.value)} />
    <button type="submit" id={`tynsbyBtn${suffix}`} disabled={loading}>{mode === 'split' ? text('✂️ Буындарға бөл', '✂️ Разделить на слоги')
      : mode === 'sentences' ? (loading ? text('⏳ ЖИ құрап жатыр…', '⏳ ИИ составляет…') : text('✨ Құрастыру', '✨ Составить')) : text('👁️ Көрсету', '👁️ Показать')}</button>
  </form>;
  return <div className="task-flex-container reading-screen" data-react-owned="true" data-i18n-managed="true" data-reading-audio="true">
    <AlphabetPanel key={locale} locale={locale} audio={alphabet} wrapper={wrapper} />
    <div className="task-content-wrapper" ref={setWrapper}>
      <div id={`tynsbyWrap${suffix}`}>
        {mode === 'syllables' && <SyllableContext snapshot={snapshot} store={store} grades={grades} />}
        <div id={`tynsbyTitle${suffix}`} role="heading" aria-level={2}>{titles[mode][locale === 'ru' ? 1 : 0]}</div>
        {mode !== 'syllables' && <div id={`tynsbySubtitle${suffix}`}>
          {mode === 'split' ? text('Сөзді буындарға бөліп оқыңыз!', 'Разделите слово на слоги и прочитайте!')
            : mode === 'words' ? text('Сөзді буынға бөліп, пирамиданы өсіреміз: әуелі бірінші буын, содан кейін буындар тізбегі толық сөзге дейін.', 'Разделяем слово на слоги и растим пирамиду: сначала первый слог, затем цепочку слогов до целого слова.')
              : text('Бірнеше сөз жазсаңыз, пирамида сол сөздермен өседі. Егер тек бір сөз жазсаңыз, ЖИ сол сөзден қарапайым сөйлемдер құрап, пирамиданы өзі жасайды.', 'Введите несколько слов, чтобы построить пирамиду. Если ввести одно слово, ИИ составит из него простые предложения.')}
        </div>}
        {mode === 'split' ? <>{inputRow}{presetButtons}</> : <>{presetButtons}{inputRow}</>}
        {mode !== 'split' && listen}
        <div id={`tynsbyStatus${suffix}`} role="status" style={{ color: status.endsWith('Error') ? '#fecaca' : undefined }}>{statuses[status][locale === 'ru' ? 1 : 0]}</div>
        {mode === 'split' ? <div id="tynsbyDisplay">
          {!split.length && <span className="reading-empty">{text('Буындар осында пайда болады…', 'Слоги появятся здесь…')}</span>}
          {split.map((part, index) => {
            if ('space' in part) return <div key={index} className="tynsby-space" />;
            const width = Math.max(part.text.length * 38, 52);
            return <button type="button" key={index} className={`tynsby-syllable${activeIndex === index ? ' active playing' : ''}`} onClick={() => void store.play(index)}>
              <span className="tynsby-letter">{part.text}</span><svg width={width} height={22} viewBox={`0 0 ${width} 22`} className="tynsby-arc" aria-hidden="true">
                <path d={`M 4 4 Q ${width / 2} 22 ${width - 4} 4`} fill="none" stroke="#67e8f9" strokeWidth={2.5} strokeLinecap="round" className="tynsby-arc-path" />
              </svg>
            </button>;
          })}
        </div> : <div id={`tynsbyPyramid${suffix}`}>
          {rows.map((row, index) => <div key={index} className={`tynsby-row${suffix}`}>
            {mode === 'syllables' ? row.map((part, column) => <span key={column}>{column > 0 && ' – '}<button type="button"
              className={`tynsby-pyramid-syl2${activeIndex === index * 2 + column ? ' active' : ''}`} onClick={() => void store.play(index * 2 + column)}>{part}</button></span>)
              : <button type="button" className={`${mode === 'words' ? 'tynsby-word-row3' : 'tynsby-sentence-row4'}${activeIndex === index ? ' active' : ''}`} onClick={() => void store.play(index)}>
                {row.map((part, column) => <span key={column} className={mode === 'words' ? 'tynsby-word-row3-syl' : 'tynsby-sentence-row4-word'}>{part}</span>)}
              </button>}
          </div>)}
        </div>}
        {mode === 'split' && <>{listen}<div id="tynsbyHint">{text('👆 Буынды басу арқылы оны тыңдаңыз!', '👆 Нажмите на слог, чтобы его послушать!')}</div></>}
      </div>
      <button type="button" className="btn btn-secondary reading-back" onClick={() => { playPracticeClick(); navigator.navigate(snapshot.returnScreen); }}>{text('⬅️ Артқа', '⬅️ Назад')}</button>
    </div>
  </div>;
}

export function ReadingPractice({ runtime, grades }: { runtime: ReadingRuntime; grades: GradeStore }) {
  const snapshot = useSyncExternalStore(runtime.store.subscribe, runtime.store.getSnapshot);
  if (!snapshot) return null;
  const host = document.getElementById(snapshot.host);
  return host ? createPortal(<ReadingScreen key={snapshot.host} runtime={runtime} grades={grades} snapshot={snapshot} />, host) : null;
}
