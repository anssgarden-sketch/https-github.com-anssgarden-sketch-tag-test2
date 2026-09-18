import React, { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { AuthView } from './components/AuthView';
import { CharacterCreationModal } from './components/CharacterCreationModal';
import { WorldTravelMap } from './components/WorldTravelMap';
import { IntelTerminal } from './components/IntelTerminal';
import { AssassinationDossier } from './components/AssassinationDossier';
import { SkillPoolsDossier } from './components/SkillPoolsDossier';
import { DarkWebWire } from './components/DarkWebWire';
import { Radio, ShieldAlert } from 'lucide-react';

const MainContent: React.FC = () => {
  const { account, character, isLoading, needsCharacterCreation, activeTags } = useGame();
  const [currentTab, setTab] = useState<TabType>('travel');
  const [selectedTargetForStrike, setSelectedTargetForStrike] = useState<string | null>(null);
  const [prefilledIntelTarget, setPrefilledIntelTarget] = useState<{ name: string; cityName?: string } | null>(null);

  // Transition from Intel tag to Assassination strike
  const handleSelectTargetForStrike = (targetId: string) => {
    setSelectedTargetForStrike(targetId);
    setTab('assassination');
  };

  // Jump from Dark Web bulletin directly to Intel hunt
  const handleHuntTarget = (targetName: string, targetCity?: string) => {
    setPrefilledIntelTarget({ name: targetName, cityName: targetCity });
    setTab('intel');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-amber-400 flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span>CONNECTING TO CLANDESTINE NODE...</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!account) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-mono">
        <AuthView />
      </div>
    );
  }

  // Needs character creation (new account or character killed)
  if (needsCharacterCreation || !character) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-mono">
        <Header />
        <CharacterCreationModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300 font-mono">
      {/* Top Operative Navigation & Status */}
      <Header />
      <Navigation 
        currentTab={currentTab} 
        setTab={setTab} 
        tagCount={activeTags.length} 
      />

      {/* Primary Terminal Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {currentTab === 'travel' && <WorldTravelMap />}
        {currentTab === 'intel' && (
          <IntelTerminal 
            onSelectTargetForStrike={handleSelectTargetForStrike} 
            initialTarget={prefilledIntelTarget}
          />
        )}
        {currentTab === 'assassination' && (
          <AssassinationDossier 
            selectedTargetId={selectedTargetForStrike}
            onSelectTarget={setSelectedTargetForStrike}
          />
        )}
        {currentTab === 'skills' && <SkillPoolsDossier />}
        {currentTab === 'darkweb' && <DarkWebWire onHuntTarget={handleHuntTarget} />}
      </main>

      {/* Terminal Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950/90 py-4 px-4 text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-amber-500/80 animate-pulse" />
            <span>TAG-GAME // MMORPG ENGINE</span>
            <span className="text-neutral-700">|</span>
            <span>NODE ACTIVE • ZERO-RNG RESOLUTION</span>
          </div>
          <div className="text-neutral-600 text-[11px]">
            Round-Up Rates • 48h Tags • Permadeath Escrow
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <GameProvider>
      <MainContent />
    </GameProvider>
  );
}

export default App;
