import { useState } from 'react';
import type { CurriculumStore, PracticeSnapshot } from '../../curriculum/store';
import type { Locale } from '../../learning/content';

export function PairTools({ practice, store, locale }: { practice: PracticeSnapshot; store: CurriculumStore; locale: Locale }) {
  const [query, setQuery] = useState(''), [selected, setSelected] = useState(practice.pairBase!.id);
  const [level, setLevel] = useState('syllables'), [mode, setMode] = useState<'choice' | 'repeat'>('choice');
  const text = (kk: string, ru: string) => locale === 'ru' ? ru : kk;
  const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[-–—\s]/g, '');
  const bank = store.lessons.filter(lesson => lesson.grade === practice.lesson.grade && /^pair-\d+$/.test(lesson.id) && normalize(lesson.title).includes(normalize(query)));
  const pair = bank.find(lesson => lesson.id === selected) || bank[0];
  const rows = [
    ['syllables', 'Буындар', 'Слоги'], ['words', 'Сөздер', 'Слова'], ['sentences', 'Сөйлемдер', 'Предложения'],
  ];
  return <details className="curriculum-pair-tools">
    <summary>{text('Жұп пен деңгейді таңдау', 'Выбрать пару и уровень')}</summary>
    <div>
      <label><span>{text('Жұпты іздеу', 'Поиск пары')}</span><input type="search" value={query}
        aria-label={text('Жұпты іздеу', 'Поиск пары')} onChange={event => setQuery(event.target.value)} /></label>
      <label><span>{text('Дыбыс жұбы', 'Пара звуков')}</span><select value={pair?.id || ''} aria-label={text('Дыбыс жұбы', 'Пара звуков')} onChange={event => setSelected(event.target.value)}>
        {bank.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
      </select></label>
      <label><span>{text('Деңгей', 'Уровень')}</span><select value={level} aria-label={text('Деңгей', 'Уровень')} onChange={event => setLevel(event.target.value)}>
        {rows.map(([value, kk, ru]) => <option key={value} value={value}>{text(kk, ru)}</option>)}
      </select></label>
      <label><span>{text('Тапсырма', 'Задание')}</span><select value={mode} aria-label={text('Тапсырма', 'Задание')} onChange={event => setMode(event.target.value as typeof mode)}>
        <option value="choice">{text('Тыңда да, таңда', 'Послушай и выбери')}</option>
        <option value="repeat">{text('Қайтала', 'Повтори')}</option>
      </select></label>
      <div className="curriculum-pair-samples">{pair?.steps.filter(step => step.id.startsWith(level + '-')).map(step =>
        <button key={step.id} type="button" className="btn btn-secondary" lang="kk" onClick={() => void store.sample(step.audio!)}>🔊 {step.stimulus}</button>)}</div>
      <button type="button" className="btn btn-secondary" disabled={!pair} onClick={() => store.startPair(pair, level, mode)}>{text('Бастау', 'Начать')}</button>
    </div>
  </details>;
}
