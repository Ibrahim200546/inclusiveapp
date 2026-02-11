import { useGame } from '@/contexts/GameContext';
import RadialMenu from '@/components/game/RadialMenu';
import TaskLayout from '@/components/game/TaskLayout';

const Grade0SoundsScreen = () => {
  const { navigate } = useGame();

  const innerItems = [
    { icon: '🔊', label: 'Тану', screen: 'taskSoundDetect' as const, angle: 0 },
    { icon: '🎺', label: 'Аспап', screen: 'taskInstruments' as const, angle: 72 },
    { icon: '🐴', label: 'Жануар', screen: 'taskAnimals' as const, angle: 144 },
    { icon: '🎵', label: 'Ырғақ', screen: 'taskRhythm' as const, angle: 216 },
    { icon: '🌳', label: 'Табиғат', screen: 'taskNature' as const, angle: 288 },
  ];

  const outerItems = [
    { icon: '🗣️', label: 'Адам', screen: 'taskHuman' as const, angle: 36 },
    { icon: '🚗', label: 'Көлік', screen: 'taskVehicles' as const, angle: 108 },
    { icon: '📱', label: 'Үй', screen: 'taskHome' as const, angle: 180 },
    { icon: '😂', label: 'Эмоция', screen: 'taskHuman' as const, angle: 252 },
    { icon: '🦁', label: 'Жабайы', screen: 'taskAnimals' as const, angle: 324 },
  ];

  return (
    <TaskLayout>
      <RadialMenu
        centerContent={<span>Дыбыстар</span>}
        centerSize={140}
        centerGradient="linear-gradient(135deg, #00C9FF 0%, #0084FF 100%)"
        items={[
          ...innerItems.map(i => ({
            icon: i.icon,
            label: i.label,
            onClick: () => navigate(i.screen),
            angle: i.angle,
            dist: 160,
          })),
          ...outerItems.map(i => ({
            icon: i.icon,
            label: i.label,
            onClick: () => navigate(i.screen),
            angle: i.angle,
            dist: 280,
          })),
        ]}
        size={650}
      />
    </TaskLayout>
  );
};

export default Grade0SoundsScreen;
