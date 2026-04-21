import { useGame } from '@/contexts/GameContext';
import RadialMenu from '@/components/game/RadialMenu';
import TaskLayout from '@/components/game/TaskLayout';

/* Common Layout Wrapper */
const GradeMenuLayout = ({ children }: { children: React.ReactNode }) => (
  <TaskLayout showAlippe={true}>
    {children}
  </TaskLayout>
);

/* Grade 1 Menu */
export const Grade1MenuScreen = () => {
  const { navigate } = useGame();

  // Based on Screenshot 4:
  // Center: 1-сынып
  // Items:
  // - Top: Sound (Music Note) - 'Дыбыс'
  // - Top Right: Words (Bubble) - 'Сөздер'
  // - Right: Sequence (Repeat) - 'Тізбек'
  // - Bottom Right: Numbers (1234) - 'Саны'
  // - Bottom Left: Frequency (People) - 'Жиілігі'
  // - Left: Letters (A) - 'Әріптер'
  // - Top Left: Dance (Dancer) - 'Би' (Rhythm/Tempo)

  const items = [
    { icon: '🎵', label: 'Дыбыс', onClick: () => navigate('taskSoundDetect'), angle: 0 },
    { icon: '💬', label: 'Сөздер', onClick: () => navigate('taskFamiliarWords'), angle: 51 },
    { icon: '🔁', label: 'Тізбек', onClick: () => navigate('taskComplexRhythm'), angle: 102 }, // Assuming sequence is rhythm or similar
    { icon: '🔢', label: 'Саны', onClick: () => navigate('taskMath'), angle: 154 }, // Math/Counting
    { icon: '👥', label: 'Жиілігі', onClick: () => navigate('taskSoundProperties'), angle: 205 }, // Frequency/Pitch
    { icon: '🅰️', label: 'Әріптер', onClick: () => navigate('taskLetters'), angle: 257 },
    { icon: '💃', label: 'Би', onClick: () => navigate('taskMusicTempo'), angle: 308 },
  ];

  return (
    <GradeMenuLayout>
      <RadialMenu
        centerContent={<span>1-сынып</span>}
        centerSize={160}
        centerGradient="linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)"
        items={items.map(i => ({ ...i, dist: 220 }))}
        size={600}
      />
    </GradeMenuLayout>
  );
};

/* Grade 2 Menu - Complex Layout */
export const Grade2MenuScreen = () => {
  const { navigate } = useGame();

  // Inner Ring (4 items)
  const innerItems = [
    { icon: '🎭', label: 'Ертегілер', onClick: () => navigate('taskMusicalTales'), angle: 0 }, // Top
    { icon: '🔤', label: 'C-Ш', onClick: () => navigate('taskLetterDiscrimination'), angle: 90 }, // Right
    { icon: '📐', label: 'Математика', onClick: () => navigate('taskMath'), angle: 180 }, // Bottom
    { icon: '⏱️', label: 'Сипаты', onClick: () => navigate('taskSoundProperties'), angle: 270 }, // Left
  ];

  // Outer Ring (11 items from screenshot)
  const outerItems = [
    { icon: '🔌', label: 'Тұрмыс', onClick: () => navigate('taskAppliances'), angle: 0 }, // Top
    { icon: '🚜', label: 'Tex-4', onClick: () => navigate('taskTechnical'), angle: 32 },
    { icon: '🌲', label: 'Табиғат', onClick: () => navigate('taskNature'), angle: 65 },
    { icon: '😂', label: 'Эмоция', onClick: () => navigate('taskHumanEmotions'), angle: 98 },
    { icon: '🔊', label: 'Тану', onClick: () => navigate('taskSoundDetect'), angle: 130 },
    { icon: '👤', label: 'Адам', onClick: () => navigate('taskHuman'), angle: 163 },
    { icon: '🎺', label: 'Аспап', onClick: () => navigate('taskInstruments'), angle: 196 },
    { icon: '🚗', label: 'Көлік', onClick: () => navigate('taskVehicles'), angle: 229 },
    { icon: '🏠', label: 'Үй', onClick: () => navigate('taskHome'), angle: 261 },
    { icon: '🦁', label: 'Жабайы', onClick: () => navigate('taskWildAnimals'), angle: 294 },
    { icon: '🏃', label: 'Етістік', onClick: () => navigate('taskVerbModule'), angle: 327 },
  ];

  return (
    <GradeMenuLayout>
      <RadialMenu
        centerContent={<span>2-сынып</span>}
        centerSize={160}
        centerGradient="linear-gradient(135deg, #F2994A 0%, #F2C94C 100%)"
        items={[
          ...innerItems.map(i => ({ ...i, dist: 180 })),
          ...outerItems.map(i => ({ ...i, dist: 310 })),
        ]}
        size={700}
      />
    </GradeMenuLayout>
  );
};

/* Grade 3 Menu */
export const Grade3MenuScreen = () => {
  const { navigate } = useGame();

  // Replicating style for consistency, though no specific screenshot provided for Grade 3 details in update request.
  // Converting existing Grade 3 items to this layout.
  const items = [
    { icon: '😊', label: 'Интонация', onClick: () => navigate('taskIntonation'), angle: 0 },
    { icon: '📝', label: 'Екпін', onClick: () => navigate('taskStress'), angle: 72 },
    { icon: '🔌', label: 'Техника', onClick: () => navigate('taskAppliances'), angle: 144 },
    { icon: '📋', label: 'Сөздер', onClick: () => navigate('taskWordType'), angle: 216 },
    { icon: '🎤', label: 'Әндер', onClick: () => navigate('taskNationalSongs'), angle: 288 },
  ];

  return (
    <GradeMenuLayout>
      <RadialMenu
        centerContent={<span>3-сынып</span>}
        centerSize={160}
        centerGradient="linear-gradient(135deg, #56CCF2 0%, #2F80ED 100%)"
        items={items.map(i => ({ ...i, dist: 220 }))}
        size={600}
      />
    </GradeMenuLayout>
  );
};

/* Grade 4 Menu */
export const Grade4MenuScreen = () => {
  const { navigate } = useGame();

  const items = [
    { icon: '📖', label: 'Ертегілер', onClick: () => navigate('taskStories'), angle: 0 },
    { icon: '💬', label: 'Диалогтар', onClick: () => navigate('taskDialog'), angle: 60 },
    { icon: '📖', label: 'Оқу', onClick: () => navigate('taskReading'), angle: 120 },
    { icon: '🎶', label: 'Ырғақ', onClick: () => navigate('taskComplexRhythm'), angle: 180 },
    { icon: '🧭', label: 'Бағыттар', onClick: () => navigate('taskDirection'), angle: 240 },
    { icon: '😊', label: 'Эмоция', onClick: () => navigate('taskHumanEmotions'), angle: 300 },
  ];

  return (
    <GradeMenuLayout>
      <RadialMenu
        centerContent={<span>4-сынып</span>}
        centerSize={160}
        centerGradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
        items={items.map(i => ({ ...i, dist: 220 }))}
        size={600}
      />
    </GradeMenuLayout>
  );
};

export default Grade1MenuScreen;
