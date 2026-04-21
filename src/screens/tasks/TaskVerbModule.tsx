import { useEffect, useRef, useState } from 'react';
import { Lock, RotateCcw, Volume2 } from 'lucide-react';
import TaskLayout from '@/components/game/TaskLayout';
import { useGame } from '@/contexts/GameContext';
import { playError, playSuccess } from '@/lib/audioUtils';
import { speakTtsText, stopTtsPlayback } from '@/lib/ttsClient';
import { cn } from '@/lib/utils';

type SheetKey = 'buttonsSheetOne' | 'buttonsSheetTwo' | 'dragSheetOne' | 'dragSheetTwo';
type ModuleTab = 'buttons' | 'drag';

type CropConfig = {
  sheet: SheetKey;
  x: number;
  y: number;
  w: number;
  h: number;
};

type VerbButtonCard = CropConfig & {
  id: string;
  label: string;
  page: 1 | 2;
};

type DragCard = CropConfig & {
  id: string;
  label: string;
};

type DragRound = {
  id: string;
  prompt: string;
  target: string[];
};

const SHEETS: Record<SheetKey, { src: string; width: number; height: number }> = {
  buttonsSheetOne: {
    src: '/assets/verbs/buttons-sheet-1.jpg',
    width: 899,
    height: 1599,
  },
  buttonsSheetTwo: {
    src: '/assets/verbs/buttons-sheet-2.jpg',
    width: 899,
    height: 1599,
  },
  dragSheetOne: {
    src: '/assets/verbs/drag-sheet-1.jpg',
    width: 1599,
    height: 899,
  },
  dragSheetTwo: {
    src: '/assets/verbs/drag-sheet-2.jpg',
    width: 1599,
    height: 899,
  },
};

const BUTTON_PICTOGRAMS: VerbButtonCard[] = [
  { id: 'wash-hands', label: 'Қол жуды', page: 1, sheet: 'buttonsSheetOne', x: 70, y: 290, w: 340, h: 330 },
  { id: 'eat-at-table', label: 'Тамақ ішті', page: 1, sheet: 'buttonsSheetOne', x: 430, y: 300, w: 340, h: 320 },
  { id: 'brush-teeth', label: 'Тісін тазалады', page: 1, sheet: 'buttonsSheetOne', x: 60, y: 600, w: 350, h: 350 },
  { id: 'computer', label: 'Компьютерде отырды', page: 1, sheet: 'buttonsSheetOne', x: 430, y: 600, w: 350, h: 350 },
  { id: 'sleep', label: 'Ұйықтады', page: 1, sheet: 'buttonsSheetOne', x: 35, y: 950, w: 370, h: 390 },
  { id: 'wake-up', label: 'Оянды', page: 1, sheet: 'buttonsSheetOne', x: 430, y: 950, w: 360, h: 390 },
  { id: 'play-ball', label: 'Доп ойнады', page: 2, sheet: 'buttonsSheetTwo', x: 175, y: 280, w: 310, h: 260 },
  { id: 'build', label: 'Құрастырды', page: 2, sheet: 'buttonsSheetTwo', x: 495, y: 280, w: 320, h: 260 },
  { id: 'watch-tv', label: 'Теледидар көрді', page: 2, sheet: 'buttonsSheetTwo', x: 150, y: 520, w: 350, h: 310 },
  { id: 'swim', label: 'Суға түсті', page: 2, sheet: 'buttonsSheetTwo', x: 500, y: 520, w: 320, h: 310 },
  { id: 'throw-trash', label: 'Қоқыс тастады', page: 2, sheet: 'buttonsSheetTwo', x: 150, y: 810, w: 360, h: 330 },
  { id: 'sweep', label: 'Сыпырды', page: 2, sheet: 'buttonsSheetTwo', x: 500, y: 810, w: 330, h: 330 },
];

const DRAG_CARDS: DragCard[] = [
  { id: 'boy', label: 'Бала', sheet: 'dragSheetOne', x: 140, y: 90, w: 270, h: 340 },
  { id: 'ball', label: 'Доп', sheet: 'dragSheetOne', x: 470, y: 210, w: 260, h: 220 },
  { id: 'kick', label: 'Доп тепті', sheet: 'dragSheetOne', x: 770, y: 150, w: 320, h: 280 },
  { id: 'cat', label: 'Мысық', sheet: 'dragSheetOne', x: 100, y: 450, w: 300, h: 360 },
  { id: 'milk', label: 'Сүт', sheet: 'dragSheetOne', x: 520, y: 520, w: 330, h: 270 },
  { id: 'drink', label: 'Ішті', sheet: 'dragSheetOne', x: 850, y: 520, w: 330, h: 290 },
  { id: 'eat-meal', label: 'Тамақ ішті', sheet: 'dragSheetTwo', x: 40, y: 70, w: 430, h: 290 },
  { id: 'eat-bread', label: 'Нан жеді', sheet: 'dragSheetTwo', x: 440, y: 110, w: 420, h: 260 },
  { id: 'drink-water', label: 'Су ішті', sheet: 'dragSheetTwo', x: 840, y: 120, w: 430, h: 260 },
  { id: 'wash-hands-drag', label: 'Қол жуды', sheet: 'dragSheetTwo', x: 20, y: 450, w: 360, h: 330 },
  { id: 'wash-face', label: 'Бетін жуды', sheet: 'dragSheetTwo', x: 380, y: 440, w: 420, h: 350 },
  { id: 'comb-hair', label: 'Шашын тарады', sheet: 'dragSheetTwo', x: 800, y: 430, w: 450, h: 360 },
];

const DRAG_ROUNDS: DragRound[] = [
  {
    id: 'boy-ball-kick',
    prompt: 'Бала доп тепті',
    target: ['boy', 'ball', 'kick'],
  },
  {
    id: 'cat-milk-drink',
    prompt: 'Мысық сүт ішті',
    target: ['cat', 'milk', 'drink'],
  },
];

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

const SheetPictogram = ({
  crop,
  className,
}: {
  crop: CropConfig;
  className?: string;
}) => {
  const sheet = SHEETS[crop.sheet];

  return (
    <div aria-hidden="true" className={cn('relative w-full h-full overflow-hidden rounded-[22px] bg-white', className)}>
      <div
        className="absolute left-0 top-0 bg-no-repeat"
        style={{
          width: `${(sheet.width / crop.w) * 100}%`,
          height: `${(sheet.height / crop.h) * 100}%`,
          backgroundImage: `url(${sheet.src})`,
          backgroundSize: '100% 100%',
          transform: `translate(-${(crop.x / sheet.width) * 100}%, -${(crop.y / sheet.height) * 100}%)`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
};

const TaskVerbModule = () => {
  const { triggerReward } = useGame();
  const [activeTab, setActiveTab] = useState<ModuleTab>('buttons');
  const [buttonsPage, setButtonsPage] = useState<1 | 2>(1);
  const [pressedButtonId, setPressedButtonId] = useState<string | null>(null);
  const [speakingButtonId, setSpeakingButtonId] = useState<string | null>(null);
  const [buttonsHint, setButtonsHint] = useState('Карточканы басып тыңдаңыз немесе "Ойнау" арқылы бетті түгел ойнатыңыз.');
  const [isButtonSequencePlaying, setIsButtonSequencePlaying] = useState(false);

  const [dragRound, setDragRound] = useState<DragRound | null>(null);
  const [dragSlots, setDragSlots] = useState<Array<string | null>>([null, null, null]);
  const [dragUnlocked, setDragUnlocked] = useState(false);
  const [dragHint, setDragHint] = useState('Алдымен "Ойнау" түймесін басып, сөйлемді тыңдаңыз.');
  const [dragHintTone, setDragHintTone] = useState<'info' | 'success' | 'error'>('info');
  const [selectedBankCardId, setSelectedBankCardId] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [shakeSlots, setShakeSlots] = useState(false);
  const [isPromptPlaying, setIsPromptPlaying] = useState(false);

  const narrationRunRef = useRef(0);
  const pressTimeoutRef = useRef<number | null>(null);

  const visibleButtonCards = BUTTON_PICTOGRAMS.filter(card => card.page === buttonsPage);
  const availableDragCards = DRAG_CARDS.filter(card => !dragSlots.includes(card.id));

  useEffect(() => {
    return () => {
      narrationRunRef.current += 1;
      clearPressState();
      stopTtsPlayback();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function clearPressState() {
    if (pressTimeoutRef.current !== null) {
      window.clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }
  }

  function stopNarration() {
    narrationRunRef.current += 1;
    clearPressState();
    stopTtsPlayback();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingButtonId(null);
    setIsButtonSequencePlaying(false);
    setIsPromptPlaying(false);
  }

  function pulseButton(buttonId: string) {
    clearPressState();
    setPressedButtonId(buttonId);
    pressTimeoutRef.current = window.setTimeout(() => {
      setPressedButtonId(null);
      pressTimeoutRef.current = null;
    }, 220);
  }

  async function speakWithFallback(text: string, runId: number) {
    if (runId !== narrationRunRef.current) {
      return false;
    }

    const result = await speakTtsText(text, {
      lang: 'kk-KZ',
      speed: 0.88,
      playbackRate: 1,
      timeoutMs: 2200,
      waitUntilEnd: true,
    });

    if (runId !== narrationRunRef.current) {
      return false;
    }

    if (result.ok) {
      return true;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    return new Promise(resolve => {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const matchedVoice =
        voices.find(voice => voice.lang.toLowerCase().startsWith('kk')) ||
        voices.find(voice => voice.lang.toLowerCase().startsWith('ru')) ||
        voices[0];

      if (matchedVoice) {
        utterance.voice = matchedVoice;
        utterance.lang = matchedVoice.lang;
      } else {
        utterance.lang = 'kk-KZ';
      }

      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onend = () => resolve(runId === narrationRunRef.current);
      utterance.onerror = () => resolve(false);

      synth.cancel();
      synth.speak(utterance);
    });
  }

  async function speakSingleButton(card: VerbButtonCard) {
    stopNarration();
    const runId = narrationRunRef.current;
    pulseButton(card.id);
    setSpeakingButtonId(card.id);
    setButtonsHint(`${card.label} дыбысталып жатыр...`);
    await speakWithFallback(card.label, runId);

    if (runId === narrationRunRef.current) {
      setSpeakingButtonId(null);
      setButtonsHint('Карточканы басып тыңдаңыз немесе "Ойнау" арқылы бетті түгел ойнатыңыз.');
    }
  }

  async function playButtonsPage() {
    stopNarration();
    const runId = narrationRunRef.current;

    setIsButtonSequencePlaying(true);
    setButtonsHint('Пиктограммалар кезекпен дыбысталып жатыр...');

    for (const card of visibleButtonCards) {
      if (runId !== narrationRunRef.current) {
        return;
      }

      setSpeakingButtonId(card.id);
      await speakWithFallback(card.label, runId);
      await wait(160);
    }

    if (runId === narrationRunRef.current) {
      setSpeakingButtonId(null);
      setIsButtonSequencePlaying(false);
      setButtonsHint('Осы беттің барлық 6 пиктограммасы ойнатылды.');
    }
  }

  function toggleButtonsPage() {
    stopNarration();
    setButtonsPage(prev => (prev === 1 ? 2 : 1));
    setButtonsHint('Жаңа бет ашылды. Енді пиктограммаларды тыңдай аласыз.');
  }

  function pickNextRound(currentId?: string | null) {
    const candidates = DRAG_ROUNDS.filter(round => round.id !== currentId);
    const pool = candidates.length ? candidates : DRAG_ROUNDS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async function startDragRound() {
    stopNarration();

    const nextRound = pickNextRound(dragRound?.id);
    const runId = narrationRunRef.current;

    setDragRound(nextRound);
    setDragSlots(Array(nextRound.target.length).fill(null));
    setDragUnlocked(false);
    setSelectedBankCardId(null);
    setDragHint('Сөйлем дыбысталып жатыр...');
    setDragHintTone('info');
    setIsPromptPlaying(true);

    await speakWithFallback(nextRound.prompt, runId);

    if (runId === narrationRunRef.current) {
      setDragUnlocked(true);
      setIsPromptPlaying(false);
      setDragHint('Енді карточкаларды дұрыс ретпен орналастырыңыз.');
      setDragHintTone('info');
    }
  }

  function resetDragSlots() {
    if (!dragRound) {
      return;
    }

    setDragSlots(Array(dragRound.target.length).fill(null));
    setSelectedBankCardId(null);
    setHoveredSlot(null);
  }

  function handleIncorrectSequence() {
    playError();
    setDragUnlocked(false);
    setShakeSlots(true);
    setDragHint('Қате реттік. Қайтадан орналастырып көріңіз.');
    setDragHintTone('error');

    window.setTimeout(() => {
      setShakeSlots(false);
      resetDragSlots();
      setDragUnlocked(true);
    }, 650);
  }

  function verifyDragSequence(nextSlots: Array<string | null>) {
    if (!dragRound) {
      return;
    }

    if (!nextSlots.every(Boolean)) {
      return;
    }

    const isCorrect = dragRound.target.every((targetId, index) => nextSlots[index] === targetId);

    if (isCorrect) {
      playSuccess();
      setDragUnlocked(false);
      setDragHint('Дұрыс! Жарайсың!');
      setDragHintTone('success');
      triggerReward();
      return;
    }

    handleIncorrectSequence();
  }

  function placeCardIntoSlot(cardId: string, slotIndex: number) {
    if (!dragUnlocked || !dragRound) {
      return;
    }

    const nextSlots = [...dragSlots];
    const currentSlotIndex = nextSlots.findIndex(value => value === cardId);

    if (currentSlotIndex !== -1) {
      nextSlots[currentSlotIndex] = null;
    }

    nextSlots[slotIndex] = cardId;
    setDragSlots(nextSlots);
    setSelectedBankCardId(null);
    setHoveredSlot(null);
    verifyDragSequence(nextSlots);
  }

  function removeCardFromSlot(slotIndex: number) {
    if (!dragUnlocked) {
      return;
    }

    if (!dragSlots[slotIndex]) {
      return;
    }

    const nextSlots = [...dragSlots];
    nextSlots[slotIndex] = null;
    setDragSlots(nextSlots);
  }

  return (
    <TaskLayout>
      <div className="w-full max-w-7xl flex flex-col gap-6 pb-20">
        <div className="glass-panel rounded-[36px] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center rounded-full bg-white/15 px-4 py-1 text-sm font-bold tracking-wide text-white/90">
                2-деңгей • Етістік
              </div>
              <h1 className="text-3xl font-black sm:text-4xl">Етістік модулі</h1>
              <p className="max-w-3xl text-base text-white/85 sm:text-lg">
                Алдымен пиктограммаларды тыңдап үйреніңіз, содан кейін сөйлемді тыңдап, карточкаларды дұрыс ретпен орналастырыңыз.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className={cn(
                  'rounded-full px-5 py-3 text-sm font-extrabold transition-all sm:text-base',
                  activeTab === 'buttons'
                    ? 'bg-white text-slate-900 shadow-[0_12px_30px_rgba(255,255,255,0.35)]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                )}
                onClick={() => {
                  stopNarration();
                  setActiveTab('buttons');
                }}
              >
                1-тапсырма • Батырмалар
              </button>
              <button
                className={cn(
                  'rounded-full px-5 py-3 text-sm font-extrabold transition-all sm:text-base',
                  activeTab === 'drag'
                    ? 'bg-[#FFF3C7] text-slate-900 shadow-[0_12px_30px_rgba(255,243,199,0.4)]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                )}
                onClick={() => {
                  stopNarration();
                  setActiveTab('drag');
                }}
              >
                2-тапсырма • Drag-and-drop
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'buttons' ? (
          <div className="glass-panel rounded-[36px] p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">Пиктограмма батырмалары</h2>
                <p className="mt-2 max-w-3xl text-base text-white/80">
                  Бетте 6 пиктограмма көрсетіледі. Батырманы басқанда сол әрекет дыбысталады, ал белсенді карточка аздап үлкейіп, жарқырап тұрады.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className={cn(
                    'game-btn game-btn-success flex items-center gap-2 px-6 py-3 text-base',
                    isButtonSequencePlaying && 'pointer-events-none opacity-80'
                  )}
                  onClick={playButtonsPage}
                >
                  <Volume2 className="h-5 w-5" />
                  Ойнау
                </button>
                <button
                  className="game-btn game-btn-secondary px-6 py-3 text-base"
                  onClick={toggleButtonsPage}
                >
                  {buttonsPage === 1 ? 'Келесі' : 'Алдыңғы'}
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-[28px] bg-black/20 px-4 py-3 text-sm font-bold text-white/85">
              <span>{buttonsHint}</span>
              <span className="rounded-full bg-white/15 px-3 py-1">Бет {buttonsPage}/2</span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleButtonCards.map(card => {
                const isPressed = pressedButtonId === card.id;
                const isSpeaking = speakingButtonId === card.id;

                return (
                  <button
                    key={card.id}
                    type="button"
                    className={cn(
                      'group relative overflow-hidden rounded-[30px] border border-white/20 bg-white/90 p-4 text-left text-slate-900 transition-all duration-300',
                      'hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(8,47,73,0.22)]',
                      isPressed && 'scale-[0.97]',
                      isSpeaking && 'scale-[1.03] shadow-[0_0_0_3px_rgba(251,191,36,0.75),0_24px_50px_rgba(251,191,36,0.35)]'
                    )}
                    onClick={() => speakSingleButton(card)}
                    aria-label={card.label}
                  >
                    <div className="absolute inset-x-5 top-4 h-16 rounded-full bg-gradient-to-r from-[#FFE082] via-[#9BE7FF] to-[#C1FFB3] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-60" />
                    <div className="relative overflow-hidden rounded-[24px] bg-slate-50 aspect-square border border-slate-200">
                      <SheetPictogram crop={card} />
                    </div>
                    <div className="relative mt-4 flex items-center justify-between gap-3">
                      <span className="text-lg font-black leading-tight">{card.label}</span>
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] transition-colors',
                          isSpeaking ? 'bg-amber-200 text-amber-950' : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {isSpeaking ? 'тыңдалып тұр' : 'тыңдау'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-[36px] p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">Drag-and-drop тапсырмасы</h2>
                <p className="mt-2 max-w-3xl text-base text-white/80">
                  Алдымен сөйлемді тыңдаңыз. Тыңдалғаннан кейін ғана карточкалар ашылады. Дұрыс реттілік жасалса, марапат модалы ашылады.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className={cn(
                    'game-btn game-btn-success flex items-center gap-2 px-6 py-3 text-base',
                    isPromptPlaying && 'pointer-events-none opacity-80'
                  )}
                  onClick={startDragRound}
                >
                  <Volume2 className="h-5 w-5" />
                  Ойнау
                </button>
                <button
                  className="game-btn game-btn-secondary flex items-center gap-2 px-6 py-3 text-base"
                  onClick={resetDragSlots}
                >
                  <RotateCcw className="h-5 w-5" />
                  Тазалау
                </button>
              </div>
            </div>

            <div
              className={cn(
                'mt-4 rounded-[28px] px-4 py-3 text-sm font-bold',
                dragHintTone === 'success' && 'bg-emerald-500/20 text-emerald-100',
                dragHintTone === 'error' && 'bg-rose-500/20 text-rose-100',
                dragHintTone === 'info' && 'bg-black/20 text-white/85'
              )}
            >
              {dragHint}
            </div>

            <div
              className={cn(
                'mt-6 grid gap-3 md:grid-cols-3',
                shakeSlots && 'translate-x-1'
              )}
            >
              {dragSlots.map((cardId, index) => {
                const card = DRAG_CARDS.find(item => item.id === cardId) || null;

                return (
                  <div
                    key={`slot-${index}`}
                    className={cn(
                      'min-h-[210px] rounded-[28px] border-2 border-dashed px-4 py-4 transition-all duration-300',
                      hoveredSlot === index ? 'border-amber-300 bg-amber-100/25' : 'border-white/35 bg-white/10',
                      shakeSlots && 'scale-[0.99]'
                    )}
                    onDragOver={event => {
                      if (!dragUnlocked) {
                        return;
                      }

                      event.preventDefault();
                      setHoveredSlot(index);
                    }}
                    onDragLeave={() => setHoveredSlot(current => (current === index ? null : current))}
                    onDrop={event => {
                      event.preventDefault();
                      const cardKey = event.dataTransfer.getData('text/plain');
                      if (cardKey) {
                        placeCardIntoSlot(cardKey, index);
                      }
                    }}
                    onClick={() => {
                      if (selectedBankCardId) {
                        placeCardIntoSlot(selectedBankCardId, index);
                        return;
                      }

                      removeCardFromSlot(index);
                    }}
                  >
                    <div className="mb-3 flex items-center justify-between text-sm font-extrabold uppercase tracking-[0.2em] text-white/70">
                      <span>Орын {index + 1}</span>
                      {!dragUnlocked && <Lock className="h-4 w-4" />}
                    </div>

                    {card ? (
                      <div className="flex h-full flex-col gap-3">
                        <div className="aspect-[1.05/1] overflow-hidden rounded-[22px] bg-white/95">
                          <SheetPictogram crop={card} />
                        </div>
                        <button
                          type="button"
                          className="rounded-full bg-slate-900/85 px-4 py-2 text-sm font-bold text-white"
                          onClick={event => {
                            event.stopPropagation();
                            removeCardFromSlot(index);
                          }}
                        >
                          Орнынан алу
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-[150px] items-center justify-center rounded-[22px] bg-white/5 text-center text-sm font-bold text-white/60">
                        Карточканы осы жерге апарыңыз
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-[32px] border border-white/15 bg-black/15 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">12 карточка</h3>
                  <p className="text-sm text-white/75">
                    {dragRound ? 'Дұрыс сөйлемге сәйкес 3 карточканы таңдаңыз.' : 'Ойнау түймесін басқаннан кейін карточкалар ашылады.'}
                  </p>
                </div>
                {!dragUnlocked && (
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/80">
                    <Lock className="h-4 w-4" />
                    Блоктаулы
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {availableDragCards.map(card => {
                  const isSelected = selectedBankCardId === card.id;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      draggable={dragUnlocked}
                      className={cn(
                        'relative overflow-hidden rounded-[26px] border border-white/15 bg-white/95 p-3 transition-all duration-300',
                        dragUnlocked ? 'cursor-grab hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(15,23,42,0.18)]' : 'cursor-not-allowed opacity-45',
                        isSelected && 'ring-4 ring-amber-300/80'
                      )}
                      onClick={() => {
                        if (!dragUnlocked) {
                          return;
                        }

                        setSelectedBankCardId(current => (current === card.id ? null : card.id));
                      }}
                      onDragStart={event => {
                        if (!dragUnlocked) {
                          event.preventDefault();
                          return;
                        }

                        setDraggedCardId(card.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', card.id);
                      }}
                      onDragEnd={() => {
                        setDraggedCardId(null);
                        setHoveredSlot(null);
                      }}
                      aria-label={card.label}
                    >
                      {!dragUnlocked && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/35">
                          <Lock className="h-9 w-9 text-white" />
                        </div>
                      )}

                      <div className="aspect-[1.05/1] overflow-hidden rounded-[22px] bg-slate-50">
                        <SheetPictogram crop={card} className={draggedCardId === card.id ? 'opacity-75' : ''} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </TaskLayout>
  );
};

export default TaskVerbModule;
