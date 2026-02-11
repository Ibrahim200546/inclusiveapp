import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';
import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';

const TaskRhythm = () => {
  const { triggerReward } = useGame();
  const [feedback, setFeedback] = useState('');

  const hitDrum = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 150;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, 200);
    } catch {}
    setFeedback('🥁 Жарайсың!');
  }, []);

  const playRhythm = (type: string) => {
    setFeedback(type === 'march' ? '💂 Марш ырғағы!' : '💃 Вальс ырғағы!');
    triggerReward();
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🎵 Музыка ырғағы</h2>
      <p className="text-lg text-muted-foreground mb-4">Ырғақты тыңдап, түрін ажыратыңыз!</p>
      <CircleOptions
        centerIcon="🥁"
        onCenterClick={hitDrum}
        options={[
          { icon: '💂', label: 'Марш', value: 'march' },
          { icon: '💃', label: 'Вальс', value: 'waltz' },
        ]}
        onSelect={playRhythm}
      />
      {feedback && <p className="text-2xl font-bold mt-4 text-success">{feedback}</p>}
    </TaskLayout>
  );
};

export default TaskRhythm;
