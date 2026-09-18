import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Account, 
  Character, 
  TravelMapData, 
  ActiveTag, 
  AssassinationOutcome 
} from '../types';
import { 
  authApi, 
  characterApi, 
  travelApi, 
  intelApi, 
  assassinationApi, 
  testApi, 
  getStoredToken 
} from '../services/api';

interface GameContextType {
  account: Account | null;
  character: Character | null;
  travelMap: TravelMapData | null;
  activeTags: ActiveTag[];
  isLoading: boolean;
  isMapLoading: boolean;
  needsCharacterCreation: boolean;
  deathNotice: {
    isOpen: boolean;
    characterName?: string;
    details?: string;
  };
  dismissDeathNotice: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, handle: string) => Promise<void>;
  logout: () => void;
  refreshCharacter: () => Promise<void>;
  refreshTags: () => Promise<void>;
  createCharacter: (params: {
    name: string;
    city_id: string;
    profession_id: string;
    assassination_skills: string[];
    defensive_skills: string[];
    intel_skills: string[];
    counter_intel_skills: string[];
  }) => Promise<void>;
  initiateTravel: (destId: string, mode: 'air' | 'rail' | 'water' | 'road') => Promise<any>;
  cancelTravel: () => Promise<any>;
  performIntelSearch: (params: {
    target_city_id: string;
    skill_id: string;
    target_name?: string;
    is_sweep: boolean;
  }) => Promise<any>;
  abortSurveillance: () => Promise<any>;
  executeAssassination: (targetId: string, skillId: string) => Promise<AssassinationOutcome>;
  // Test Tools
  triggerApRegen: () => Promise<void>;
  drainAp: () => Promise<void>;
  topupCredits: () => Promise<void>;
  resurrect: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [travelMap, setTravelMap] = useState<TravelMapData | null>(null);
  const [activeTags, setActiveTags] = useState<ActiveTag[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMapLoading, setIsMapLoading] = useState<boolean>(false);
  const [needsCharacterCreation, setNeedsCharacterCreation] = useState<boolean>(false);
  const [deathNotice, setDeathNotice] = useState<{
    isOpen: boolean;
    characterName?: string;
    details?: string;
  }>({ isOpen: false });

  const dismissDeathNotice = () => {
    setDeathNotice({ isOpen: false });
  };

  // Refresh character details
  const refreshCharacter = useCallback(async () => {
    try {
      const res = await characterApi.getMe();
      if (res && res.character) {
        // If character died recently, notify
        if (!res.character.is_alive && character && character.is_alive) {
          setDeathNotice({
            isOpen: true,
            characterName: res.character.name,
            details: 'Your operative was eliminated in the field. An emergency liquidation notice has been sent to your Swiss bank.',
          });
        }
        setCharacter(res.character);
        setNeedsCharacterCreation(!res.character.is_alive);
      }
    } catch (err: any) {
      if (err?.data?.needs_character_creation || err?.status === 404) {
        setCharacter(null);
        setNeedsCharacterCreation(true);
      }
    }
  }, [character]);

  // Refresh active tags
  const refreshTags = useCallback(async () => {
    try {
      const res = await intelApi.getActiveTags();
      setActiveTags(res.active_tags || []);
    } catch {
      setActiveTags([]);
    }
  }, []);

  // Fetch world map & routes
  const loadTravelMap = useCallback(async () => {
    try {
      setIsMapLoading(true);
      const data = await travelApi.getMap();
      setTravelMap(data);
    } catch (err) {
      console.error('Failed to load travel map data', err);
    } finally {
      setIsMapLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const meRes = await authApi.me();
        setAccount(meRes.account);
        await refreshCharacter();
        await refreshTags();
        await loadTravelMap();
      } catch (err) {
        console.error('Auth verification failed', err);
        authApi.logout();
        setAccount(null);
        setCharacter(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [refreshCharacter, refreshTags, loadTravelMap]);

  // Periodic polling (e.g. check for arrival / AP regen / death)
  useEffect(() => {
    if (!account || !character) return;
    const interval = setInterval(() => {
      refreshCharacter();
      refreshTags();
    }, 15000);
    return () => clearInterval(interval);
  }, [account, character, refreshCharacter, refreshTags]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, pass);
      setAccount(res.account);
      await refreshCharacter();
      await refreshTags();
      await loadTravelMap();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string, handle: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(email, pass, handle);
      setAccount(res.account);
      setNeedsCharacterCreation(true);
      await loadTravelMap();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setAccount(null);
    setCharacter(null);
    setActiveTags([]);
    setNeedsCharacterCreation(false);
  };

  const createCharacter = async (params: {
    name: string;
    city_id: string;
    profession_id: string;
    assassination_skills: string[];
    defensive_skills: string[];
    intel_skills: string[];
    counter_intel_skills: string[];
  }) => {
    await characterApi.create(params);
    setNeedsCharacterCreation(false);
    await refreshCharacter();
  };

  const initiateTravel = async (destId: string, mode: 'air' | 'rail' | 'water' | 'road') => {
    const result = await travelApi.initiate(destId, mode);
    await refreshCharacter();
    await refreshTags();
    return result;
  };

  const cancelTravel = async () => {
    const result = await travelApi.cancel();
    await refreshCharacter();
    await refreshTags();
    return result;
  };

  const performIntelSearch = async (params: {
    target_city_id: string;
    skill_id: string;
    target_name?: string;
    is_sweep: boolean;
  }) => {
    const result = await intelApi.search(params);
    await refreshCharacter();
    await refreshTags();
    return result;
  };

  const abortSurveillance = async () => {
    const result = await intelApi.abort();
    await refreshCharacter();
    await refreshTags();
    return result;
  };

  const executeAssassination = async (targetId: string, skillId: string): Promise<AssassinationOutcome> => {
    const result = await assassinationApi.execute(targetId, skillId);
    if (result.outcome === 'counter_attacked') {
      setDeathNotice({
        isOpen: true,
        characterName: character?.name,
        details: `Your strike on the target triggered a lethal counter-attack. Your operative was terminated.`,
      });
    }
    await refreshCharacter();
    await refreshTags();
    return result;
  };

  // Test Utilities
  const triggerApRegen = async () => {
    await testApi.triggerApRegen();
    await refreshCharacter();
  };

  const drainAp = async () => {
    await testApi.drainAp();
    await refreshCharacter();
  };

  const topupCredits = async () => {
    await testApi.topupCredits();
    await refreshCharacter();
  };

  const resurrect = async () => {
    await testApi.resurrect();
    setNeedsCharacterCreation(false);
    await refreshCharacter();
  };

  return (
    <GameContext.Provider
      value={{
        account,
        character,
        travelMap,
        activeTags,
        isLoading,
        isMapLoading,
        needsCharacterCreation,
        deathNotice,
        dismissDeathNotice,
        login,
        register,
        logout,
        refreshCharacter,
        refreshTags,
        createCharacter,
        initiateTravel,
        cancelTravel,
        performIntelSearch,
        abortSurveillance,
        executeAssassination,
        triggerApRegen,
        drainAp,
        topupCredits,
        resurrect,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
