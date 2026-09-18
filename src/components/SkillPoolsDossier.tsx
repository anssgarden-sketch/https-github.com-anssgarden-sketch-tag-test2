import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  ShieldCheck, 
  Crosshair, 
  Radar, 
  ShieldAlert, 
  User, 
  Briefcase, 
  MapPin, 
  Coins, 
  Zap, 
  Skull, 
  Clock 
} from 'lucide-react';

export const SkillPoolsDossier: React.FC = () => {
  const { character, account } = useGame();
  const [activePool, setActivePool] = useState<'assassination' | 'defensive' | 'intel' | 'counter_intel'>('defensive');

  if (!character) return null;

  const skills = character.character_skills || [];
  const assassinationSkills = skills.filter((cs) => cs.pool === 'assassination').map((cs) => cs.skills);
  const defensiveSkills = skills.filter((cs) => cs.pool === 'defensive').map((cs) => cs.skills);
  const intelSkills = skills.filter((cs) => cs.pool === 'intel').map((cs) => cs.skills);
  const counterIntelSkills = skills.filter((cs) => cs.pool === 'counter_intel').map((cs) => cs.skills);

  const poolMap = {
    assassination: {
      name: 'Assassination Pool',
      skills: assassinationSkills,
      icon: Crosshair,
      color: 'text-rose-400',
      border: 'border-rose-800',
      badge: 'bg-rose-950 text-rose-300',
      desc: 'Offensive capabilities deployed during Phase 3 strikes against tagged targets.',
    },
    defensive: {
      name: 'Defensive Pool',
      skills: defensiveSkills,
      icon: ShieldCheck,
      color: 'text-emerald-400',
      border: 'border-emerald-800',
      badge: 'bg-emerald-950 text-emerald-300',
      desc: 'Automatic protective counter-measures. If an incoming strike uses any of these 10 techniques, the attack is parried with 100% certainty.',
    },
    intel: {
      name: 'Intel Pool',
      skills: intelSkills,
      icon: Radar,
      color: 'text-cyan-400',
      border: 'border-cyan-800',
      badge: 'bg-cyan-950 text-cyan-300',
      desc: 'Surveillance probing methods used during Phase 1 to acquire 48h transponder tags across world sectors.',
    },
    counter_intel: {
      name: 'Counter-Intel Pool',
      skills: counterIntelSkills,
      icon: ShieldAlert,
      color: 'text-purple-400',
      border: 'border-purple-800',
      badge: 'bg-purple-950 text-purple-300',
      desc: 'Passive sensor jamming. If an opponent probes your sector using one of these 10 techniques, their scan fails without tagging you.',
    },
  };

  const currentPoolData = poolMap[activePool];

  return (
    <div className="space-y-6 font-mono">
      {/* Dossier Card */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-neutral-700 flex items-center justify-center text-amber-400">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-100">{character.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase font-bold">
                  {character.is_alive ? 'Operational' : 'Terminated'}
                </span>
              </div>
              <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-3 mt-1">
                <span>Profession: <strong className="text-neutral-200">{character.professions?.name}</strong></span>
                <span>•</span>
                <span>Station: <strong className="text-amber-400">{character.cities?.name}</strong></span>
                <span>•</span>
                <span>Account: <strong className="text-neutral-300">{account?.swiss_bank_number}</strong></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-500 uppercase block">Action Points</span>
              <span className="font-bold text-amber-400 text-sm">
                {character.action_points?.current_ap} / {character.action_points?.max_ap}
              </span>
            </div>
            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-500 uppercase block">Swiss Balance</span>
              <span className="font-bold text-emerald-400 text-sm">
                ${character.credits.toLocaleString()}
              </span>
            </div>
            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-500 uppercase block">Confirmed Kills</span>
              <span className="font-bold text-rose-400 text-sm">
                {character.kill_count}
              </span>
            </div>
            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-500 uppercase block">Survival Days</span>
              <span className="font-bold text-neutral-200 text-sm">
                {character.survival_days} Days
              </span>
            </div>
          </div>
        </div>

        {/* 4 Skill Pools Tabs */}
        <div className="mt-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-800 text-xs">
            {(['assassination', 'defensive', 'intel', 'counter_intel'] as const).map((key) => {
              const p = poolMap[key];
              const Icon = p.icon;
              const isActive = activePool === key;

              return (
                <button
                  key={key}
                  onClick={() => setActivePool(key)}
                  className={`px-4 py-2 rounded-xl border font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    isActive
                      ? `bg-neutral-800 ${p.color} ${p.border}`
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{p.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${p.badge}`}>
                    {p.skills.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              {currentPoolData.desc}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentPoolData.skills.map((s) => (
                <div
                  key={s.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-100 text-sm">{s.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 uppercase font-mono">
                      {s.range}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-400 leading-tight">
                    {s.description}
                  </p>

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500">
                    <span>AP Cost: <strong className="text-amber-400">{s.base_ap_cost} AP</strong></span>
                    <span>Fee: <strong className="text-emerald-400">${s.base_credit_cost}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
