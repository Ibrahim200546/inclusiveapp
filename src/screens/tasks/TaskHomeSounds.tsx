import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';
import { playSound, playSuccess, playError } from '@/lib/audioUtils';

const HOME_SOUNDS = [
  { value: 'phone', icon: '📱', label: 'Телефон', file: 'phone.mp3' },
  { value: 'clock', icon: '⏰', label: 'Сағат', file: 'clock.mp3' },
  { value: 'doorbell', icon: '🔔', label: 'Есік', file: 'doorbell.mp3' },
  { value: 'schoolbell', icon: '🏫', label: 'Мектеп', file: 'school_bell.mp3' },
  { value: 'bike', icon: '🚲', label: 'Велосипед', file: 'bike.mp3' },
];

const TaskHomeSounds = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSoundEffect = useCallback(() => {
    const chosen = HOME_SOUNDS[Math.floor(Math.random() * HOME_SOUNDS.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });
    playSound(`/sounds/Household sounds/${chosen.file}`);
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
      <h2 className="text-3xl font-bold mb-2">🏠 Тұрмыстық дыбыстар</h2>
      <p className="text-lg text-muted-foreground mb-4">Бұл ненің дыбысы?</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSoundEffect}
        options={HOME_SOUNDS.map(s => ({ icon: s.icon, label: s.label, value: s.value }))}
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

export default TaskHomeSounds;
