import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';

const SENTENCES = [
  { text: 'Менің атым Алмас.', translation: 'My name is Almas.', words: ['Менің', 'атым', 'Алмас.'] },
  { text: 'Ол мектепке барады.', translation: 'He goes to school.', words: ['Ол', 'мектепке', 'барады.'] },
  { text: 'Бүгін ауа-райы жақсы.', translation: 'Today the weather is good.', words: ['Бүгін', 'ауа-райы', 'жақсы.'] },
];

const TaskReading = () => {
  const { triggerReward } = useGame();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

  const startTask = () => {
    const s = SENTENCES[currentIdx];
    const shuffled = [...s.words].sort(() => Math.random() - 0.5);
    setPool(shuffled);
    setUserOrder([]);
    setFeedback({ msg: '', type: '' });
    setStarted(true);
  };

  const pickWord = (word: string, idx: number) => {
    const newOrder = [...userOrder, word];
    const newPool = pool.filter((_, i) => i !== idx);
    setUserOrder(newOrder);
    setPool(newPool);

    if (newPool.length === 0) {
      const s = SENTENCES[currentIdx];
      if (newOrder.join(' ') === s.words.join(' ')) {
        setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
        triggerReward();
        setTimeout(() => {
          setCurrentIdx((currentIdx + 1) % SENTENCES.length);
          setStarted(false);
        }, 1500);
      } else {
        setFeedback({ msg: 'Сөздердің реті дұрыс емес. ❌', type: 'error' });
        setTimeout(startTask, 1500);
      }
    }
  };

  const s = SENTENCES[currentIdx];

  return (
    <TaskLayout>
      <div className="glass-panel rounded-3xl p-5 sm:p-8 max-w-lg w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">📖 Оқу</h2>
        <p className="text-base text-muted-foreground mb-4">Сөздерді дұрыс ретпен жинаңыз!</p>

        {!started ? (
          <div>
            <p className="text-xl font-semibold mb-4">{s.text}</p>
            <p className="text-sm text-muted-foreground mb-4">{s.translation}</p>
            <button className="game-btn game-btn-success" onClick={startTask}>
              🎮 Бастау
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 justify-center min-h-[50px] mb-4 p-3 rounded-xl border-2 border-dashed border-white/30">
              {userOrder.map((w, i) => (
                <span key={i} className="glass-card rounded-lg px-3 py-2 font-bold">{w}</span>
              ))}
              {userOrder.length === 0 && <span className="text-muted-foreground">Сөздерді таңдаңыз...</span>}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {pool.map((w, i) => (
                <button
                  key={i}
                  className="glass-card rounded-lg px-4 py-2 font-bold cursor-pointer transition-all hover:scale-110 active:scale-95"
                  onClick={() => pickWord(w, i)}
                >
                  {w}
                </button>
              ))}
            </div>
          </>
        )}

        {feedback.msg && (
          <p className={`text-xl font-bold mt-4 ${feedback.type === 'success' ? 'text-success' : feedback.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </TaskLayout>
  );
};

export default TaskReading;
