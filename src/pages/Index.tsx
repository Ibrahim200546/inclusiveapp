import React from 'react';
import { GameProvider, useGame } from "@/contexts/GameContext";
import HomeScreen from "@/screens/HomeScreen";
import GradeSelectScreen from "@/screens/GradeSelectScreen";
import Grade0MenuScreen from "@/screens/Grade0MenuScreen";
import Grade0SoundsScreen from "@/screens/Grade0SoundsScreen";
import Grade0VoiceScreen from "@/screens/Grade0VoiceScreen";
import {
  Grade1MenuScreen,
  Grade2MenuScreen,
  Grade3MenuScreen,
  Grade4MenuScreen
} from "@/screens/GradeMenuScreens";

// Tasks
import TaskSoundDetect from "@/screens/tasks/TaskSoundDetect";
import TaskInstruments from "@/screens/tasks/TaskInstruments";
import TaskAnimals from "@/screens/tasks/TaskAnimals";
import TaskRhythm from "@/screens/tasks/TaskRhythm";
import TaskNature from "@/screens/tasks/TaskNature";
import TaskHuman from "@/screens/tasks/TaskHuman";
import TaskVehicles from "@/screens/tasks/TaskVehicles"; // Assuming this exists based on context but wasn't in list? Wait, let me check list again. Yes it is.
import TaskHome from "@/screens/tasks/TaskHomeSounds"; // Filename is TaskHomeSounds.tsx
import TaskLetters from "@/screens/tasks/TaskLetters";
import TaskVoiceTrain from "@/screens/tasks/TaskVoiceTrain";
import TaskWildAnimals from "@/screens/tasks/TaskWildAnimals";
import TaskSyllables from "@/screens/tasks/TaskSyllables";
import TaskTechnical from "@/screens/tasks/TaskTechnical";
import TaskAppliances from "@/screens/tasks/TaskAppliances";
import TaskFamiliarWords from "@/screens/tasks/TaskFamiliarWords";
import TaskLetterDiscrimination from "@/screens/tasks/TaskLetterDiscrimination";
import TaskMath from "@/screens/tasks/TaskMath";
import TaskSoundProperties from "@/screens/tasks/TaskSoundProperties";
import TaskMusicalTales from "@/screens/tasks/TaskMusicalTales";
import TaskMusicTempo from "@/screens/tasks/TaskMusicTempo";
import TaskIntonation from "@/screens/tasks/TaskIntonation";
import TaskStress from "@/screens/tasks/TaskStress";
import TaskWordType from "@/screens/tasks/TaskWordType";
import TaskNationalSongs from "@/screens/tasks/TaskNationalSongs";
import TaskStories from "@/screens/tasks/TaskStories";
import TaskDialog from "@/screens/tasks/TaskDialog";
import TaskReading from "@/screens/tasks/TaskReading";
import TaskComplexRhythm from "@/screens/tasks/TaskComplexRhythm";
import TaskDirection from "@/screens/tasks/TaskDirection";
import TaskHumanEmotions from "@/screens/tasks/TaskHumanEmotions";
import TaskArticulationMap from "@/screens/tasks/TaskArticulationMap";

const GameContent = () => {
  const { screen } = useGame();

  switch (screen) {
    case 'home': return <HomeScreen />;
    case 'grades': return <GradeSelectScreen />;
    case 'grade0Menu': return <Grade0MenuScreen />;
    case 'grade0Sounds': return <Grade0SoundsScreen />;
    case 'grade0Voice': return <Grade0VoiceScreen />;
    case 'grade1Menu': return <Grade1MenuScreen />;
    case 'grade2Menu': return <Grade2MenuScreen />;
    case 'grade3Menu': return <Grade3MenuScreen />;
    case 'grade4Menu': return <Grade4MenuScreen />;

    // Tasks
    case 'taskSoundDetect': return <TaskSoundDetect />;
    case 'taskInstruments': return <TaskInstruments />;
    case 'taskAnimals': return <TaskAnimals />;
    case 'taskRhythm': return <TaskRhythm />;
    case 'taskNature': return <TaskNature />;
    case 'taskHuman': return <TaskHuman />;
    case 'taskVehicles': return <TaskVehicles />;
    case 'taskHome': return <TaskHome />;
    case 'taskLetters': return <TaskLetters />;
    case 'taskVoiceTrain': return <TaskVoiceTrain />;
    case 'taskWildAnimals': return <TaskWildAnimals />;
    case 'taskSyllables': return <TaskSyllables />;
    case 'taskTechnical': return <TaskTechnical />;
    case 'taskAppliances': return <TaskAppliances />;
    case 'taskFamiliarWords': return <TaskFamiliarWords />;
    case 'taskLetterDiscrimination': return <TaskLetterDiscrimination />;
    case 'taskMath': return <TaskMath />;
    case 'taskSoundProperties': return <TaskSoundProperties />;
    case 'taskMusicalTales': return <TaskMusicalTales />;
    case 'taskMusicTempo': return <TaskMusicTempo />;
    case 'taskIntonation': return <TaskIntonation />;
    case 'taskStress': return <TaskStress />;
    case 'taskWordType': return <TaskWordType />;
    case 'taskNationalSongs': return <TaskNationalSongs />;
    case 'taskStories': return <TaskStories />;
    case 'taskDialog': return <TaskDialog />;
    case 'taskReading': return <TaskReading />;
    case 'taskComplexRhythm': return <TaskComplexRhythm />;
    case 'taskDirection': return <TaskDirection />;
    case 'taskHumanEmotions': return <TaskHumanEmotions />;
    case 'taskArticulationMap': return <TaskArticulationMap />;

    default: return <HomeScreen />;
  }
};

const ThemedWrapper = () => {
  const { theme } = useGame();
  return (
    <div className={`min-h-screen game-theme ${theme === 'night' ? 'night-mode' : 'day-mode'}`}>
      <GameContent />
    </div>
  );
};

const Index = () => {
  return (
    <GameProvider>
      <ThemedWrapper />
    </GameProvider>
  );
};

export default Index;
