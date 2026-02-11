import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const HUMANS = [
  { value: 'laugh', icon: '😂', label: 'Күлу' },
  { value: 'cry', icon: '😢', label: 'Жылау' },
  { value: 'sneeze', icon: '🤧', label: 'Түшкіру' },
  { value: 'cough', icon: '😷', label: 'Жөтелу' },
];

const TaskHuman = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = HUMANS[Math.floor(Math.random() * HUMANS.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });
  }, []);

  const checkAnswer = (value: string) => {
    if (!target) { setFeedback({ msg: 'Алдымен дыбысты тыңдаңыз! 🔊', type: '' }); return; }
    if (value === target) {
      setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Қате! ❌', type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🗣️ Адам дыбыстары</h2>
      <p className="text-lg text-muted-foreground mb-4">Дыбысты тыңдап, адамның көңіл-күйін табыңыз!</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={HUMANS.map(h => ({ icon: h.icon, label: h.label, value: h.value }))}
        onSelect={checkAnswer}
      />
      {feedback.msg && (
        <p className={`text-2xl font-bold mt-4 ${feedback.type === 'success' ? 'text-success' : feedback.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {feedback.msg}
        </p>
      )}
    </TaskLayout>
  );
};

export default TaskHuman;
