import { useGame } from '@/contexts/GameContext';
import RadialMenu from '@/components/game/RadialMenu';
import TaskLayout from '@/components/game/TaskLayout';

const Grade0SoundsScreen = () => {
  const { navigate } = useGame();

  const innerItems = [
    { icon: '🔊', label: 'Тану', screen: 'taskSoundDetect', angle: 0 },
    { icon: '🎺', label: 'Аспап', screen: 'taskInstruments', angle: 72 },
    { icon: '🐴', label: 'Жануар', screen: 'taskAnimals', angle: 144 },
    { icon: '🎵', label: 'Ырғақ', screen: 'taskRhythm', angle: 216 },
    { icon: '🌳', label: 'Табиғат', screen: 'taskNature', angle: 288 },
  ];

  const outerItems = [
    { icon: '🗣️', label: 'Адам', screen: 'taskHuman', angle: 20 },
    { icon: '🚗', label: 'Көлік', screen: 'taskVehicles', angle: 60 },
    { icon: '📱', label: 'Үй', screen: 'taskHome', angle: 100 },
    { icon: '🦁', label: 'Жабайы', screen: 'taskWildAnimals', angle: 140 },
    { icon: '👏', label: 'Буындар', screen: 'taskSyllables', angle: 180 },
    { icon: '🔫', label: 'Tex-2', screen: 'taskTechnical', angle: 220 },
    { icon: '🔌', label: 'Тұрмыс', screen: 'taskAppliances', angle: 260 },
    { icon: '🚜', label: 'Tex-4', screen: 'taskTechnical', angle: 300 },
    { icon: '😂', label: 'Эмоция', screen: 'taskHumanEmotions', angle: 340 },
  ];

  return (
    <TaskLayout showAlippe={true}>
      <RadialMenu
        centerContent={<span>Дыбыстар</span>}
        centerSize={140}
        centerGradient="linear-gradient(135deg, #00C9FF 0%, #0084FF 100%)"
        items={[
          ...innerItems.map(i => ({
            icon: i.icon,
            label: i.label,
            onClick: () => navigate(i.screen as any),
            angle: i.angle,
            dist: 180,
          })),
          ...outerItems.map(i => ({
            icon: i.icon,
            label: i.label,
            onClick: () => navigate(i.screen as any),
            angle: i.angle,
            dist: 310,
          })),
        ]}
        size={700}
      />
    </TaskLayout>
  );
};

export default Grade0SoundsScreen;
