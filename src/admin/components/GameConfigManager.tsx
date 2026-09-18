import React, { useState, useEffect } from 'react';
import { adminApi } from '../adminApi';
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  Calculator, 
  Check, 
  X, 
  AlertCircle,
  Plane, 
  Train, 
  Ship, 
  Car, 
  Radar, 
  Crosshair, 
  Zap, 
  Coins, 
  Clock
} from 'lucide-react';

interface ConfigItem {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

interface CityItem {
  id: string;
  name: string;
  country: string;
  continent: string;
  map_x: number;
  map_y: number;
  has_airport: boolean;
  has_rail: boolean;
  has_port: boolean;
}

interface SkillItem {
  id: string;
  name: string;
  category: string;
  range: string;
  base_ap_cost: number;
  base_credit_cost: number;
}

interface GameConfigManagerProps {
  configs: ConfigItem[];
  cities: CityItem[];
  skills: SkillItem[];
  onRefresh: () => void;
}

export const GameConfigManager: React.FC<GameConfigManagerProps> = ({
  configs,
  cities,
  skills,
  onRefresh,
}) => {
  // Local state for all editable configs
  const [cfgValues, setCfgValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live Simulator state
  const [simOriginId, setSimOriginId] = useState<string>('');
  const [simDestId, setSimDestId] = useState<string>('');
  const [simTransportMode, setSimTransportMode] = useState<'air' | 'rail' | 'water' | 'road'>('air');
  const [simIntelSkillId, setSimIntelSkillId] = useState<string>('');
  const [simIsSweep, setSimIsSweep] = useState(false);

  // Initialize config map
  useEffect(() => {
    const map: Record<string, string> = {};
    configs.forEach((c) => {
      map[c.key] = c.value;
    });

    // Defaults if missing
    const defaults: Record<string, string> = {
      air_ap_per_100px: '1',
      air_credits_per_100px: '50',
      rail_ap_per_100px: '2',
      rail_credits_per_100px: '30',
      water_ap_per_100px: '3',
      water_credits_per_100px: '20',
      road_ap_per_100px: '4',
      road_credits_per_100px: '10',
      intel_range_mod_same_country: '2.0',
      intel_range_mod_same_continent: '3.0',
      intel_range_mod_cross_continent: '4.0',
      intel_sweep_mod: '5.0',
      base_ap: '4',
      ap_regen_per_hour: '1',
      tag_duration_hours: '48',
      starting_credits: '500',
      death_credit_penalty: '500',
    };

    setCfgValues({ ...defaults, ...map });

    if (cities.length >= 2 && !simOriginId) {
      setSimOriginId(cities[0].id);
      setSimDestId(cities[1].id);
    }
    const firstIntel = skills.find((s) => s.category === 'intel');
    if (firstIntel && !simIntelSkillId) {
      setSimIntelSkillId(firstIntel.id);
    }
  }, [configs, cities, skills]);

  const handleChange = (key: string, value: string) => {
    setCfgValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    const payload = Object.entries(cfgValues).map(([key, value]) => ({
      key,
      value,
      description: configs.find((c) => c.key === key)?.description || `Game setting for ${key}`,
    }));

    try {
      await adminApi.updateConfig(payload);
      setStatusMsg({ type: 'success', text: 'All AP and Cost rate formulas saved successfully to game engine' });
      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  // Simulator Calculations
  const originCity = cities.find((c) => c.id === simOriginId) || cities[0];
  const destCity = cities.find((c) => c.id === simDestId) || cities[1];
  const activeIntelSkill = skills.find((s) => s.id === simIntelSkillId);

  const travelDistance = React.useMemo(() => {
    if (!originCity || !destCity) return 0;
    const dx = destCity.map_x - originCity.map_x;
    const dy = destCity.map_y - originCity.map_y;
    return Math.sqrt(dx * dx + dy * dy);
  }, [originCity, destCity]);

  const simTravelCost = React.useMemo(() => {
    const apRate = parseFloat(cfgValues[`${simTransportMode}_ap_per_100px`] || '1');
    const creditRate = parseFloat(cfgValues[`${simTransportMode}_credits_per_100px`] || '50');
    const hundreds = Math.ceil(travelDistance / 100);
    return {
      distance: Math.round(travelDistance),
      ap: Math.max(1, hundreds * apRate),
      credits: Math.max(10, hundreds * creditRate),
    };
  }, [travelDistance, simTransportMode, cfgValues]);

  const simIntelCost = React.useMemo(() => {
    if (!originCity || !destCity || !activeIntelSkill) return { ap: 0, credits: 0, multiplier: 1 };

    let mult = 1.0;
    if (originCity.id === destCity.id) {
      mult = 1.0;
    } else if (originCity.country === destCity.country) {
      mult = parseFloat(cfgValues.intel_range_mod_same_country || '2.0');
    } else if (originCity.continent === destCity.continent) {
      mult = parseFloat(cfgValues.intel_range_mod_same_continent || '3.0');
    } else {
      mult = parseFloat(cfgValues.intel_range_mod_cross_continent || '4.0');
    }

    const sweepFactor = simIsSweep ? parseFloat(cfgValues.intel_sweep_mod || '5.0') : 1.0;
    const totalMult = mult * sweepFactor;

    return {
      multiplier: mult,
      sweepMultiplier: sweepFactor,
      ap: Math.ceil(activeIntelSkill.base_ap_cost * totalMult),
      credits: Math.ceil(activeIntelSkill.base_credit_cost * totalMult),
    };
  }, [originCity, destCity, activeIntelSkill, simIsSweep, cfgValues]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <span>Action Point (AP) & Economic Cost Formulas</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure mathematical multipliers for Travel by distance, Intel surveillance tiers, and core game mechanics.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0 shadow-md"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Updating Node...' : 'Save All Formulas'}</span>
        </button>
      </div>

      {/* Status Notice */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
              : 'bg-rose-950/40 border-rose-700 text-rose-300'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Form Left, Simulator Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form: Configs (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Section 1: Travel Rates */}
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-3">
            <div className="border-b border-neutral-800 pb-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plane className="w-4 h-4" />
                <span>1. Travel Distance Rates (Per 100 Map Pixels)</span>
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Calculated dynamically using Euclidean distance rounded up to nearest 100px block.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Air */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" />
                  <span>Air Flights</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase">AP / 100px</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={cfgValues.air_ap_per_100px || '1'}
                      onChange={(e) => handleChange('air_ap_per_100px', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase">Credits / 100px</label>
                    <input
                      type="number"
                      min="0"
                      value={cfgValues.air_credits_per_100px || '50'}
                      onChange={(e) => handleChange('air_credits_per_100px', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Rail */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Train className="w-3.5 h-3.5" />
                  <span>Rail Transit</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase">AP / 100px</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={cfgValues.rail_ap_per_100px || '2'}
                      onChange={(e) => handleChange('rail_ap_per_100px', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase">Credits / 100px</label>
                    <input
                      type="number"
                      min="0"
                      value={cfgValues.rail_credits_per_100px || '30'}
                      onChange={(e) => handleChange('rail_credits_per_100px', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Water */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
                <div className="font-bold text-blue-400 flex items-center gap-1.5">
                  <Ship className="w-3.5 h-3.5" />
                  <span>Maritime Sea</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase">AP / 100px</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={cfgValues.water_ap_per_100px || '3'}
                      onChange={(e) => handleChange('water_ap_per_100px', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase">Credits / 100px</label>
                    <input
                      type="number"
                      min="0"
                      value={cfgValues.water_credits_per_100px || '20'}
                      onChange={(e) => handleChange('water_credits_per_100px', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Road */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  <span>Road Automobile</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase">AP / 100px</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={cfgValues.road_ap_per_100px || '4'}
                      onChange={(e) => handleChange('road_ap_per_100px', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase">Credits / 100px</label>
                    <input
                      type="number"
                      min="0"
                      value={cfgValues.road_credits_per_100px || '10'}
                      onChange={(e) => handleChange('road_credits_per_100px', e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Intel Surveillance Multipliers */}
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-3">
            <div className="border-b border-neutral-800 pb-2">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Radar className="w-4 h-4" />
                <span>2. Intel Surveillance Multipliers</span>
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Applied to the operative's selected Intel technique base AP & credit costs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <label className="block text-neutral-400 mb-1">Same Country Multiplier</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={cfgValues.intel_range_mod_same_country || '2.0'}
                    onChange={(e) => handleChange('intel_range_mod_same_country', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 font-mono"
                  />
                  <span className="text-neutral-500 font-bold">×</span>
                </div>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <label className="block text-neutral-400 mb-1">Same Continent Multiplier</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={cfgValues.intel_range_mod_same_continent || '3.0'}
                    onChange={(e) => handleChange('intel_range_mod_same_continent', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 font-mono"
                  />
                  <span className="text-neutral-500 font-bold">×</span>
                </div>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <label className="block text-neutral-400 mb-1">Cross-Continent Multiplier</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={cfgValues.intel_range_mod_cross_continent || '4.0'}
                    onChange={(e) => handleChange('intel_range_mod_cross_continent', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 font-mono"
                  />
                  <span className="text-neutral-500 font-bold">×</span>
                </div>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <label className="block text-neutral-400 mb-1">City Sweep Area Factor</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={cfgValues.intel_sweep_mod || '5.0'}
                    onChange={(e) => handleChange('intel_sweep_mod', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 font-mono"
                  />
                  <span className="text-neutral-500 font-bold">×</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Core AP & Permadeath Rules */}
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl space-y-3">
            <div className="border-b border-neutral-800 pb-2">
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                <span>3. Core Operative AP & Economic Rules</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <label className="block text-[10px] text-neutral-400 uppercase">Base AP Cap</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={cfgValues.base_ap || '4'}
                  onChange={(e) => handleChange('base_ap', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 mt-1 text-neutral-100 font-mono"
                />
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <label className="block text-[10px] text-neutral-400 uppercase">AP Regen / Hour</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={cfgValues.ap_regen_per_hour || '1'}
                  onChange={(e) => handleChange('ap_regen_per_hour', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 mt-1 text-neutral-100 font-mono"
                />
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <label className="block text-[10px] text-neutral-400 uppercase">Tag Lifespan (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={cfgValues.tag_duration_hours || '48'}
                  onChange={(e) => handleChange('tag_duration_hours', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 mt-1 text-neutral-100 font-mono"
                />
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <label className="block text-[10px] text-neutral-400 uppercase">Starting Credits ($)</label>
                <input
                  type="number"
                  min="0"
                  value={cfgValues.starting_credits || '500'}
                  onChange={(e) => handleChange('starting_credits', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 mt-1 text-neutral-100 font-mono"
                />
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 sm:col-span-2">
                <label className="block text-[10px] text-neutral-400 uppercase">Death Escrow Penalty ($)</label>
                <input
                  type="number"
                  min="0"
                  value={cfgValues.death_credit_penalty || '500'}
                  onChange={(e) => handleChange('death_credit_penalty', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 mt-1 text-neutral-100 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Simulator Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-neutral-900 border border-amber-500/40 p-5 rounded-2xl shadow-xl space-y-4 sticky top-20">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-2.5">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Live Formula Simulator & Sandbox
              </h3>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Test how modifications to AP rates and cost formulas dynamically influence in-game calculations for operative actions.
            </p>

            {/* City Pair Selection */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Origin Operative Sector</label>
                <select
                  value={simOriginId}
                  onChange={(e) => setSimOriginId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-neutral-100 font-mono"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, {c.country} ({c.continent})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Target Destination / Recon Sector</label>
                <select
                  value={simDestId}
                  onChange={(e) => setSimDestId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-neutral-100 font-mono"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, {c.country} ({c.continent})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Travel Simulation Output */}
            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                <span className="text-neutral-400 font-bold uppercase">Transit Test</span>
                <span className="text-[10px] text-neutral-500 font-mono">Distance: {simTravelCost.distance} px</span>
              </div>

              <div className="flex items-center gap-1.5">
                {(['air', 'rail', 'water', 'road'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSimTransportMode(m)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded uppercase transition-colors ${
                      simTransportMode === m ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center pt-1 font-mono">
                <span className="text-neutral-400">Calculated Cost:</span>
                <div className="text-right">
                  <span className="text-amber-400 font-bold">{simTravelCost.ap} AP</span>
                  <span className="text-neutral-500 mx-1.5">•</span>
                  <span className="text-emerald-400 font-bold">${simTravelCost.credits.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Intel Simulation Output */}
            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                <span className="text-neutral-400 font-bold uppercase">Intel Probe Test</span>
                <span className="text-[10px] text-cyan-400 font-mono">{simIntelCost.multiplier}× Range</span>
              </div>

              <div>
                <select
                  value={simIntelSkillId}
                  onChange={(e) => setSimIntelSkillId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-neutral-200 text-xs font-mono"
                >
                  {skills.filter((s) => s.category === 'intel').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Base: {s.base_ap_cost} AP • ${s.base_credit_cost})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sim-sweep"
                  checked={simIsSweep}
                  onChange={(e) => setSimIsSweep(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-amber-500"
                />
                <label htmlFor="sim-sweep" className="text-[11px] text-neutral-300">
                  Include 5× City Sweep Multiplier
                </label>
              </div>

              <div className="flex justify-between items-center pt-1 font-mono">
                <span className="text-neutral-400">Total Probe Cost:</span>
                <div className="text-right">
                  <span className="text-cyan-400 font-bold">{simIntelCost.ap} AP</span>
                  <span className="text-neutral-500 mx-1.5">•</span>
                  <span className="text-emerald-400 font-bold">${simIntelCost.credits.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
