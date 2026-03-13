import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const SYLLABLE_OPTIONS = [
  { value: 1, label: '1 буын', icon: '1️⃣' },
  { value: 2, label: '2 буын', icon: '2️⃣' },
  { value: 3, label: '3 буын', icon: '3️⃣' },
  { value: 4, label: '4 буын', icon: '4️⃣' },
];

const TaskSyllables = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const syllableCount = Math.floor(Math.random() * 4) + 1; // 1 to 4
    setTarget(syllableCount);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });

    // Assuming file structure: word_1.mp3, word_2.mp3, etc.
    const audio = new Audio(`/sounds/syllables/word_${syllableCount}.mp3`);
    audio.play().catch(e => {
      console.error("Audio play failed", e);
      setFeedback({ msg: 'Дыбыс табылмады', type: 'error' });
    });
  }, []);

  const checkAnswer = (valStr: string) => {
    const value = parseInt(valStr, 10);
    if (!target) { setFeedback({ msg: 'Алдымен дыбысты тыңдаңыз! 🔊', type: '' }); return; }
    if (value === target) {
      setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Жоқ, бұл басқа буын саны. ❌', type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">👏 Буындар</h2>
      <p className="text-lg text-muted-foreground mb-4">Сөзді тыңдап, неше буыннан тұратынын табыңыз!</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={SYLLABLE_OPTIONS.map(o => ({ icon: o.icon, label: o.label, value: String(o.value) }))}
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

export default TaskSyllables;
