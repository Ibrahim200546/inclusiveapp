import type { AudioWindow } from '../audio/types';
import { createReadingPlayback } from '../reading/playback';
import { createReadingStore } from '../reading/store';
import { readingScreens } from '../reading/content';
import { generateSentenceRows } from '../reading/sentences';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';
import { profileStore } from '../profile/profileRuntime';
import { saveLearningProgress } from '../learning/progress';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import type { PlaybackResult } from '../curriculum/playback';

type ReadingWindow = AudioWindow;
export interface AlphabetAudio { letter(letter: string): Promise<PlaybackResult>; word(letter: string, word: string): Promise<PlaybackResult>; stop(): void }

export function installPracticeReading(navigator: ScreenNavigator, grades: GradeStore, app = window as ReadingWindow) {
  const player = createReadingPlayback(app);
  const identity = () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId });
  const store = createReadingStore({
    player, identity,
    generate: (seed, locale, signal) => generateSentenceRows(app.fetch.bind(app), seed, locale, signal),
    save(owner, context, detail) {
      try { return saveLearningProgress(app.localStorage, owner.learner, owner.grade, context, 'syllable-reading-2', detail); }
      catch { return false; }
    },
  });
  const letterPaths = (letter: string) => {
    const lower = encodeURIComponent(letter.toLowerCase());
    const basic = [`sounds/Alippe/Alippe_${lower}.mp3`, `sounds/letters/letter_${lower}.mp3`];
    return getPracticeLocale() === 'ru'
      ? [`sounds/ru/Alippe/Alippe_${lower}.mp3`, `sounds/ru/Alippe/Alippe_${lower}.mp4`,
        `sounds/ru/letters/letter_${lower}.mp3`, `sounds/ru/letters/letter_${lower}.mp4`, ...basic] : basic;
  };
  const alphabet: AlphabetAudio = {
    stop: player.stop,
    letter(letter) { store.stop(); return player.paths(letterPaths(letter)); },
    word(letter, word) {
      store.stop();
      const safe = encodeURIComponent(word);
      const paths = getPracticeLocale() === 'ru'
        ? [`sounds/ru/Alippe/words/${safe}.mp3`, `sounds/ru/Alippe/words/${safe}.mp4`, `sounds/Alippe/words/${safe}.mp3`]
        : [app.getKkHumanVoiceoverAudioPath?.(word, 'kk-KZ') || '', `sounds/Alippe/words/${safe}.mp4`, `sounds/Alippe/words/${safe}.mp3`];
      return player.paths([...paths, ...letterPaths(letter)]);
    },
  };
  const releaseNavigation = navigator.register({
    name: 'react-reading', leave: () => { store.close(); player.stop(); },
    enter({ from, to }) {
      const mode = readingScreens[to];
      if (!mode) return;
      const voice = mode === 'syllables' && ['grade0DauyspenmMenu', 'grade0VoiceMenu', 'grade0SoundsMenu'].includes(from);
      store.start({ host: to, mode, returnScreen: voice ? from : mode === 'split' ? 'grade0VoiceMenu' : 'grade0TynysByMenu',
        context: voice ? (from === 'grade0SoundsMenu' ? 'sounds' : 'voice') : 'breathing' });
    },
  });
  let owner = identity();
  const sync = () => {
    const next = identity();
    if (next.locale === owner.locale && next.grade === owner.grade && next.learner === owner.learner) return;
    owner = next; store.syncIdentity(); player.stop();
  };
  const releaseLocale = subscribeToPracticeLocale(sync), releaseGrade = grades.subscribe(sync), releaseProfile = profileStore.subscribe(sync);
  const stop = () => { store.stop(); player.stop(); };
  const hidden = () => { if (app.document.hidden) stop(); };
  app.addEventListener('pagehide', stop); app.document.addEventListener('visibilitychange', hidden);
  return {
    store, alphabet,
    openSyllables: () => navigator.navigate('g0TynysByTask2'),
    dispose() {
      releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile();
      app.removeEventListener('pagehide', stop); app.document.removeEventListener('visibilitychange', hidden);
      store.dispose(); player.stop();
    },
  };
}
export type ReadingRuntime = ReturnType<typeof installPracticeReading>;
