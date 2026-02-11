import { useGame } from '@/contexts/GameContext';
import RadialMenu from '@/components/game/RadialMenu';
import TaskLayout from '@/components/game/TaskLayout';

const GradeMenuScreen = ({ grade, gradient, items }: {
  grade: string;
  gradient: string;
  items: { icon: string; label: string; onClick: () => void }[];
}) => {
  return (
    <TaskLayout>
      <RadialMenu
        centerContent={<span>{grade}</span>}
        centerSize={160}
        centerGradient={gradient}
        items={items.map((i, idx) => ({
          icon: i.icon,
          label: i.label,
          onClick: i.onClick,
          angle: (360 / items.length) * idx - 90,
          dist: 200,
        }))}
        size={550}
      />
    </TaskLayout>
  );
};

export const Grade1MenuScreen = () => {
  const { navigate } = useGame();
  return (
    <GradeMenuScreen
      grade="1-сынып"
      gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      items={[
        { icon: '🔤', label: 'Әріптер', onClick: () => navigate('taskLetters') },
        { icon: '🔊', label: 'Дыбыс жиілігі', onClick: () => {} },
        { icon: '🦁', label: 'Жабайы жануар', onClick: () => {} },
        { icon: '💬', label: 'Таныс сөздер', onClick: () => {} },
      ]}
    />
  );
};

export const Grade2MenuScreen = () => (
  <GradeMenuScreen
    grade="2-сынып"
    gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
    items={[
      { icon: '🚗', label: 'Көлік', onClick: () => {} },
      { icon: '🔢', label: 'Математика', onClick: () => {} },
      { icon: '🎵', label: 'Ырғақ', onClick: () => {} },
    ]}
  />
);

export const Grade3MenuScreen = () => (
  <GradeMenuScreen
    grade="3-сынып"
    gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    items={[
      { icon: '🎵', label: 'Ырғақ', onClick: () => {} },
      { icon: '📖', label: 'Сөздер', onClick: () => {} },
      { icon: '🎤', label: 'Дауыс', onClick: () => {} },
    ]}
  />
);

export const Grade4MenuScreen = () => (
  <GradeMenuScreen
    grade="4-сынып"
    gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
    items={[
      { icon: '🎤', label: 'Дауыс', onClick: () => {} },
      { icon: '🔧', label: 'Техника', onClick: () => {} },
      { icon: '📚', label: 'Сөйлем', onClick: () => {} },
    ]}
  />
);

export default GradeMenuScreen;
