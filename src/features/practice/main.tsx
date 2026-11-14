import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { PracticeApp } from "./PracticeApp";
import { installLegacyNavigation } from "./legacy/navigation";
import { NavigationContext } from "./navigation/navigationContext";
import { installLegacyLeaderboard } from './legacy/leaderboard';
import { leaderboardDialog } from './profile/leaderboardDialog';
import { installLegacyProfile } from './legacy/profile';
import { profileDialog, profileStore } from './profile/profileRuntime';
import { installPracticeAudio } from './audio/runtime';
import type { AudioWindow } from './audio/types';
import { stopLegacyInputStreams } from './legacy/audio';
import { installLegacyLearning } from './legacy/learning';
import { installLegacyCurriculum } from './legacy/curriculum';
import { installLegacyGrades } from './legacy/grades';
import { installPracticeReading } from './legacy/reading';
import { installPracticeCards } from './legacy/cards';
import { installPracticeVerbs } from './legacy/verbs';
import { installPracticeArticulation } from './legacy/articulation';
import { installArticulationLessons } from './legacy/articulationLessons';
import { installVowelPractice } from './legacy/vowels';
import { installVoiceModes } from './legacy/voiceModes';
import { installVoicePresence } from './legacy/voicePresence';

import { installTrainPractice } from './legacy/train';
import { installFrogPractice } from './legacy/frog';
import { installRepeatRhythm } from './legacy/repeatRhythm';
import { installOneBreath } from './legacy/oneBreath';
import { trainModel } from './train/modelRuntime';

// The module entry runs after classic scripts and before DOMContentLoaded.
// Install navigation first: DOMContentLoaded initializers register hooks on it.
const navigator = installLegacyNavigation(window, document);
const audio = installPracticeAudio(window as AudioWindow, document, navigator, () => stopLegacyInputStreams(window as AudioWindow));
const grades = installLegacyGrades(navigator);
const articulation = installPracticeArticulation(navigator, grades.store, audio);
const articulationLessons = installArticulationLessons(navigator, grades.store, audio.stopContentPlayback);
const vowels = installVowelPractice(navigator, grades.store, audio.stopContentPlayback);
const voiceModes = installVoiceModes(navigator, grades.store, audio.stopContentPlayback);
const voicePresence = installVoicePresence(navigator, grades.store, audio);
const reading = installPracticeReading(navigator, grades.store);
const train = installTrainPractice(navigator, grades.store, trainModel, reading.alphabet, audio.stopAllAppAudio);
const frog = installFrogPractice(navigator, grades.store);
const repeatRhythm = installRepeatRhythm(navigator, grades.store, audio.stopAllAppAudio);
const oneBreath = installOneBreath(navigator, grades.store);
const cards = installPracticeCards(navigator, grades.store, audio.stopContentPlayback);
const verbs = installPracticeVerbs(navigator, grades.store, audio.stopContentPlayback);
const learning = installLegacyLearning(navigator);
const curriculum = installLegacyCurriculum(navigator);
const releaseProfile = installLegacyProfile();
const releaseLeaderboard = installLegacyLeaderboard();
const releaseLeaderboardNavigation = navigator.register({ name: 'react-leaderboard', leave: () => leaderboardDialog.close() });
const releaseProfileNavigation = navigator.register({ name: 'react-profile', leave: () => profileDialog.close() });

// Mount synchronously so the remaining legacy initializers see a complete
// page, including React islands.
const container = document.querySelector<HTMLElement>("[data-practice-root]");
if (!container) throw new Error("Practice root is missing");
const headerRoot = document.getElementById('practiceHeaderRoot');
const mobileNavRoot = document.getElementById('practiceMobileNavRoot');
const topControlsRoot = document.getElementById('practiceTopControlsRoot');
const leaderboardRoot = document.getElementById('practiceLeaderboardRoot');
const profileRoot = document.getElementById('practiceProfileRoot');
if (!headerRoot || !mobileNavRoot || !topControlsRoot || !leaderboardRoot || !profileRoot) throw new Error('Practice shell roots are missing');
const root = createRoot(container);
flushSync(() => root.render(
  <NavigationContext.Provider value={navigator}>
    <PracticeApp headerRoot={headerRoot} mobileNavRoot={mobileNavRoot} topControlsRoot={topControlsRoot} leaderboardRoot={leaderboardRoot} profileRoot={profileRoot} learning={learning} curriculum={curriculum.store} grades={grades} reading={reading} cards={cards} verbs={verbs.store} articulation={articulation.store} articulationLessons={articulationLessons.store} vowels={vowels.store} voiceModes={voiceModes.store} voicePresence={voicePresence} train={train.store} frog={frog} repeatRhythm={repeatRhythm.store} oneBreath={oneBreath.store} />
  </NavigationContext.Provider>,
));
void profileStore.refresh();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount();
    releaseLeaderboardNavigation();
    releaseProfileNavigation();
    releaseLeaderboard();
    releaseProfile();
    articulation.dispose();
    articulationLessons.dispose();
    vowels.dispose();
    voiceModes.dispose();
    voicePresence.dispose();
    train.dispose();
    frog.dispose();
    repeatRhythm.dispose();
    oneBreath.dispose();
    grades.dispose();
    reading.dispose();
    cards.dispose();
    verbs.dispose();
    learning.dispose();
    curriculum.dispose();
    audio.dispose();
  });
}
