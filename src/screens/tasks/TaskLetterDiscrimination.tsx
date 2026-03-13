import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const LETTERS = [
  { value: 'с', label: 'С' },
  { value: 'ш', label: 'Ш' },
  { value: 'з', label: 'З' },
  { value: 'ж', label: 'Ж' },
];

const TaskLetterDiscrimination = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });

    // Using letter_x.mp3 format
    const audio = new Audio(`/sounds/letters/letter_${chosen.value}.mp3`);
    audio.play().catch(e => {
      console.error("Audio play failed", e);
      setFeedback({ msg: 'Дыбыс табылмады', type: 'error' });
    });
  }, []);

  const checkAnswer = (value: string) => {
    if (!target) { setFeedback({ msg: 'Алдымен дыбысты тыңдаңыз! 🔊', type: '' }); return; }
    if (value === target) {
      setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Жоқ, бұл басқа дыбыс. ❌', type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🔤 С-Ш, З-Ж айыру</h2>
      <p className="text-lg text-muted-foreground mb-4">Сөзді тыңдап, қандай дыбыс естілетінін табыңыз!</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={LETTERS.map(o => ({
          icon: <span className="text-4xl font-bold">{o.label}</span>,
          label: '',
          value: o.value
        }))}
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

export default TaskLetterDiscrimination;
