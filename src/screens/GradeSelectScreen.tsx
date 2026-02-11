import { useGame } from '@/contexts/GameContext';
import RadialMenu from '@/components/game/RadialMenu';

const GradeSelectScreen = () => {
  const { navigate } = useGame();

  const grades = [
    { icon: '🐣', label: 'Дайындық', screen: 'grade0Menu' as const, angle: 270 },
    { icon: '🐶', label: '1-сынып', screen: 'grade1Menu' as const, angle: 342 },
    { icon: '🚗', label: '2-сынып', screen: 'grade2Menu' as const, angle: 54 },
    { icon: '🎵', label: '3-сынып', screen: 'grade3Menu' as const, angle: 126 },
    { icon: '🎤', label: '4-сынып', screen: 'grade4Menu' as const, angle: 198 },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen animate-fade-in">
      <RadialMenu
        centerContent={<span>Сыныпты<br/>таңдаңыз</span>}
        centerGradient="var(--gradient-primary)"
        items={grades.map(g => ({
          icon: <span>{g.icon}</span>,
          label: g.label,
          onClick: () => navigate(g.screen),
          angle: g.angle,
        }))}
        size={550}
      />
    </div>
  );
};

export default GradeSelectScreen;
