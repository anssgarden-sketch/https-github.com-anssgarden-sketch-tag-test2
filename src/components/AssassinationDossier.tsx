import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ActiveTag, Skill, AssassinationOutcome } from '../types';
import { 
  Crosshair, 
  Skull, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  Coins, 
  MapPin, 
  Flame, 
  Radio,
  ChevronDown,
  Search,
  Check
} from 'lucide-react';

interface AssassinationDossierProps {
  selectedTargetId: string | null;
  onSelectTarget: (id: string | null) => void;
}

export const AssassinationDossier: React.FC<AssassinationDossierProps> = ({
  selectedTargetId,
  onSelectTarget,
}) => {
  const { character, travelMap, activeTags, executeAssassination } = useGame();

  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [outcome, setOutcome] = useState<AssassinationOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dropdown menu state
  const [isSkillMenuOpen, setIsSkillMenuOpen] = useState(false);
  const [skillFilter, setSkillFilter] = useState('');
  const skillMenuRef = useRef<HTMLDivElement>(null);

  const cities = travelMap?.cities || [];

  // Attacker's Assassination skills
  const assassinationSkills = useMemo(() => {
    if (!character?.character_skills) return [];
    return character.character_skills
      .filter((cs) => cs.pool === 'assassination')
      .map((cs) => cs.skills);
  }, [character?.character_skills]);

  // Selected skill
  const activeSkill = useMemo(() => {
    if (!selectedSkillId && assassinationSkills.length > 0) return assassinationSkills[0];
    return assassinationSkills.find((s) => s.id === selectedSkillId) || assassinationSkills[0] || null;
  }, [assassinationSkills, selectedSkillId]);

  // Close skill menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (skillMenuRef.current && !skillMenuRef.current.contains(e.target as Node)) {
        setIsSkillMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter skills in dropdown
  const filteredAssassinationSkills = useMemo(() => {
    if (!skillFilter.trim()) return assassinationSkills;
    const q = skillFilter.toLowerCase();
    return assassinationSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.range && s.range.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [assassinationSkills, skillFilter]);

  // Find active tag for selected target
  const targetTag = useMemo(() => {
    if (!selectedTargetId) return null;
    return activeTags.find((t) => t.characters?.id === selectedTargetId) || null;
  }, [activeTags, selectedTargetId]);

  const targetCharacter = targetTag?.characters;
  const targetCityId = targetCharacter?.current_city_id || targetTag?.tagged_in_city_id;
  const targetCityObj = cities.find((c) => c.id === targetCityId);
  const targetCityName = targetCityObj?.name || targetCharacter?.cities?.name || targetTag?.cities?.name || 'Unknown';
  const attackerCityName = character?.cities?.name || 'Unknown';

  // Range validation:
  // - Remote Assassination: targets anywhere in the globe (map)
  // - Long range and below (Long, Medium, Short, Close): operative and mark must be in the exact same city
  const rangeValidation = useMemo(() => {
    if (!activeSkill || !targetTag) {
      return { eligible: false, reason: 'Designate a tagged mark and select an assassination skill.' };
    }

    const isRemote = activeSkill.range?.toLowerCase() === 'remote';
    if (isRemote) {
      return {
        eligible: true,
        reason: `Remote precision strike vector validated: ${activeSkill.name} can engage targets in any sector across the global map (Target: ${targetCityName}).`,
      };
    }

    const sameCity = character?.current_city_id && targetCityId && character.current_city_id === targetCityId;
    if (!sameCity) {
      return {
        eligible: false,
        reason: `${activeSkill.name} has ${activeSkill.range?.toUpperCase()} range. Assassination skills Long range and below require you to be in the same city as the target. Operative is in ${attackerCityName}, mark is in ${targetCityName}. Relocate to target sector or utilize a Remote Assassination skill (Car Bomb, IED, Drone Strike, Poison Gas, Cyber Kill).`,
      };
    }

    return {
      eligible: true,
      reason: `Local sector vector validated (${attackerCityName}): Mark is confirmed within ${activeSkill.range?.toUpperCase()} execution perimeter.`,
    };
  }, [activeSkill, targetTag, character?.current_city_id, targetCityId, attackerCityName, targetCityName]);

  const currentAp = character?.action_points?.current_ap ?? 0;
  const currentCredits = character?.credits ?? 0;
  const apCost = activeSkill?.base_ap_cost || 0;
  const creditCost = activeSkill?.base_credit_cost || 0;
  const canAfford = currentAp >= apCost && currentCredits >= creditCost;

  const handleStrike = async () => {
    if (!selectedTargetId || !activeSkill || !rangeValidation.eligible || !canAfford) return;

    setIsExecuting(true);
    setError(null);
    setOutcome(null);

    try {
      const res = await executeAssassination(selectedTargetId, activeSkill.id);
      setOutcome(res);
      if (res.outcome === 'killed') {
        onSelectTarget(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Strike execution failed.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Top Banner */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-rose-500" />
            <span>Phase 3: Tactical Assassination Strike</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Deterministic combat engine. Zero dice rolls. Target's defensive pool and counter-attack range determine life or death.
          </p>
        </div>

        <div className="text-xs bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="text-neutral-500">Confirmed Kills:</span>
          <span className="text-rose-400 font-bold">{character?.kill_count || 0} Targets Eliminated</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Outcome Resolution Modal Card */}
      {outcome && (
        <div className={`p-5 rounded-2xl border text-xs shadow-2xl space-y-3 animate-in fade-in ${
          outcome.outcome === 'killed'
            ? 'bg-emerald-950/40 border-emerald-600/80 text-emerald-200'
            : outcome.outcome === 'counter_attacked'
            ? 'bg-rose-950/70 border-rose-600 text-rose-200'
            : 'bg-amber-950/40 border-amber-600/80 text-amber-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {outcome.outcome === 'killed' && <Skull className="w-6 h-6 text-emerald-400" />}
            {outcome.outcome === 'counter_attacked' && <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />}
            {(outcome.outcome === 'survived' || outcome.outcome === 'mutual_survival') && (
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            )}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {outcome.outcome === 'killed' && 'OPERATION SUCCESS // TARGET TERMINATED'}
                {outcome.outcome === 'counter_attacked' && 'FATAL AMBUSH // ATTACKER ELIMINATED BY COUNTER-STRIKE'}
                {outcome.outcome === 'survived' && 'TARGET DEFENSE TRIGGERED // ATTACK BLOCKED'}
                {outcome.outcome === 'mutual_survival' && 'MUTUAL DEFENSIVE PARRIES // BOTH OPERATIVES SURVIVED'}
              </h3>
              <p className="text-xs opacity-90">{outcome.message}</p>
            </div>
          </div>

          <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800 text-[11px] text-neutral-300 space-y-1">
            {outcome.skill_used && <div>Offensive Skill Deployed: <strong className="text-neutral-100">{outcome.skill_used}</strong></div>}
            {outcome.counter_skill_used && <div>Counter-Skill Deployed by Target: <strong className="text-rose-400">{outcome.counter_skill_used}</strong></div>}
            <div>Attacker Anonymity: <strong className="text-neutral-400">Strictly Preserved (Unrevealed to Public Wire)</strong></div>
          </div>

          {/* Unsanctioned Assault: Vendetta Retaliation Warning */}
          {outcome.vendetta_bounty && (
            <div className="bg-rose-950/90 border border-rose-600 p-3.5 rounded-xl text-xs space-y-1.5 text-rose-100 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-rose-900 text-rose-200 font-bold uppercase text-[10px] tracking-wider border border-rose-500">
                  ⚠️ PRIVATE BLOOD-DEBT DECLARED
                </span>
                <span className="text-amber-400 font-mono font-bold">
                  BOUNTY: ${outcome.vendetta_bounty.bounty_credits.toLocaleString()} CHF
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Because this attack targeted an operative without an official Sedes Obscura contract, associates of the mark (<strong className="text-white">{outcome.vendetta_bounty.issued_by}</strong>) have placed an open private vendetta on your head!
              </p>
              <div className="text-[10px] text-rose-300 font-mono">
                Wire status: Underworld bounty live on the Dark Web registry. Contractors are now authorized to collect.
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tagged Target Selector (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="border-b border-neutral-800 pb-2">
            <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              1. Designate Tagged Target
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Assassination strikes require an active surveillance tag from Phase 1.
            </p>
          </div>

          {activeTags.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-500">
              No active surveillance tags available. Run Phase 1 Intel Recon to tag targets first.
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {activeTags.map((tag) => {
                const targetChar = tag.characters;
                const isSelected = selectedTargetId === targetChar?.id;
                const cityName = tag.cities?.name || targetChar?.cities?.name || 'Unknown';

                return (
                  <div
                    key={tag.id}
                    onClick={() => onSelectTarget(targetChar?.id || null)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-md'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-sm">{targetChar?.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${
                        isSelected ? 'bg-rose-900 text-rose-200' : 'bg-neutral-900 text-neutral-400'
                      }`}>
                        {isSelected ? 'LOCKED' : 'SELECT'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        <span>Sector: {cityName}</span>
                      </span>
                      {targetChar?.travel_status === 'in_transit' && (
                        <span className="text-amber-400 text-[10px]">In-Transit</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Strike Weaponry & Execution (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="border-b border-neutral-800 pb-2">
              <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                2. Select Execution Technique & Range
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Only skills configured in your Assassination Pool can be deployed.
              </p>
            </div>

            {/* Target Summary if Selected */}
            {targetCharacter && (
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Acquired Mark:</span>
                  <span className="font-bold text-neutral-100 text-sm">{targetCharacter.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-500 uppercase block">Target Location:</span>
                  <span className="font-bold text-cyan-400">{targetCityName}</span>
                </div>
              </div>
            )}

            {/* Assassination Skills Drop-down / Pull-up Menu */}
            <div className="relative" ref={skillMenuRef}>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="assassination-skill-menu-trigger" className="block text-neutral-400 text-xs font-semibold">
                  Assassination Skills
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {assassinationSkills.length} Skill{assassinationSkills.length === 1 ? '' : 's'} in Arsenal
                </span>
              </div>

              {/* Menu Trigger Button */}
              <button
                type="button"
                id="assassination-skill-menu-trigger"
                onClick={() => setIsSkillMenuOpen(!isSkillMenuOpen)}
                className={`w-full bg-neutral-950 border rounded-xl px-3.5 py-2.5 text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isSkillMenuOpen
                    ? 'border-rose-500 ring-1 ring-rose-500/50'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
                aria-haspopup="listbox"
                aria-expanded={isSkillMenuOpen}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-rose-950/70 border border-rose-700/60 flex items-center justify-center shrink-0 text-rose-400">
                    <Crosshair className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="font-bold text-neutral-200 text-xs truncate flex items-center gap-2">
                      <span>{activeSkill?.name || 'Select Assassination Skill'}</span>
                      {activeSkill?.range === 'remote' ? (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/70 text-purple-300 border border-purple-700/50 uppercase font-mono">
                          Global Map
                        </span>
                      ) : activeSkill ? (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/70 text-amber-300 border border-amber-700/50 uppercase font-mono">
                          Same City
                        </span>
                      ) : null}
                    </div>
                    {activeSkill && (
                      <div className="text-[10px] text-neutral-500 mt-0.5 truncate flex items-center gap-2">
                        <span>
                          Range: <strong className={activeSkill.range === 'remote' ? 'text-purple-400 uppercase' : 'text-amber-400 uppercase'}>{activeSkill.range}</strong>
                        </span>
                        <span>•</span>
                        <span>{activeSkill.base_ap_cost} AP</span>
                        <span>•</span>
                        <span>${activeSkill.base_credit_cost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] text-rose-400 font-bold hidden sm:inline-block">
                    {isSkillMenuOpen ? 'CLOSE' : 'CHANGE'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                      isSkillMenuOpen ? 'rotate-180 text-rose-400' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Drop-down / Pull-up Menu Panel */}
              {isSkillMenuOpen && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-neutral-950 border border-rose-500/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Search Filter Header (if > 3 skills in arsenal) */}
                  {assassinationSkills.length > 3 && (
                    <div className="p-2 border-b border-neutral-800 bg-neutral-900/60">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          type="text"
                          value={skillFilter}
                          onChange={(e) => setSkillFilter(e.target.value)}
                          placeholder="Search assassination skills..."
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Skills List */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-neutral-900 scrollbar-thin scrollbar-thumb-neutral-800">
                    {filteredAssassinationSkills.length === 0 ? (
                      <div className="p-4 text-center text-xs text-neutral-500">
                        No assassination skills match "{skillFilter}"
                      </div>
                    ) : (
                      filteredAssassinationSkills.map((s) => {
                        const isSelected = activeSkill?.id === s.id;
                        const isRemote = s.range?.toLowerCase() === 'remote';

                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedSkillId(s.id);
                              setIsSkillMenuOpen(false);
                            }}
                            className={`p-3 text-left transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                              isSelected
                                ? 'bg-rose-950/40 hover:bg-rose-950/60'
                                : 'hover:bg-neutral-900/80'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-neutral-200 text-xs">{s.name}</span>

                                {/* Range Badge */}
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase border ${
                                    isRemote
                                      ? 'bg-purple-950/60 text-purple-300 border-purple-700/50'
                                      : s.range === 'long'
                                      ? 'bg-blue-950/60 text-blue-300 border-blue-700/50'
                                      : s.range === 'medium'
                                      ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                                      : 'bg-rose-950/60 text-rose-300 border-rose-700/50'
                                  }`}
                                >
                                  {s.range} {isRemote ? '• Global Map' : '• Same City'}
                                </span>
                              </div>

                              {s.description && (
                                <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                                  {s.description}
                                </p>
                              )}

                              <div className="text-[10px] text-neutral-500 mt-1.5 flex items-center gap-2">
                                <span>
                                  AP: <strong className="text-neutral-300">{s.base_ap_cost}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Fee: <strong className="text-neutral-300">${s.base_credit_cost.toLocaleString()}</strong>
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center shrink-0 mt-0.5 text-rose-400">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Selected Skill Dossier Strip */}
              {activeSkill && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-rose-950/20 border border-rose-900/40 text-[11px] text-neutral-300 flex items-start gap-2">
                  <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <span className="text-rose-200 font-semibold">{activeSkill.name}:</span>{' '}
                    <span className="text-neutral-400">
                      {activeSkill.description || 'Lethal assassination execution method.'}{' '}
                      <span className="text-neutral-500">
                        ({activeSkill.range?.toLowerCase() === 'remote' ? 'Target can be in any world sector' : 'Requires mark to be in the same city'})
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Range & Strike Vector Check */}
            <div className={`p-3 rounded-xl border text-xs ${
              rangeValidation.eligible
                ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/30 border-rose-800/80 text-rose-300'
            }`}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {rangeValidation.eligible ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>{rangeValidation.eligible ? 'Strike Vector Validated' : 'Vector Ineligible'}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-300">
                {rangeValidation.reason}
              </p>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs space-y-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>Action Points:</span>
                <span className={`font-bold ${currentAp < apCost ? 'text-rose-400' : 'text-neutral-200'}`}>
                  {apCost} AP (Available: {currentAp})
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Execution Fee:</span>
                <span className={`font-bold ${currentCredits < creditCost ? 'text-rose-400' : 'text-neutral-200'}`}>
                  ${creditCost.toLocaleString()} Credits (Balance: ${currentCredits.toLocaleString()})
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800">
            <button
              type="button"
              disabled={!selectedTargetId || !rangeValidation.eligible || !canAfford || isExecuting}
              onClick={handleStrike}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xl flex items-center justify-center gap-2"
            >
              <Crosshair className="w-4 h-4" />
              <span>
                {isExecuting
                  ? 'Executing Strike Operation...'
                  : !selectedTargetId
                  ? 'Designate Tagged Target First'
                  : !rangeValidation.eligible
                  ? 'Target Out Of Range'
                  : !canAfford
                  ? 'Insufficient AP / Credits'
                  : `Authorize Lethal Strike on ${targetCharacter?.name}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
