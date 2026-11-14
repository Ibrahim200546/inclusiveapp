import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PracticeHeader } from "./components/PracticeHeader";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { TopControls } from "./components/TopControls";
import { LeaderboardModal } from "./components/LeaderboardModal";
import { ProfileModal } from './components/ProfileModal';
import { profileDialog } from './profile/profileRuntime';
import { leaderboardDialog } from "./profile/leaderboardDialog";
import { closePracticeLeaderboard } from "./legacy/leaderboard";
import { MainGradeMenu } from "./components/MainGradeMenu";
import { getPracticeLocale, subscribeToPracticeLocale } from "./legacy/bridge";
import { useActiveScreen, useNavigator } from "./navigation/navigationContext";
import { ListeningPractice } from './components/ListeningPractice';
import type { ListeningStore, SoundLibrary } from './learning/listeningStore';
import { CurriculumPractice } from './components/CurriculumPractice';
import type { CurriculumStore } from './curriculum/store';
import { GradeMenus } from './components/GradeMenus';
import type { GradeRuntime } from './legacy/grades';
import type { ReadingRuntime } from './legacy/reading';
import { ReadingPractice } from './components/ReadingPractice';
import { AlphabetPractice } from './components/AlphabetPanel';
import type { CardRuntime } from './legacy/cards';
import { CardPractice } from './components/CardPractice';
import { VerbPractice } from './components/VerbPractice';
import type { VerbStore } from './verbs/store';
import { ArticulationMap } from './components/ArticulationMap';
import type { ArticulationStore } from './articulation/store';
import { ArticulationLessons } from './components/ArticulationLessons';
import type { LessonStore } from './articulationLessons/store';
import { VowelPractice } from './components/VowelPractice';
import type { VowelStore } from './vowels/store';
import { VoiceModePractice } from './components/VoiceModePractice';
import type { VoiceModeStore } from './voiceModes/store';
import { VoicePresencePractice } from './components/VoicePresencePractice';
import type { PresenceRuntime } from './legacy/voicePresence';

import { TrainPractice } from './components/TrainPractice';
import { TrainModelStatus } from './components/TrainModelStatus';
import { trainModel } from './train/modelRuntime';
import type { TrainStore } from './train/store';
import { FrogPractice } from './components/FrogPractice';
import type { FrogRuntime } from './legacy/frog';
import { RepeatRhythmPractice } from './components/RepeatRhythmPractice';
import type { RhythmStore } from './repeatRhythm/store';
import { OneBreathPractice } from './components/OneBreathPractice';
import type { BreathStore } from './oneBreath/store';

export function PracticeApp({ headerRoot, mobileNavRoot, topControlsRoot, leaderboardRoot, profileRoot, learning, curriculum, grades, reading, cards, verbs, articulation, articulationLessons, vowels, voiceModes, voicePresence, train, frog, repeatRhythm, oneBreath }: {
  headerRoot: HTMLElement; mobileNavRoot: HTMLElement; topControlsRoot: HTMLElement; leaderboardRoot: HTMLElement; profileRoot: HTMLElement;
  learning: { store: ListeningStore; sounds: SoundLibrary };
  curriculum: CurriculumStore;
  grades: GradeRuntime;
  reading: ReadingRuntime;
  cards: CardRuntime;
  verbs: VerbStore;
  articulation: ArticulationStore;
  articulationLessons: LessonStore;
  vowels: VowelStore;
  voiceModes: VoiceModeStore;
  voicePresence: PresenceRuntime;
  train: TrainStore;
  frog: FrogRuntime;
  repeatRhythm: RhythmStore;
  oneBreath: BreathStore;
}) {
  const navigator = useNavigator();
  const locale = useSyncExternalStore(subscribeToPracticeLocale, getPracticeLocale);
  const active = useActiveScreen() === "levelsScreen";
  const leaderboardRequest = useSyncExternalStore(leaderboardDialog.subscribe, leaderboardDialog.getSnapshot);
  const profileOpen = useSyncExternalStore(profileDialog.subscribe, profileDialog.getSnapshot);

  return <>
    <MainGradeMenu locale={locale} active={active} onNavigate={navigator.navigate} />
    <GradeMenus runtime={grades} curriculum={curriculum} locale={locale} openSyllables={reading.openSyllables} />
    <ReadingPractice runtime={reading} grades={grades.store} />
    <CardPractice runtime={cards} />
    <VerbPractice store={verbs} />
    <ArticulationMap store={articulation} />
    <ArticulationLessons store={articulationLessons} />
    <VowelPractice store={vowels} />
    <VoiceModePractice store={voiceModes} />
    <VoicePresencePractice runtime={voicePresence} />
    <TrainPractice store={train} />
    <FrogPractice runtime={frog} />
    <RepeatRhythmPractice store={repeatRhythm} />
    <OneBreathPractice store={oneBreath} />
    <TrainModelStatus model={trainModel} locale={locale} />
    <AlphabetPractice locale={locale} audio={reading.alphabet} />
    <ListeningPractice store={learning.store} sounds={learning.sounds} />
    <CurriculumPractice store={curriculum} />
    {createPortal(<PracticeHeader locale={locale} active={active} />, headerRoot)}
    {createPortal(<MobileBottomNav locale={locale} />, mobileNavRoot)}
    {createPortal(<TopControls locale={locale} />, topControlsRoot)}
    {createPortal(<ProfileModal locale={locale} active={profileOpen} />, profileRoot)}
    {leaderboardRequest !== null && createPortal(<LeaderboardModal key={leaderboardRequest} locale={locale} onClose={closePracticeLeaderboard} />, leaderboardRoot)}
  </>;
}
