import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';

const QUESTIONS = [
  { question: 'Бұл ертегіде кім бар?', options: ['Қоян', 'Түлкі', 'Арыстан', 'Аю'], correct: 1 },
  { question: 'Ертегінің аты не?', options: ['Алдар Көсе', 'Ер Төстік', 'Қозы Көрпеш', 'Алпамыс'], correct: 0 },
];

const TaskStories = () => {
  const { triggerReward } = useGame();
  const [currentQ, setCurrentQ] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playStory = useCallback(() => {
    setFeedback({ msg: '🔊 Ертегіні тыңдаңыз...', type: '' });
    setPlaying(true);
    setAnswered(false);
    const audio = new Audio('/sounds/stories/story_1.mp3');
    audio.onended = () => setPlaying(false);
    audio.play().catch(() => {
      setPlaying(false);
      setFeedback({ msg: 'Аудио табылмады', type: 'error' });
    });
  }, []);

  const checkAnswer = (idx: number) => {
    if (playing || answered) return;
    const q = QUESTIONS[currentQ];
    if (idx === q.correct) {
      setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
      setAnswered(true);
      triggerReward();
      setTimeout(() => setCurrentQ((currentQ + 1) % QUESTIONS.length), 1500);
    } else {
      setFeedback({ msg: 'Қателестіңіз. ❌', type: 'error' });
    }
  };

  const q = QUESTIONS[currentQ];

  return (
    <TaskLayout>
      <div className="glass-panel rounded-3xl p-5 sm:p-8 max-w-lg w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">📖 Ертегілер</h2>
        <p className="text-base text-muted-foreground mb-4">Ертегіні тыңдап, сұраққа жауап беріңіз!</p>

        <button className="game-btn game-btn-success text-base mb-6" onClick={playStory} disabled={playing}>
          {playing ? '🔊 Ойнатылуда...' : '▶️ Ертегіні тыңдау'}
        </button>

        <div className="mb-4">
          <p className="text-xl font-semibold mb-3">{q.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                className="glass-card rounded-xl p-3 text-center font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                onClick={() => checkAnswer(i)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {feedback.msg && (
          <p className={`text-xl font-bold mt-4 ${feedback.type === 'success' ? 'text-success' : feedback.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </TaskLayout>
  );
};

export default TaskStories;
