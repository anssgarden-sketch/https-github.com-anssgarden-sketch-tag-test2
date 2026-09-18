import React from 'react';
import { 
  Globe, 
  Radar, 
  Crosshair, 
  ShieldCheck, 
  Terminal, 
  BookOpen
} from 'lucide-react';

export type TabType = 'travel' | 'intel' | 'assassination' | 'skills' | 'darkweb';

interface NavigationProps {
  currentTab: TabType;
  setTab: (tab: TabType) => void;
  tagCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, setTab, tagCount }) => {
  const tabs = [
    {
      id: 'travel' as TabType,
      label: 'World Map & Travel',
      icon: Globe,
      badge: null,
    },
    {
      id: 'intel' as TabType,
      label: 'Phase 1: Intel & Radar',
      icon: Radar,
      badge: tagCount > 0 ? `${tagCount} Active` : null,
    },
    {
      id: 'assassination' as TabType,
      label: 'Phase 3: Assassination Strike',
      icon: Crosshair,
      badge: null,
    },
    {
      id: 'skills' as TabType,
      label: 'Skill Pools & Dossier',
      icon: ShieldCheck,
      badge: null,
    },
    {
      id: 'darkweb' as TabType,
      label: 'Dark Web Wire',
      icon: Terminal,
      badge: null,
    },
  ];

  return (
    <nav className="border-b border-neutral-800 bg-neutral-900/60 font-mono">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-neutral-800 text-amber-400 border-amber-500/50 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-neutral-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
