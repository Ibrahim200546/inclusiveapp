import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const PROPERTIES = [
  { value: 'long', icon: '⏳', label: 'Ұзақ' },
  { value: 'short', icon: '⏱️', label: 'Қысқа' },
  { value: 'loud', icon: '🔊', label: 'Қатты' },
  { value: 'quiet', icon: '🔉', label: 'Ақырын' },
  { value: 'calm', icon: '🔈', label: 'Тыныш' },
];

const TaskSoundProperties = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = PROPERTIES[Math.floor(Math.random() * PROPERTIES.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });

    // Generate synthesized sound based on property
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'sine';

      const durMap: Record<string, number> = { long: 2, short: 0.2, loud: 0.8, quiet: 0.8, calm: 0.8 };
      const volMap: Record<string, number> = { long: 0.3, short: 0.3, loud: 0.5, quiet: 0.05, calm: 0.02 };
      const dur = durMap[chosen.value] || 0.8;
      const vol = volMap[chosen.value] || 0.3;

      gain.gain.setValueAtTime(vol, ctx.currentTime);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, dur * 1000);
    } catch { /* ignore */ }
  }, []);

  const checkAnswer = (value: string) => {
    if (!target) { setFeedback({ msg: 'Алдымен дыбысты тыңдаңыз! 🔊', type: '' }); return; }
    if (value === target) {
      setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Жоқ, бұл басқа сипат. ❌', type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">⏱️ Дыбыс сипаты</h2>
      <p className="text-lg text-muted-foreground mb-4">Дыбысты тыңдап, оның ұзақтығын немесе қаттылығын анықтаңыз!</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={PROPERTIES.map(o => ({ icon: o.icon, label: o.label, value: o.value }))}
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

export default TaskSoundProperties;
