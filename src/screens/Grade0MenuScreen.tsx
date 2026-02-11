import { useGame } from '@/contexts/GameContext';
import RadialMenu from '@/components/game/RadialMenu';
import TaskLayout from '@/components/game/TaskLayout';

const Grade0MenuScreen = () => {
  const { navigate } = useGame();

  return (
    <TaskLayout>
      <RadialMenu
        centerContent={<span>0-сынып</span>}
        centerSize={160}
        centerGradient="linear-gradient(135deg, #FDB813 0%, #F5A623 100%)"
        items={[
          { icon: '🔊', label: 'Дыбыстар', onClick: () => navigate('grade0Sounds'), angle: 90 },
          { icon: '🎤', label: 'Дауыс', onClick: () => navigate('grade0Voice'), angle: 270 },
        ]}
        size={500}
      />
    </TaskLayout>
  );
};

export default Grade0MenuScreen;
