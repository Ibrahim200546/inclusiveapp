import { GameProvider, useGame, Screen } from '@/contexts/GameContext';
import CoinDisplay from '@/components/game/CoinDisplay';
import RewardModal from '@/components/game/RewardModal';
import HomeScreen from '@/screens/HomeScreen';
import GradeSelectScreen from '@/screens/GradeSelectScreen';
import Grade0MenuScreen from '@/screens/Grade0MenuScreen';
import Grade0SoundsScreen from '@/screens/Grade0SoundsScreen';
import Grade0VoiceScreen from '@/screens/Grade0VoiceScreen';
import { Grade1MenuScreen, Grade2MenuScreen, Grade3MenuScreen, Grade4MenuScreen } from '@/screens/GradeMenuScreens';
import TaskSoundDetect from '@/screens/tasks/TaskSoundDetect';
import TaskInstruments from '@/screens/tasks/TaskInstruments';
import TaskAnimals from '@/screens/tasks/TaskAnimals';
import TaskRhythm from '@/screens/tasks/TaskRhythm';
import TaskNature from '@/screens/tasks/TaskNature';
import TaskHuman from '@/screens/tasks/TaskHuman';
import TaskVehicles from '@/screens/tasks/TaskVehicles';
import TaskHomeSounds from '@/screens/tasks/TaskHomeSounds';
import TaskLetters from '@/screens/tasks/TaskLetters';
import TaskVoiceTrain from '@/screens/tasks/TaskVoiceTrain';
import backgroundImg from '@/assets/background.jpg';

const SCREENS: Record<Screen, React.ComponentType> = {
  home: HomeScreen,
  grades: GradeSelectScreen,
  grade0Menu: Grade0MenuScreen,
  grade0Sounds: Grade0SoundsScreen,
  grade0Voice: Grade0VoiceScreen,
  grade1Menu: Grade1MenuScreen,
  grade2Menu: Grade2MenuScreen,
  grade3Menu: Grade3MenuScreen,
  grade4Menu: Grade4MenuScreen,
  taskSoundDetect: TaskSoundDetect,
  taskInstruments: TaskInstruments,
  taskAnimals: TaskAnimals,
  taskRhythm: TaskRhythm,
  taskNature: TaskNature,
  taskHuman: TaskHuman,
  taskVehicles: TaskVehicles,
  taskHome: TaskHomeSounds,
  taskLetters: TaskLetters,
  taskVoiceTrain: TaskVoiceTrain,
};

const GameApp = () => {
  const { screen } = useGame();
  const ScreenComponent = SCREENS[screen];

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-fixed overflow-x-hidden"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <CoinDisplay />
      <RewardModal />
      <ScreenComponent />
    </div>
  );
};

const Index = () => (
  <GameProvider>
    <GameApp />
  </GameProvider>
);

export default Index;
