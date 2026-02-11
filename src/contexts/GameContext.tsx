import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Screen =
  | 'home'
  | 'grades'
  | 'grade0Menu'
  | 'grade0Sounds'
  | 'grade0Voice'
  | 'grade1Menu'
  | 'grade2Menu'
  | 'grade3Menu'
  | 'grade4Menu'
  | 'taskSoundDetect'
  | 'taskInstruments'
  | 'taskAnimals'
  | 'taskRhythm'
  | 'taskNature'
  | 'taskHuman'
  | 'taskVehicles'
  | 'taskHome'
  | 'taskLetters'
  | 'taskVoiceTrain';

type Character = 'fox' | 'rabbit' | 'robot';

interface GameState {
  screen: Screen;
  previousScreen: Screen;
  coins: number;
  character: Character;
  showReward: boolean;
}

interface GameContextType extends GameState {
  navigate: (screen: Screen) => void;
  goBack: () => void;
  addCoins: (amount: number) => void;
  selectCharacter: (char: Character) => void;
  triggerReward: () => void;
  closeReward: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
};

const screenParents: Partial<Record<Screen, Screen>> = {
  grades: 'home',
  grade0Menu: 'grades',
  grade0Sounds: 'grade0Menu',
  grade0Voice: 'grade0Menu',
  grade1Menu: 'grades',
  grade2Menu: 'grades',
  grade3Menu: 'grades',
  grade4Menu: 'grades',
  taskSoundDetect: 'grade0Sounds',
  taskInstruments: 'grade0Sounds',
  taskAnimals: 'grade0Sounds',
  taskRhythm: 'grade0Sounds',
  taskNature: 'grade0Sounds',
  taskHuman: 'grade0Sounds',
  taskVehicles: 'grade0Sounds',
  taskHome: 'grade0Sounds',
  taskLetters: 'grade1Menu',
  taskVoiceTrain: 'grade0Voice',
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GameState>({
    screen: 'home',
    previousScreen: 'home',
    coins: 0,
    character: 'fox',
    showReward: false,
  });

  const navigate = useCallback((screen: Screen) => {
    setState(prev => ({ ...prev, previousScreen: prev.screen, screen }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      const parent = screenParents[prev.screen] || 'home';
      return { ...prev, previousScreen: prev.screen, screen: parent };
    });
  }, []);

  const addCoins = useCallback((amount: number) => {
    setState(prev => ({ ...prev, coins: prev.coins + amount }));
  }, []);

  const selectCharacter = useCallback((character: Character) => {
    setState(prev => ({ ...prev, character }));
  }, []);

  const triggerReward = useCallback(() => {
    setState(prev => ({ ...prev, showReward: true, coins: prev.coins + 10 }));
  }, []);

  const closeReward = useCallback(() => {
    setState(prev => ({ ...prev, showReward: false }));
  }, []);

  return (
    <GameContext.Provider value={{ ...state, navigate, goBack, addCoins, selectCharacter, triggerReward, closeReward }}>
      {children}
    </GameContext.Provider>
  );
};
