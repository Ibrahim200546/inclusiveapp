import { useGame } from '@/contexts/GameContext';
import RadialMenu from '@/components/game/RadialMenu';
import TaskLayout from '@/components/game/TaskLayout';
import { useLocalePreference } from '@/hooks/use-locale-preference';

const Grade0MenuScreen = () => {
  const { navigate } = useGame();
  const locale = useLocalePreference();
  const ru = locale === 'ru';

  return (
    <TaskLayout showAlippe={true}>
      <RadialMenu
        centerContent={<span>{ru ? '0 класс' : '0-сынып'}</span>}
        centerSize={160}
        centerGradient="linear-gradient(135deg, #FDB813 0%, #F5A623 100%)"
        items={[
          { icon: '🔊', label: ru ? 'Звуки' : 'Дыбыстар', onClick: () => navigate('grade0Sounds'), angle: 90 },
          { icon: '🎤', label: ru ? 'Голос' : 'Дауыс', onClick: () => navigate('grade0Voice'), angle: 270 },
        ]}
        size={500}
      />
    </TaskLayout>
  );
};

export default Grade0MenuScreen;
