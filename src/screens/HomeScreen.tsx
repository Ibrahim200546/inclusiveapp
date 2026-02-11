import { useGame } from '@/contexts/GameContext';

const HomeScreen = () => {
  const { character, selectCharacter, navigate } = useGame();

  const characters = [
    { id: 'fox' as const, emoji: '🦊', name: 'Түлкі' },
    { id: 'rabbit' as const, emoji: '🐰', name: 'Қоян' },
    { id: 'robot' as const, emoji: '🤖', name: 'Робот' },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen p-4 animate-fade-in">
      <div className="glass-panel rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-3">Қош келдіңіз! 👋</h2>
        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
          Бұл платформада сіз дыбыстарды естіп, айтуды үйренесіз.<br />
          Ойындар мен тапсырмалар арқылы есту қабілетіңізді дамытасыз!
        </p>

        <h3 className="text-xl font-bold mb-6" style={{ color: 'hsl(260, 70%, 70%)' }}>
          Көмекшіңізді таңдаңыз:
        </h3>

        <div className="flex justify-center gap-6 mb-10">
          {characters.map(c => (
            <button
              key={c.id}
              className="glass-card rounded-2xl p-6 cursor-pointer transition-all duration-300 flex flex-col items-center"
              style={{
                border: character === c.id ? '3px solid hsl(260, 70%, 60%)' : '1px solid rgba(255,255,255,0.25)',
                transform: character === c.id ? 'scale(1.1)' : 'scale(1)',
                boxShadow: character === c.id ? '0 0 30px rgba(130,100,220,0.5)' : 'none',
              }}
              onClick={() => selectCharacter(c.id)}
            >
              <span className="text-6xl mb-2">{c.emoji}</span>
              <span className="font-bold text-lg">{c.name}</span>
            </button>
          ))}
        </div>

        <button
          className="game-btn game-btn-success text-xl px-10 py-5"
          onClick={() => navigate('grades')}
        >
          ▶️ Оқуды бастау
        </button>
      </div>
    </div>
  );
};

export default HomeScreen;
