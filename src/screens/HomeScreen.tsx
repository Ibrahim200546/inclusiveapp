import { useGame } from '@/contexts/GameContext';
import CoinsDisplay from '@/components/game/CoinsDisplay';
import ThemeToggle from '@/components/game/ThemeToggle';

const HomeScreen = () => {
  const { character, selectCharacter, navigate } = useGame();

  const characters = [
    { id: 'fox' as const, emoji: '🦊', name: 'Түлкі' },
    { id: 'rabbit' as const, emoji: '🐰', name: 'Қоян' },
    { id: 'robot' as const, emoji: '🤖', name: 'Робот' },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen p-4 animate-fade-in relative overflow-hidden">
      <CoinsDisplay />
      <ThemeToggle />
      {/* Decorative Background Elements */}
      <div className="absolute top-10 left-10 text-[80px] opacity-80 animate-bounce-slow" style={{ animationDuration: '4s' }}>🎈</div>
      <div className="absolute top-20 right-10 text-[100px] opacity-80 animate-bounce-slow" style={{ animationDuration: '5s' }}>🎈</div>
      <div className="absolute top-1/2 left-20 text-[60px] opacity-60 animate-float" style={{ animationDelay: '1s' }}>☁️</div>
      <div className="absolute top-1/3 right-1/4 text-[80px] opacity-60 animate-float" style={{ animationDelay: '2s' }}>☁️</div>
      <div className="absolute bottom-10 left-1/3 text-[70px] opacity-60 animate-float" style={{ animationDelay: '0s' }}>☁️</div>
      <div className="absolute bottom-20 right-20 text-[60px] opacity-60 animate-float" style={{ animationDelay: '3s' }}>☁️</div>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 md:p-12 max-w-2xl w-full text-center z-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 sm:mb-3">Қош келдіңіз! 👋</h2>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6 sm:mb-8">
          Бұл платформада сіз дыбыстарды естіп, айтуды үйренесіз.<br className="hidden sm:block" />
          Ойындар мен тапсырмалар арқылы есту қабілетіңізді дамытасыз!
        </p>

        <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6" style={{ color: 'hsl(260, 60%, 50%)' }}>
          Көмекшіңізді таңдаңыз:
        </h3>

        <div className="flex justify-center gap-3 sm:gap-6 mb-8 sm:mb-10">
          {characters.map(c => (
            <button
              key={c.id}
              className="glass-card rounded-2xl p-3 sm:p-6 cursor-pointer transition-all duration-300 flex flex-col items-center"
              style={{
                border: character === c.id ? '3px solid hsl(260, 70%, 60%)' : '1px solid rgba(255,255,255,0.25)',
                transform: character === c.id ? 'scale(1.1)' : 'scale(1)',
                boxShadow: character === c.id ? '0 0 30px rgba(130,100,220,0.5)' : 'none',
              }}
              onClick={() => selectCharacter(c.id)}
            >
              <span className="text-4xl sm:text-6xl mb-1 sm:mb-2">{c.emoji}</span>
              <span className="font-bold text-sm sm:text-lg">{c.name}</span>
            </button>
          ))}
        </div>

        <button
          className="game-btn game-btn-success text-lg sm:text-xl px-8 sm:px-10 py-4 sm:py-5"
          onClick={() => navigate('grades')}
        >
          ▶️ Оқуды бастау
        </button>

        <a
          href="/original/index.html"
          className="block mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Ескі нұсқасын қосу (Original Demo)
        </a>
      </div>
    </div>
  );
};

export default HomeScreen;
