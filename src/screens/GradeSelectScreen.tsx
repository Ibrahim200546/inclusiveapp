import { useGame } from '@/contexts/GameContext';
import RadialMenu from '@/components/game/RadialMenu';

import CoinsDisplay from '@/components/game/CoinsDisplay';
import ThemeToggle from '@/components/game/ThemeToggle';

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
    <div className="flex items-center justify-center min-h-screen animate-fade-in relative overflow-hidden">
      <CoinsDisplay />
      <ThemeToggle />
      {/* Decorative Background Elements */}
      <div className="absolute top-10 left-10 text-[80px] opacity-80 animate-bounce-slow" style={{ animationDuration: '4s' }}>🎈</div>
      <div className="absolute top-20 right-10 text-[100px] opacity-80 animate-bounce-slow" style={{ animationDuration: '5s' }}>🎈</div>
      <div className="absolute top-1/2 left-20 text-[60px] opacity-60 animate-float" style={{ animationDelay: '1s' }}>☁️</div>
      <div className="absolute top-1/3 right-1/4 text-[80px] opacity-60 animate-float" style={{ animationDelay: '2s' }}>☁️</div>
      <div className="absolute bottom-10 left-1/3 text-[70px] opacity-60 animate-float" style={{ animationDelay: '0s' }}>☁️</div>
      <div className="absolute bottom-20 right-20 text-[60px] opacity-60 animate-float" style={{ animationDelay: '3s' }}>☁️</div>

      <RadialMenu
        centerContent={<span>Сыныпты<br />таңдаңыз</span>}
        centerGradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
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
