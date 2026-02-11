import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const NATURE = [
  { value: 'bird', icon: '🦜', label: 'Құстар' },
  { value: 'water', icon: '🌊', label: 'Су' },
  { value: 'wind', icon: '💨', label: 'Жел' },
];

const TaskNature = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = NATURE[Math.floor(Math.random() * NATURE.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const freqs: Record<string, [number, OscillatorType]> = {
        bird: [1200, 'sine'],
        water: [200, 'triangle'],
        wind: [100, 'sawtooth'],
      };
      const [freq, type] = freqs[chosen.value] || [300, 'sine'];
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, 700);
    } catch {}
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
      <h2 className="text-3xl font-bold mb-2">🌳 Табиғат дыбыстары</h2>
      <p className="text-lg text-muted-foreground mb-4">Дыбысты тыңдап, табиғат құбылысын табыңыз.</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
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
