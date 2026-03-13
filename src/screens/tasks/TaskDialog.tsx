import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';

const QUESTIONS = [
  { question: 'Диалогта неше адам сөйлесті?', options: ['1', '2', '3', '4'], correct: 1 },
  { question: 'Диалог қай жерде өтті?', options: ['Дүкенде', 'Мектепте', 'Үйде', 'Көшеде'], correct: 1 },
];

const TaskDialog = () => {
  const { triggerReward } = useGame();
  const [currentQ, setCurrentQ] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playDialog = useCallback(() => {
    setFeedback({ msg: '🔊 Диалогты тыңдаңыз...', type: '' });
    setPlaying(true);
    setAnswered(false);
    const audio = new Audio('/sounds/dialog/dialog1.mp3');
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
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">💬 Диалогтар</h2>
        <p className="text-base text-muted-foreground mb-4">Диалогты тыңдап, сұраққа жауап беріңіз!</p>

        <button className="game-btn game-btn-success text-base mb-6" onClick={playDialog} disabled={playing}>
          {playing ? '🔊 Ойнатылуда...' : '▶️ Диалогты тыңдау'}
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

export default TaskDialog;
