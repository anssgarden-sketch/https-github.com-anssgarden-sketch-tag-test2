import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Skill, City, ActiveTag } from '../types';
import { 
  Radar, 
  Search, 
  Target, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  MapPin, 
  Zap, 
  Coins,
  Ban,
  AlertTriangle,
  RefreshCw,
  Eye,
  ChevronDown,
  Check
} from 'lucide-react';

interface IntelTerminalProps {
  onSelectTargetForStrike: (targetId: string) => void;
  initialTarget?: { name?: string; cityId?: string; cityName?: string } | null;
}

export const IntelTerminal: React.FC<IntelTerminalProps> = ({ onSelectTargetForStrike, initialTarget }) => {
  const { character, travelMap, activeTags, performIntelSearch, abortSurveillance, refreshCharacter, refreshTags } = useGame();

  const [searchMode, setSearchMode] = useState<'single' | 'sweep'>('single');
  const [targetName, setTargetName] = useState(initialTarget?.name || '');
  const [targetCityId, setTargetCityId] = useState(initialTarget?.cityId || '');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [survRemaining, setSurvRemaining] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Synchronize when initialTarget changes
  useEffect(() => {
    if (initialTarget) {
      if (initialTarget.name) setTargetName(initialTarget.name);
      if (initialTarget.cityId) {
        setTargetCityId(initialTarget.cityId);
      } else if (initialTarget.cityName && travelMap?.cities) {
        const found = travelMap.cities.find(c => c.name.toLowerCase() === initialTarget.cityName?.toLowerCase());
        if (found) setTargetCityId(found.id);
      }
      setSearchMode('single');
    }
  }, [initialTarget, travelMap?.cities]);

  // Dropdown state for surveillance techniques
  const [isTechniqueMenuOpen, setIsTechniqueMenuOpen] = useState(false);
  const [techniqueFilter, setTechniqueFilter] = useState('');
  const techniqueMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (techniqueMenuRef.current && !techniqueMenuRef.current.contains(e.target as Node)) {
        setIsTechniqueMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cities = travelMap?.cities || [];

  // Operative's available Intel pool (the 3 skills chosen at creation, expandable)
  const intelSkills = useMemo(() => {
    if (!character?.character_skills) return [];
    return character.character_skills
      .filter((cs) => cs.pool === 'intel')
      .map((cs) => cs.skills);
  }, [character?.character_skills]);

  // Filtered skills for dropdown search/filtering when operative possesses many skills
  const filteredIntelSkills = useMemo(() => {
    if (!techniqueFilter.trim()) return intelSkills;
    const q = techniqueFilter.toLowerCase();
    return intelSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.range && s.range.toLowerCase().includes(q))
    );
  }, [intelSkills, techniqueFilter]);

  // Current Operative's city
  const currentCity = useMemo(() => {
    if (!character?.current_city_id) return null;
    return cities.find((c) => c.id === character.current_city_id) || null;
  }, [cities, character?.current_city_id]);

  // Selected Target city
  const targetCity = useMemo(() => {
    if (!targetCityId) return currentCity;
    return cities.find((c) => c.id === targetCityId) || null;
  }, [cities, targetCityId, currentCity]);

  // Range multiplier calculation
  const rangeInfo = useMemo(() => {
    if (!currentCity || !targetCity) {
      return { multiplier: 1, label: 'Same City (x1)' };
    }
    if (currentCity.id === targetCity.id) {
      return { multiplier: 1, label: 'Same City (x1)' };
    }
    if (currentCity.country === targetCity.country) {
      return { multiplier: 2, label: 'Same Country (x2)' };
    }
    if (currentCity.continent === targetCity.continent) {
      return { multiplier: 3, label: 'Same Continent (x3)' };
    }
    return { multiplier: 4, label: 'Cross-Continent (x4)' };
  }, [currentCity, targetCity]);

  // Selected skill
  const activeSkill = useMemo(() => {
    if (!selectedSkillId && intelSkills.length > 0) return intelSkills[0];
    return intelSkills.find((s) => s.id === selectedSkillId) || intelSkills[0] || null;
  }, [intelSkills, selectedSkillId]);

  // Range validation for Intel skill
  // Ranges:
  // - city: same city only
  // - country: same country (or same city)
  // - continent: same continent (e.g. Dark Web Search; if operative is in Dubai (Asia), cannot target New York (North America))
  // - global / remote: anywhere on the globe
  const rangeValidation = useMemo(() => {
    if (!activeSkill) {
      return { eligible: false, reason: 'Select a surveillance technique.' };
    }
    if (!currentCity || !targetCity) {
      return { eligible: true, reason: 'Target sector set.' };
    }

    const skillRange = (activeSkill.range || 'city').toLowerCase();
    const isSameCity = currentCity.id === targetCity.id;
    const isSameCountry = currentCity.country === targetCity.country;
    const isSameContinent = currentCity.continent === targetCity.continent;

    if (skillRange === 'global' || skillRange === 'remote') {
      return {
        eligible: true,
        reason: `Global satellite telemetry validated: ${activeSkill.name} monitors targets worldwide across any sector.`,
      };
    }

    if (skillRange === 'continent') {
      if (!isSameContinent) {
        return {
          eligible: false,
          reason: `${activeSkill.name} has CONTINENT range. Operative in ${currentCity.name} (${currentCity.continent}) cannot target ${targetCity.name} (${targetCity.continent}). Select a sector within ${currentCity.continent} or use a Global surveillance technique.`,
        };
      }
      return {
        eligible: true,
        reason: `Continental vector validated: Target sector ${targetCity.name} is in ${currentCity.continent}, matching operative sector continent.`,
      };
    }

    if (skillRange === 'country') {
      if (!isSameCountry) {
        return {
          eligible: false,
          reason: `${activeSkill.name} has COUNTRY range. Operative in ${currentCity.name} (${currentCity.country}) cannot target ${targetCity.name} (${targetCity.country}). Target must be within ${currentCity.country}.`,
        };
      }
      return {
        eligible: true,
        reason: `National surveillance vector validated: ${targetCity.name} is in ${currentCity.country}.`,
      };
    }

    // Default 'city' range
    if (!isSameCity) {
      return {
        eligible: false,
        reason: `${activeSkill.name} has CITY range and requires operative deployment in target city. Operative is in ${currentCity.name}, target is in ${targetCity.name}.`,
      };
    }

    return {
      eligible: true,
      reason: `Local city vector validated: Operative active in target sector (${currentCity.name}).`,
    };
  }, [activeSkill, currentCity, targetCity]);

  // Check if a city is in range of activeSkill
  const isCityInRange = (city: City) => {
    if (!activeSkill || !currentCity) return true;
    const skillRange = (activeSkill.range || 'city').toLowerCase();
    if (skillRange === 'global' || skillRange === 'remote') return true;
    if (skillRange === 'continent') return currentCity.continent === city.continent;
    if (skillRange === 'country') return currentCity.country === city.country;
    return currentCity.id === city.id;
  };

  // Cost calculations
  const sweepMultiplier = searchMode === 'sweep' ? 5 : 1;
  const apCost = activeSkill ? activeSkill.base_ap_cost * rangeInfo.multiplier * sweepMultiplier : 0;
  const creditCost = activeSkill ? activeSkill.base_credit_cost * rangeInfo.multiplier * sweepMultiplier : 0;

  const currentAp = character?.action_points?.current_ap ?? 0;
  const currentCredits = character?.credits ?? 0;
  const apDeficit = Math.max(0, apCost - currentAp);
  const hasMinAp = currentAp >= 1;
  const canAffordCredits = currentCredits >= creditCost;
  const canLaunch = hasMinAp && canAffordCredits && rangeValidation.eligible && character?.travel_status !== 'in_transit' && character?.travel_status !== 'in_surveillance';

  // Surveillance timer countdown
  useEffect(() => {
    if (!character || character.travel_status !== 'in_surveillance' || !character.arrives_at) {
      setSurvRemaining('');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const arrival = new Date(character.arrives_at!).getTime();
      const diff = arrival - now;

      if (diff <= 0) {
        setSurvRemaining('Probe completed. Click to retrieve report.');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setSurvRemaining(
          `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s remaining`
        );
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [character]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSkill) return;
    if (character?.travel_status === 'in_transit') {
      setSearchError('Operative cannot launch surveillance while in transit.');
      return;
    }
    if (character?.travel_status === 'in_surveillance') {
      setSearchError('Operative is already running an active surveillance probe.');
      return;
    }
    if (currentAp < 1) {
      setSearchError('Minimum 1 AP required to initiate surveillance.');
      return;
    }
    if (!canAffordCredits) {
      setSearchError('Insufficient credits in Swiss Bank account.');
      return;
    }
    if (!rangeValidation.eligible) {
      setSearchError(rangeValidation.reason);
      return;
    }
    if (searchMode === 'single' && !targetName.trim()) {
      setSearchError('Specify target operative codename');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const cityToScan = targetCityId || currentCity?.id || '';
      const res = await performIntelSearch({
        target_city_id: cityToScan,
        skill_id: activeSkill.id,
        target_name: searchMode === 'single' ? targetName.trim() : undefined,
        is_sweep: searchMode === 'sweep',
      });
      setSearchResult(res);
      await refreshTags();
    } catch (err: any) {
      setSearchError(err?.message || 'Intel operation failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAbort = async () => {
    setIsAborting(true);
    setSearchError(null);
    try {
      const res = await abortSurveillance();
      setShowAbortConfirm(false);
      setSearchResult({
        message: res.message || 'Surveillance aborted. Operative returned to standby.',
        status: 'aborted'
      });
      await refreshTags();
    } catch (err: any) {
      setSearchError(err?.message || 'Failed to abort surveillance');
    } finally {
      setIsAborting(false);
    }
  };

  const handleRefreshSurveillance = async () => {
    await refreshCharacter();
    await refreshTags();
  };

  // Extract surveillance info
  const survInfo = useMemo(() => {
    if (!character || character.travel_status !== 'in_surveillance') return null;
    if (character.surveillance_info) return character.surveillance_info;
    if (typeof character.transport_mode === 'string') {
      try {
        return JSON.parse(character.transport_mode);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [character]);

  return (
    <div className="space-y-6 font-mono">
      {/* Top Banner */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <Radar className="w-5 h-5 text-cyan-400" />
            <span>Phase 1: Surveillance Reconnaissance & Target Tagging</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Locate targets in any world sector. Tags remain active for 48 hours. AP Deficit allows probes with 1+ AP by locking future regeneration.
          </p>
        </div>

        <div className="text-xs bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="text-neutral-500">Active Tags:</span>
          <span className="text-amber-400 font-bold">{activeTags.length} Targets</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Search Terminal Form (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-2xl space-y-4">
          
          {/* Active Surveillance Console (When In Surveillance Mode) */}
          {character?.travel_status === 'in_surveillance' && (
            <div className="bg-cyan-950/40 border-2 border-cyan-500/80 rounded-xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                  <Radar className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Surveillance Probe In Progress</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/80 border border-cyan-700 text-cyan-200 font-bold uppercase">
                  {survInfo?.is_sweep ? 'City Sweep' : 'Single Target'}
                </span>
              </div>

              <div className="bg-neutral-950/80 rounded-lg p-3 border border-neutral-800 text-xs space-y-1.5">
                <div className="flex justify-between text-neutral-400">
                  <span>Sector Under Recon:</span>
                  <strong className="text-neutral-200">
                    {survInfo?.target_city_name || cities.find(c => c.id === character.destination_city_id)?.name || 'Target Sector'}
                  </strong>
                </div>
                {survInfo?.target_name && (
                  <div className="flex justify-between text-neutral-400">
                    <span>Target Codename:</span>
                    <strong className="text-amber-300">{survInfo.target_name}</strong>
                  </div>
                )}
                <div className="flex justify-between text-neutral-400">
                  <span>Recon Technique:</span>
                  <strong className="text-cyan-300">{survInfo?.skill_name || 'Classified Intel Probe'}</strong>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>AP Deficit Duration:</span>
                  <strong className="text-amber-400">{survInfo?.ap_deficit_hours || character.ap_committed || 0} Hours</strong>
                </div>
                <div className="flex justify-between text-neutral-300 pt-1.5 border-t border-neutral-800 font-bold">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Time Until Delivery:</span>
                  </span>
                  <span className="text-cyan-300">{survRemaining}</span>
                </div>
              </div>

              {/* Abort Section */}
              {showAbortConfirm ? (
                <div className="bg-rose-950/80 border border-rose-800 rounded-lg p-3 space-y-2 text-xs text-rose-200">
                  <div className="font-bold text-rose-300 flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-rose-400" />
                    <span>Confirm Abort Surveillance</span>
                  </div>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    <strong>CRITICAL:</strong> All AP and Money paid to initiate Surveillance is lost. No intelligence or tags will be acquired.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isAborting}
                      onClick={() => setShowAbortConfirm(false)}
                      className="flex-1 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-bold cursor-pointer"
                    >
                      Continue Probe
                    </button>
                    <button
                      type="button"
                      disabled={isAborting}
                      onClick={handleAbort}
                      className="flex-1 py-1.5 rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1"
                    >
                      {isAborting ? 'Aborting...' : 'Confirm Abort'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAbortConfirm(true)}
                    className="flex-1 py-2 px-3 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-400" />
                    <span>Abort Surveillance</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshSurveillance}
                    className="py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Check if surveillance has completed"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Check Results</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* In-Transit Alert */}
          {character?.travel_status === 'in_transit' && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/70 text-amber-200 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Operative In Transit:</strong> Surveillance operations are offline while traveling. Arrive at destination or cancel ongoing travel in the Header/Travel Map to conduct field probes.
              </span>
            </div>
          )}

          {/* Recent Completed Surveillance Report */}
          {character?.last_surveillance_report && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-cyan-500/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Latest Field Surveillance Report</span>
                </div>
                <span className="text-[10px] text-neutral-500">Delivered on AP Recovery</span>
              </div>
              <p className="text-[11px] text-neutral-300">
                {character.last_surveillance_report.result || 'Surveillance probe scan finalized successfully.'}
              </p>
              {character.last_surveillance_report.tagged && character.last_surveillance_report.tagged.length > 0 && (
                <div className="pt-2 border-t border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase block font-bold">
                    Acquired Transponder Tags ({character.last_surveillance_report.tagged.length}):
                  </span>
                  {character.last_surveillance_report.tagged.map((t: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-neutral-900/80 px-2.5 py-1.5 rounded border border-neutral-800">
                      <span className="text-neutral-100 font-bold">{t.name}</span>
                      <span className="text-[10px] text-amber-400">
                        {t.is_in_transit ? 'In Transit' : 'Stationary in Sector'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              Launch Surveillance Probe
            </h3>

            {/* Mode Switcher: Single vs City Sweep */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setSearchMode('single')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  searchMode === 'single'
                    ? 'bg-neutral-800 text-cyan-300 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Single Target
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('sweep')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  searchMode === 'sweep'
                    ? 'bg-neutral-800 text-amber-300 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                City Sweep (x5)
              </button>
            </div>
          </div>

          {searchError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{searchError}</span>
            </div>
          )}

          {searchResult && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-cyan-800/80 text-xs space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{searchResult.message}</span>
              </div>
              {searchResult.target_city && (
                <div className="text-[11px] text-neutral-400">
                  <span>Sector: <strong>{searchResult.target_city}</strong> • </span>
                  <span>Technique: <strong>{searchResult.skill_used}</strong></span>
                </div>
              )}

              {searchResult.status === 'in_surveillance' && (
                <div className="p-2.5 rounded bg-cyan-950/50 border border-cyan-800/60 text-[11px] text-cyan-200">
                  Operative has entered Surveillance Mode. Deficit: {searchResult.ap_deficit_hours} hours. The full intelligence report will unlock once AP balance regenerates.
                </div>
              )}

              {searchResult.tagged && searchResult.tagged.length > 0 && (
                <div className="pt-2 border-t border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase block font-bold">
                    Acquired Transponder Tags ({searchResult.tagged.length}):
                  </span>
                  {searchResult.tagged.map((t: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-neutral-900/60 px-2.5 py-1.5 rounded border border-neutral-800">
                      <span className="text-neutral-200 font-bold">{t.name}</span>
                      <span className="text-[10px] text-amber-400">
                        {t.is_in_transit ? 'In Transit (Locked to Departure City)' : 'Stationary'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-4 text-xs">
            {searchMode === 'single' ? (
              <div>
                <label className="block text-neutral-400 mb-1">Target Operative Codename</label>
                <input
                  type="text"
                  required
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="e.g. Phantom, Vesper"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            ) : (
              <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-lg text-[11px] text-amber-200 leading-relaxed">
                City Sweep probes all active operatives operating within the selected city. Consumes 5× base AP & credit costs.
              </div>
            )}

            {/* Target City */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="intel-target-sector-select" className="block text-neutral-400 text-xs font-semibold">
                  Target Sector / City
                </label>
                {currentCity && (
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Operative in {currentCity.name} ({currentCity.continent})
                  </span>
                )}
              </div>
              <select
                id="intel-target-sector-select"
                value={targetCityId || currentCity?.id || ''}
                onChange={(e) => setTargetCityId(e.target.value)}
                className={`w-full bg-neutral-950 border rounded-lg px-3 py-2 text-neutral-100 text-xs focus:outline-none transition-colors ${
                  rangeValidation.eligible
                    ? 'border-neutral-800 focus:border-cyan-500'
                    : 'border-rose-600/80 focus:border-rose-500'
                }`}
              >
                <optgroup label={`In-Range Sectors (${activeSkill?.range?.toUpperCase() || 'CITY'})`}>
                  {cities
                    .filter(isCityInRange)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}, {c.country} ({c.continent}) {c.id === currentCity?.id ? '★ (Local Sector)' : '✓ (In Range)'}
                      </option>
                    ))}
                </optgroup>
                {cities.some((c) => !isCityInRange(c)) && (
                  <optgroup label="Out of Range (Requires Higher Range Technique)">
                    {cities
                      .filter((c) => !isCityInRange(c))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}, {c.country} ({c.continent}) ✗ (Out of Range)
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Intel Skill Selection Drop-down / Pull-up Menu */}
            <div className="relative" ref={techniqueMenuRef}>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="surveillance-technique-menu-trigger" className="block text-neutral-400">
                  Surveillance Technique
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {intelSkills.length} Technique{intelSkills.length === 1 ? '' : 's'} in Intel Pool
                </span>
              </div>

              {/* Menu Trigger Button */}
              <button
                type="button"
                id="surveillance-technique-menu-trigger"
                onClick={() => setIsTechniqueMenuOpen(!isTechniqueMenuOpen)}
                className={`w-full bg-neutral-950 border rounded-xl px-3.5 py-2.5 text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isTechniqueMenuOpen
                    ? 'border-cyan-500 ring-1 ring-cyan-500/50'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
                aria-haspopup="listbox"
                aria-expanded={isTechniqueMenuOpen}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-cyan-950/70 border border-cyan-700/60 flex items-center justify-center shrink-0 text-cyan-400">
                    <Radar className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="font-bold text-neutral-200 text-xs truncate">
                      {activeSkill?.name || 'Select Surveillance Technique'}
                    </div>
                    {activeSkill && (
                      <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
                        Base: {activeSkill.base_ap_cost} AP • ${activeSkill.base_credit_cost.toLocaleString()} • Range: {activeSkill.range || 'Standard'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] text-cyan-400 font-bold hidden sm:inline-block">
                    {isTechniqueMenuOpen ? 'CLOSE' : 'CHANGE'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                      isTechniqueMenuOpen ? 'rotate-180 text-cyan-400' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Drop-down / Pull-up Menu Panel */}
              {isTechniqueMenuOpen && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-neutral-950 border border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Quick search input when pool grows */}
                  {intelSkills.length > 3 && (
                    <div className="p-2 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <input
                        type="text"
                        id="surveillance-technique-filter-input"
                        value={techniqueFilter}
                        onChange={(e) => setTechniqueFilter(e.target.value)}
                        placeholder="Search technique name, range, or description..."
                        className="w-full bg-transparent text-[11px] text-neutral-200 placeholder-neutral-500 focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {techniqueFilter && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTechniqueFilter('');
                          }}
                          className="text-[10px] text-neutral-400 hover:text-neutral-200"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}

                  {/* Skills List */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-neutral-900 scrollbar-thin">
                    {filteredIntelSkills.length === 0 ? (
                      <div className="p-4 text-center text-xs text-neutral-500">
                        No surveillance techniques found matching "{techniqueFilter}"
                      </div>
                    ) : (
                      filteredIntelSkills.map((s) => {
                        const isSelected = activeSkill?.id === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedSkillId(s.id);
                              setIsTechniqueMenuOpen(false);
                            }}
                            className={`p-3 text-left cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                              isSelected
                                ? 'bg-cyan-950/60 text-cyan-200'
                                : 'hover:bg-neutral-900/80 text-neutral-300'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-xs ${isSelected ? 'text-cyan-300' : 'text-neutral-200'}`}>
                                  {s.name}
                                </span>
                                {s.range && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 uppercase font-semibold">
                                    {s.range}
                                  </span>
                                )}
                              </div>
                              {s.description && (
                                <p className="text-[10px] text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                                  {s.description}
                                </p>
                              )}
                              <div className="text-[10px] text-neutral-500 mt-1.5 flex items-center gap-2">
                                <span>Base: <strong className="text-neutral-300">{s.base_ap_cost} AP</strong></span>
                                <span>•</span>
                                <span>Cost: <strong className="text-neutral-300">${s.base_credit_cost.toLocaleString()}</strong></span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
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

              {/* Selected Technique Dossier Strip */}
              {activeSkill && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-cyan-950/20 border border-cyan-900/40 text-[11px] text-neutral-300 flex items-start gap-2">
                  <Radar className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <span className="text-cyan-200 font-semibold">{activeSkill.name}:</span>{' '}
                    <span className="text-neutral-400">{activeSkill.description || 'Specialized operative surveillance technique.'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Range & Vector Validation Card */}
            <div
              className={`p-3 rounded-xl border text-xs ${
                rangeValidation.eligible
                  ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-800/80 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {rangeValidation.eligible ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span>
                  {rangeValidation.eligible ? 'Surveillance Vector Validated' : 'Target Sector Ineligible'}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/40 ml-auto border border-neutral-700/50">
                  {activeSkill?.range} range
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-300">
                {rangeValidation.reason}
              </p>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Range Multiplier:</span>
                <span className="text-cyan-400 font-bold">{rangeInfo.label}</span>
              </div>
              {searchMode === 'sweep' && (
                <div className="flex justify-between text-neutral-400">
                  <span>Sweep Multiplier:</span>
                  <span className="text-amber-400 font-bold">5× Area Factor</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-400">
                <span>Total AP Required:</span>
                <span className={`font-bold ${currentAp < 1 ? 'text-rose-400' : currentAp < apCost ? 'text-amber-400' : 'text-neutral-200'}`}>
                  {apCost} AP (Available: {currentAp})
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Operation Cost:</span>
                <span className={`font-bold ${currentCredits < creditCost ? 'text-rose-400' : 'text-neutral-200'}`}>
                  ${creditCost.toLocaleString()} Credits (Balance: ${currentCredits.toLocaleString()})
                </span>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex justify-between text-[11px]">
                <span>Intel Delivery:</span>
                {apDeficit === 0 ? (
                  <strong className="text-emerald-400">Immediate Delivery (0h)</strong>
                ) : (
                  <strong className="text-amber-400">{apDeficit}h In-Surveillance Deficit</strong>
                )}
              </div>

              {apDeficit > 0 && (
                <div className="text-[10px] text-amber-300/80 bg-amber-950/30 p-2 rounded border border-amber-900/50 leading-tight">
                  * AP Deficit Rule: Operative borrows {apDeficit} AP. Full mission countdown starts at authorization ({apDeficit}h duration). Operative recovers deficit over time and report unlocks when the timer finishes.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canLaunch || isSearching || !activeSkill}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                canLaunch
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50'
              }`}
            >
              {isSearching
                ? 'Executing Reconnaissance...'
                : character?.travel_status === 'in_transit'
                ? 'Operative In Transit (Offline)'
                : character?.travel_status === 'in_surveillance'
                ? 'Surveillance Probe Active'
                : !rangeValidation.eligible
                ? 'Target Sector Out Of Range'
                : currentAp < 1
                ? 'Min 1 AP Required To Launch'
                : !canAffordCredits
                ? 'Insufficient Credits'
                : apDeficit === 0
                ? `Authorize Immediate Probe (${apCost} AP • ${creditCost.toLocaleString()})`
                : `Authorize Surveillance Probe (${apDeficit}h Deficit • ${creditCost.toLocaleString()})`}
            </button>
          </form>
        </div>

        {/* Right: Active Tags Tracker (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-4">
              <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span>Active Surveillance Tags</span>
              </h3>
              <span className="text-[10px] text-neutral-500">48h Expiration</span>
            </div>

            {activeTags.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                No active target tags on the grid. Run an Intel search or city sweep to acquire surveillance transponders.
              </div>
            ) : (
              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                {activeTags.map((tag) => {
                  const targetChar = tag.characters;
                  const cityName = tag.cities?.name || targetChar?.cities?.name || 'Unknown';
                  const expiresAt = new Date(tag.expires_at).getTime();
                  const now = new Date().getTime();
                  const hoursLeft = Math.max(0, Math.floor((expiresAt - now) / (1000 * 60 * 60)));

                  return (
                    <div
                      key={tag.id}
                      className="bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 rounded-xl p-3 text-xs space-y-2 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-100 text-sm">
                          {targetChar?.name || 'Unidentified Target'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                          {hoursLeft}h remaining
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          <span>Sector: <strong className="text-neutral-300">{cityName}</strong></span>
                        </div>
                        {targetChar?.travel_status === 'in_transit' && (
                          <span className="text-amber-400 text-[10px] font-bold">In-Transit</span>
                        )}
                        {targetChar?.travel_status === 'in_surveillance' && (
                          <span className="text-cyan-400 text-[10px] font-bold">In-Surveillance</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (targetChar?.id) onSelectTargetForStrike(targetChar.id);
                        }}
                        className="w-full mt-2 py-1.5 px-3 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Target className="w-3.5 h-3.5 text-rose-400" />
                        <span>Designate For Assassination Strike →</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-800 text-[11px] text-neutral-500">
            * Tags decay automatically after 48 hours unless refreshed by a subsequent reconnaissance sweep.
          </div>
        </div>
      </div>
    </div>
  );
};
