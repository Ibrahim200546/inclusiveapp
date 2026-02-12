import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';
import { playSound, playSuccess, playError } from '@/lib/audioUtils';

const NATURE = [
  { value: 'bird', icon: '🦜', label: 'Құстар' },
  { value: 'water', icon: '🌊', label: 'Су' },
  { value: 'wind', icon: '💨', label: 'Жел' },
];

const TaskNature = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSoundEffect = useCallback(() => {
    const chosen = NATURE[Math.floor(Math.random() * NATURE.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });
    playSound(`/sounds/nature/${chosen.value}.mp3`);
  }, []);

  const checkAnswer = (value: string) => {
    if (!target) { setFeedback({ msg: 'Алдымен дыбысты тыңдаңыз! 🔊', type: '' }); return; }
    if (value === target) {
      setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
      playSuccess();
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Қате! ❌', type: 'error' });
      playError();
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🌳 Табиғат дыбыстары</h2>
      <p className="text-lg text-muted-foreground mb-4">Дыбысты тыңдап, табиғат құбылысын табыңыз.</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSoundEffect}
        options={NATURE.map(n => ({ icon: n.icon, label: n.label, value: n.value }))}
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

export default TaskNature;
