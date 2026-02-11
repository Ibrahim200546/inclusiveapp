import { useGame } from '@/contexts/GameContext';
import RadialMenu from '@/components/game/RadialMenu';
import TaskLayout from '@/components/game/TaskLayout';

const Grade0VoiceScreen = () => {
  const { navigate } = useGame();

  return (
    <TaskLayout>
      <RadialMenu
        centerContent={<span>Дауыс</span>}
        centerSize={160}
        centerGradient="linear-gradient(135deg, #FF6B9D 0%, #C06C84 100%)"
        items={[
          { icon: '🚂', label: 'Поезд', onClick: () => navigate('taskVoiceTrain'), angle: 90, dist: 200 },
          { icon: '👄', label: 'Дыбыс картасы', onClick: () => {}, angle: 270, dist: 200 },
        ]}
        size={500}
      />
    </TaskLayout>
  );
};

export default Grade0VoiceScreen;
