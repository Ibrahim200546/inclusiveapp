import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

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
  | 'taskVoiceTrain'
  | 'taskWildAnimals'
  | 'taskSyllables'
  | 'taskTechnical'
  | 'taskAppliances'
  | 'taskFamiliarWords'
  | 'taskLetterDiscrimination'
  | 'taskMath'
  | 'taskSoundProperties'
  | 'taskMusicalTales'
  | 'taskMusicTempo'
  | 'taskIntonation'
  | 'taskStress'
  | 'taskWordType'
  | 'taskNationalSongs'
  | 'taskStories'
  | 'taskDialog'
  | 'taskReading'
  | 'taskComplexRhythm'
  | 'taskDirection'
  | 'taskHumanEmotions'
  | 'taskArticulationMap';

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
  toggleTheme: () => void;
  theme: 'day' | 'night';
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
  // New tasks
  taskWildAnimals: 'grade1Menu',
  taskSyllables: 'grade2Menu',
  taskTechnical: 'grade2Menu',
  taskAppliances: 'grade3Menu',
  taskFamiliarWords: 'grade2Menu',
  taskLetterDiscrimination: 'grade2Menu',
  taskMath: 'grade2Menu',
  taskSoundProperties: 'grade2Menu',
  taskMusicalTales: 'grade2Menu',
  taskMusicTempo: 'grade2Menu',
  taskIntonation: 'grade3Menu',
  taskStress: 'grade3Menu',
  taskWordType: 'grade3Menu',
  taskNationalSongs: 'grade3Menu',
  taskStories: 'grade4Menu',
  taskDialog: 'grade4Menu',
  taskReading: 'grade4Menu',
  taskComplexRhythm: 'grade4Menu',
  taskDirection: 'grade4Menu',
  taskHumanEmotions: 'grade4Menu',
  taskArticulationMap: 'grade0Voice',
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GameState>({
    screen: 'home',
    previousScreen: 'home',
    coins: 0,
    character: 'fox',
    showReward: false,
  });

  const [theme, setTheme] = useState<'day' | 'night'>('day');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const loadProgress = async () => {
      const { data } = await supabase
        .from('game_progress')
        .select('coins, selected_character')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setState(prev => ({
          ...prev,
          coins: data.coins,
          character: (data.selected_character as Character) || 'fox'
        }));
      } else {
        await supabase.from('game_progress').insert({ user_id: user.id });
      }
    };
    loadProgress();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      supabase.from('game_progress').upsert({
        user_id: user.id,
        coins: state.coins,
        selected_character: state.character,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.coins, state.character, user]);

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

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'day' ? 'night' : 'day');
  }, []);

  return (
    <GameContext.Provider value={{ ...state, theme, navigate, goBack, addCoins, selectCharacter, triggerReward, closeReward, toggleTheme }}>
      {children}
    </GameContext.Provider>
  );
};
