import React from 'react';
import { ShieldCheck, LogOut, Terminal, ExternalLink, RefreshCw, UserCheck, Download } from 'lucide-react';

interface AdminHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: 'skills' | 'cities' | 'travel' | 'config' | 'players' | 'npcs') => void;
  adminUser?: { username: string; role: string } | null;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onRefresh,
  isRefreshing,
  onLogout,
  activeTab,
  setActiveTab,
  adminUser,
}) => {
  return (
    <header className="bg-neutral-900 border-b border-amber-500/30 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400 tracking-wider text-sm">TAG GAME ENGINE</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  Admin Console
                </span>
                {adminUser && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                    <span>{adminUser.username}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">Rules, Skills, Cities & Rates Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <a
              href="/TAG_PROJECT_MASTER_BRIEFING_AND_ROADMAP.md"
              download="TAG_PROJECT_MASTER_BRIEFING_AND_ROADMAP.md"
              className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
              title="Download Briefing (.md)"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/50 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('players')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'players'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Operatives & AP/Credits
          </button>
          <button
            onClick={() => setActiveTab('npcs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'npcs'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            NPC Generator
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'skills'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Skills Pool
          </button>
          <button
            onClick={() => setActiveTab('cities')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'cities'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Cities & Sectors
          </button>
          <button
            onClick={() => setActiveTab('travel')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'travel'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Travel Modes & Routes
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'config'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            AP & Cost Formulas
          </button>
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="/TAG_PROJECT_MASTER_BRIEFING_AND_ROADMAP.md"
            download="TAG_PROJECT_MASTER_BRIEFING_AND_ROADMAP.md"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 text-xs border border-amber-500/40 transition-colors"
            title="Download Full Project Briefing & Roadmap (.md)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Roadmap (.md)</span>
          </a>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Sync Live</span>
          </button>
          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs border border-neutral-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Return to Game</span>
          </a>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs border border-rose-800/60 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
