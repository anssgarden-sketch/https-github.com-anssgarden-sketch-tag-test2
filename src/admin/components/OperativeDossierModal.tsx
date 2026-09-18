import React, { useState } from 'react';
import { PlayerOperative } from '../adminApi';
import { 
  X, 
  User, 
  Bot, 
  Skull, 
  Zap, 
  Coins, 
  MapPin, 
  Briefcase, 
  Clock, 
  Calendar, 
  Copy, 
  Check, 
  Sliders, 
  Crosshair, 
  ShieldCheck, 
  Radar, 
  EyeOff, 
  Shield, 
  Radio, 
  FileText,
  Lock,
  Plus,
  Minus,
  RefreshCw,
  Sparkles,
  Terminal,
  Loader2
} from 'lucide-react';

interface OperativeDossierModalProps {
  player: PlayerOperative;
  onClose: () => void;
  onOpenEditResources: (player: PlayerOperative) => void;
  onQuickToggleAlive?: (player: PlayerOperative) => void;
  onQuickToggleType?: (player: PlayerOperative) => void;
  onQuickApChange?: (player: PlayerOperative, delta: number) => void;
  onQuickCreditsChange?: (player: PlayerOperative, delta: number) => void;
  onImpersonateOperative?: (player: PlayerOperative) => void;
}

export const OperativeDossierModal: React.FC<OperativeDossierModalProps> = ({
  player,
  onClose,
  onOpenEditResources,
  onQuickToggleAlive,
  onQuickToggleType,
  onQuickApChange,
  onQuickCreditsChange,
  onImpersonateOperative,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeSkillTab, setActiveSkillTab] = useState<'all' | 'assassination' | 'defensive' | 'intel' | 'counter_intel'>('all');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isNpc = player.player_type === 'NPC';
  const isAlive = player.is_alive;
  const currentAp = player.action_points?.current_ap ?? 0;
  const maxAp = player.action_points?.max_ap ?? 4;

  // Separate skills by pool
  const skillsList = player.character_skills || [];
  const assSkills = skillsList.filter(cs => cs.pool === 'assassination');
  const defSkills = skillsList.filter(cs => cs.pool === 'defensive');
  const intelSkills = skillsList.filter(cs => cs.pool === 'intel');
  const counterIntelSkills = skillsList.filter(cs => cs.pool === 'counter_intel');

  const displayedSkills = activeSkillTab === 'all'
    ? skillsList
    : skillsList.filter(cs => cs.pool === activeSkillTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-neutral-950 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Classified Dossier Top Banner */}
        <div className="bg-neutral-900 border-b border-neutral-800 p-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border ${
              isNpc
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-400'
                : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
            }`}>
              {isNpc ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 font-bold">
                  CLASSIFIED DOSSIER // TOP SECRET
                </span>
                
                {/* Player Type Badge */}
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 border ${
                  isNpc
                    ? 'bg-amber-950 text-amber-300 border-amber-600/60'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-600/60'
                }`}>
                  {isNpc ? (
                    <>
                      <Bot className="w-3 h-3 text-amber-400" />
                      <span>TYPE: NPC (BOT / SYSTEM OPERATIVE)</span>
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 text-emerald-400" />
                      <span>TYPE: PC (HUMAN PLAYER CHARACTER)</span>
                    </>
                  )}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-neutral-100 font-sans flex items-center gap-2 mt-0.5">
                <span>{player.name}</span>
                {player.accounts?.dark_web_handle && (
                  <span className="text-xs font-mono text-amber-400 font-medium">
                    [@{player.accounts.dark_web_handle}]
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close Dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Dossier Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs font-sans">
          
          {/* Status & Rapid Operational Actions Bar */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Vital Status Badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400 font-mono text-[11px]">Vital State:</span>
                {isAlive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    ACTIVE / OPERATIONAL
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-rose-950/80 text-rose-300 border border-rose-700">
                    <Skull className="w-3.5 h-3.5" />
                    K.I.A. / TERMINATED
                  </span>
                )}
              </div>

              {/* Player Type Switcher Action */}
              {onQuickToggleType && (
                <button
                  type="button"
                  onClick={() => onQuickToggleType(player)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Toggle between PC (Human) and NPC (Bot)"
                >
                  <RefreshCw className="w-3 h-3 text-amber-400" />
                  <span>Switch to {isNpc ? 'PC (Human)' : 'NPC (Bot)'}</span>
                </button>
              )}

              {/* Status Toggle Action */}
              {onQuickToggleAlive && (
                <button
                  type="button"
                  onClick={() => onQuickToggleAlive(player)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isAlive
                      ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/80'
                      : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/80'
                  }`}
                  title={isAlive ? 'Mark as Eliminated' : 'Revive Operative'}
                >
                  <Skull className="w-3 h-3" />
                  <span>{isAlive ? 'Mark as Fallen' : 'Revive to Active'}</span>
                </button>
              )}
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenEditResources(player);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold font-mono text-xs shadow-md transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Direct AP & Credits Editor</span>
            </button>
          </div>

          {/* If Eliminated: Casualty Report Box */}
          {!isAlive && (
            <div className="bg-rose-950/30 border border-rose-900/60 rounded-xl p-4 font-mono space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Skull className="w-4 h-4" />
                <span>CASUALTY DEBRIEF // PERMADEATH RECORD</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] text-neutral-300 pt-1">
                <div>
                  <span className="text-neutral-500 block">Killed By Account:</span>
                  <span className="text-neutral-200">{player.killed_by_account_id || 'Classified / Unknown'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Lethal Technique:</span>
                  <span className="text-neutral-200">{player.killed_with_skill_id || 'Sniper / Poison'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Casualty Sector:</span>
                  <span className="text-neutral-200">{player.killed_in_city_id || player.cities?.name || 'Sector Grid'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Time of Termination:</span>
                  <span className="text-neutral-200">
                    {player.killed_at ? new Date(player.killed_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* High-Level Vitals Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            {/* AP Card with Quick Adjustments */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  Action Points
                </span>
                <span className="text-neutral-500 text-[10px]">Cap: {maxAp}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-amber-400">{currentAp}</span>
                <span className="text-neutral-500 text-sm">/ {maxAp} AP</span>
              </div>
              
              {/* Visual AP Battery Pips */}
              <div className="flex items-center gap-1 pt-1">
                {Array.from({ length: Math.min(12, maxAp) }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 flex-1 rounded-sm ${
                      idx < currentAp 
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
                        : 'bg-neutral-800'
                    }`}
                  />
                ))}
              </div>

              {onQuickApChange && (
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <button
                    onClick={() => onQuickApChange(player, -1)}
                    className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white cursor-pointer"
                    title="-1 AP"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-neutral-500">Quick Nudge</span>
                  <button
                    onClick={() => onQuickApChange(player, 1)}
                    className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white cursor-pointer"
                    title="+1 AP"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Swiss Bank Credits Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span className="flex items-center gap-1 text-cyan-400 font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  Bank Credits
                </span>
                <span className="text-neutral-500 text-[10px]">Liquid</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-cyan-300">
                  {(player.credits || 0).toLocaleString()}
                </span>
                <span className="text-neutral-500 text-xs font-sans">¢</span>
              </div>
              <div className="text-[10px] text-neutral-500 truncate">
                Acct: {player.accounts?.swiss_bank_number || 'SB-UNASSIGNED'}
              </div>

              {onQuickCreditsChange && (
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <button
                    onClick={() => onQuickCreditsChange(player, -500)}
                    className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-rose-300 cursor-pointer"
                    title="-500 Credits"
                  >
                    -500
                  </button>
                  <button
                    onClick={() => onQuickCreditsChange(player, 500)}
                    className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-cyan-300 cursor-pointer"
                    title="+500 Credits"
                  >
                    +500
                  </button>
                </div>
              )}
            </div>

            {/* Gold Bullion Coins */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gold Coins
                </span>
                <span className="text-neutral-500 text-[10px]">Persistent</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-amber-200">
                  {player.accounts?.gold_coins || 0}
                </span>
                <span className="text-neutral-500 text-xs">Coins</span>
              </div>
              <div className="text-[10px] text-neutral-500">
                Survives Permadeath
              </div>
            </div>

            {/* Field Track Record */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-1 text-[11px]">
              <div className="text-neutral-400 font-bold pb-1 border-b border-neutral-800">
                Career Track
              </div>
              <div className="flex justify-between text-neutral-300">
                <span className="text-neutral-500">Kills:</span>
                <span className="font-bold text-rose-400">{player.kill_count || 0}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span className="text-neutral-500">Intel Sold:</span>
                <span className="font-bold text-cyan-400">{player.intel_sold_count || 0}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span className="text-neutral-500">Survived:</span>
                <span className="font-bold text-emerald-400">{player.survival_days || 0}d</span>
              </div>
            </div>
          </div>

          {/* Identity & Underground Profile + Deployment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Identity & Account Specs */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3 font-mono">
              <h3 className="text-xs font-bold text-neutral-200 tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-2">
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                <span>IDENTIFICATION & SECURITY PROFILE</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Player Type:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    isNpc 
                      ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {player.player_type || 'PC'} ({isNpc ? 'Non-Player Bot' : 'Human Player'})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Dark Web Codename:</span>
                  <span className="text-amber-400 font-bold">
                    @{player.accounts?.dark_web_handle || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Encrypted Email:</span>
                  <span className="text-neutral-200 truncate max-w-[200px]" title={player.accounts?.email}>
                    {player.accounts?.email || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Swiss Bank Account:</span>
                  <span className="text-cyan-300 font-bold">
                    {player.accounts?.swiss_bank_number || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                  <span className="text-neutral-500">Operative UUID:</span>
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <span className="text-[10px]">{player.id.substring(0, 16)}...</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(player.id, 'char_id')}
                      className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white"
                      title="Copy Character ID"
                    >
                      {copiedField === 'char_id' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Account ID:</span>
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <span className="text-[10px]">
                      {player.accounts?.id ? `${player.accounts.id.substring(0, 16)}...` : 'N/A'}
                    </span>
                    {player.accounts?.id && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(player.accounts?.id || '', 'acc_id')}
                        className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white"
                        title="Copy Account ID"
                      >
                        {copiedField === 'acc_id' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                  <span>Created:</span>
                  <span>{new Date(player.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Field Location & Cover Profession */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3 font-mono">
              <h3 className="text-xs font-bold text-neutral-200 tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-2">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>SECTOR DEPLOYMENT & COVER STORY</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Current City Sector:</span>
                  <div className="text-neutral-100 font-bold text-sm flex items-center gap-1.5 font-sans mt-0.5">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    <span>{player.cities?.name || 'Sector Grid'}</span>
                    <span className="text-xs text-neutral-400 font-mono">
                      ({player.cities?.country} / {player.cities?.continent})
                    </span>
                  </div>
                </div>

                {/* Travel & Mobility Status */}
                <div className="pt-1">
                  <span className="text-neutral-500 block text-[10px]">Mobility Status:</span>
                  <div className="mt-0.5">
                    {player.travel_status === 'in_transit' ? (
                      <div className="p-2 rounded bg-amber-950/40 border border-amber-700/60 text-amber-300 text-[11px]">
                        <span className="font-bold">IN TRANSIT</span> to {player.destination_city?.name || 'Destination'} via {player.transport_mode || 'Transport'}.
                      </div>
                    ) : (
                      <span className="text-emerald-400 text-[11px]">
                        Stationary in Safehouse ({player.cities?.name})
                      </span>
                    )}
                  </div>
                </div>

                {/* Profession / Day Job */}
                <div className="pt-2 border-t border-neutral-800/80">
                  <span className="text-neutral-500 block text-[10px]">Cover Identity (Profession):</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold text-neutral-100 font-sans flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                      {player.professions?.name || 'Unemployed'}
                    </span>
                    <span className="text-[11px] text-amber-400">
                      {player.professions?.ap_modifier !== undefined && (
                        <span>{player.professions.ap_modifier >= 0 ? `+${player.professions.ap_modifier}` : player.professions.ap_modifier} AP Modifier</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                    <span>Weekly Income: {player.professions?.credits_per_week || 0} ¢</span>
                    <span className="capitalize">{player.professions?.schedule_type || 'Full Time'}</span>
                  </div>

                  {player.professions?.description && (
                    <p className="text-[10px] text-neutral-500 italic mt-1 font-sans">
                      "{player.professions.description}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full Skills Matrix (The 26 Skills Loadout) */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-neutral-100 font-mono tracking-wider flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-amber-400" />
                  <span>EQUIPPED SKILLS MATRIX ({skillsList.length} / 26 SKILLS)</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  All active offensive, defensive, and intelligence capabilities assigned to this operative.
                </p>
              </div>

              {/* Skill Category Tabs */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px] font-mono overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveSkillTab('all')}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                    activeSkillTab === 'all'
                      ? 'bg-neutral-800 text-amber-400 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  All ({skillsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSkillTab('assassination')}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                    activeSkillTab === 'assassination'
                      ? 'bg-neutral-800 text-rose-400 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Assassination ({assSkills.length}/3)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSkillTab('defensive')}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                    activeSkillTab === 'defensive'
                      ? 'bg-neutral-800 text-blue-400 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Defensive ({defSkills.length}/10)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSkillTab('intel')}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                    activeSkillTab === 'intel'
                      ? 'bg-neutral-800 text-cyan-400 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Intel ({intelSkills.length}/3)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSkillTab('counter_intel')}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                    activeSkillTab === 'counter_intel'
                      ? 'bg-neutral-800 text-purple-400 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Counter-Intel ({counterIntelSkills.length}/10)
                </button>
              </div>
            </div>

            {/* Skills Grid */}
            {displayedSkills.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 font-mono text-xs">
                No skills found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {displayedSkills.map((cs) => {
                  const s = cs.skills;
                  const pool = cs.pool;

                  const poolBadge = {
                    assassination: { label: 'Assassination', color: 'text-rose-400 bg-rose-950/60 border-rose-800/80', icon: Crosshair },
                    defensive: { label: 'Defensive', color: 'text-blue-400 bg-blue-950/60 border-blue-800/80', icon: ShieldCheck },
                    intel: { label: 'Intel', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/80', icon: Radar },
                    counter_intel: { label: 'Counter-Intel', color: 'text-purple-400 bg-purple-950/60 border-purple-800/80', icon: EyeOff },
                  }[pool] || { label: pool, color: 'text-neutral-400 bg-neutral-800 border-neutral-700', icon: FileText };

                  const IconComp = poolBadge.icon;

                  return (
                    <div
                      key={cs.id}
                      className="bg-neutral-950/80 border border-neutral-800/90 rounded-xl p-3 space-y-1.5 font-mono hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-bold text-neutral-200 text-xs font-sans leading-tight">
                          {s?.name || 'Unknown Technique'}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${poolBadge.color}`}>
                          <IconComp className="w-2.5 h-2.5" />
                          {poolBadge.label}
                        </span>
                      </div>

                      {s?.description && (
                        <p className="text-[11px] text-neutral-400 line-clamp-2 font-sans">
                          {s.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-900">
                        <span>Range: <strong className="text-neutral-300 capitalize">{s?.range || 'Local'}</strong></span>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">{s?.base_ap_cost ?? 1} AP</span>
                          {(s?.base_credit_cost ?? 0) > 0 && (
                            <span className="text-cyan-400">{s?.base_credit_cost} ¢</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-neutral-900 border-t border-neutral-800 p-4 px-6 flex items-center justify-between shrink-0 font-mono text-xs">
          <span className="text-neutral-500 text-[11px]">
            Operative Classification ID: <strong className="text-neutral-300">{player.id.substring(0, 8)}</strong>
          </span>

          <div className="flex items-center gap-3">
            {onImpersonateOperative && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onImpersonateOperative(player);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  isNpc
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                }`}
                title={`Launch terminal and control ${player.name}`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{isNpc ? 'Assume Control (Impersonate NPC)' : 'Play as Operative'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
            >
              Close Dossier
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenEditResources(player);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-colors cursor-pointer"
            >
              Adjust AP & Credits
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
