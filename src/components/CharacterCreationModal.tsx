import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { characterApi } from '../services/api';
import { CreationData, City, Profession, Skill } from '../types';
import { 
  UserPlus, 
  MapPin, 
  Briefcase, 
  Crosshair, 
  ShieldCheck, 
  Radar, 
  ShieldAlert, 
  AlertCircle, 
  Check, 
  Zap, 
  Coins 
} from 'lucide-react';

export const CharacterCreationModal: React.FC = () => {
  const { createCharacter, account } = useGame();
  const [data, setData] = useState<CreationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [cityId, setCityId] = useState('');
  const [professionId, setProfessionId] = useState('');

  // 4 Skill Pools
  const [assassinationSkills, setAssassinationSkills] = useState<string[]>([]);
  const [defensiveSkills, setDefensiveSkills] = useState<string[]>([]);
  const [intelSkills, setIntelSkills] = useState<string[]>([]);
  const [counterIntelSkills, setCounterIntelSkills] = useState<string[]>([]);

  // Active sub-step / tab for skill picking
  const [activeTab, setActiveTab] = useState<'basics' | 'assassination' | 'defensive' | 'intel' | 'counter_intel'>('basics');

  useEffect(() => {
    const fetchCreationData = async () => {
      try {
        setLoading(true);
        const res = await characterApi.getCreationData();
        setData(res);
        if (res.cities.length > 0) setCityId(res.cities[0].id);
        if (res.professions.length > 0) setProfessionId(res.professions[0].id);
      } catch (err: any) {
        setError(err?.message || 'Failed to load character configuration data');
      } finally {
        setLoading(false);
      }
    };
    fetchCreationData();
  }, []);

  const toggleSkill = (skillId: string, pool: 'assassination' | 'defensive' | 'intel' | 'counter_intel', maxLimit: number) => {
    let current: string[];
    let setter: (val: string[]) => void;

    switch (pool) {
      case 'assassination':
        current = assassinationSkills;
        setter = setAssassinationSkills;
        break;
      case 'defensive':
        current = defensiveSkills;
        setter = setDefensiveSkills;
        break;
      case 'intel':
        current = intelSkills;
        setter = setIntelSkills;
        break;
      case 'counter_intel':
        current = counterIntelSkills;
        setter = setCounterIntelSkills;
        break;
    }

    if (current.includes(skillId)) {
      setter(current.filter((id) => id !== skillId));
    } else {
      if (current.length >= maxLimit) return;
      setter([...current, skillId]);
    }
  };

  const handleCreate = async () => {
    setError(null);
    if (!name.match(/^[a-zA-Z0-9 ]{2,30}$/)) {
      setError('Operative Name must be 2-30 characters, alphanumeric and spaces only.');
      return;
    }
    if (assassinationSkills.length !== 3) {
      setError('You must select exactly 3 Assassination skills.');
      return;
    }
    if (defensiveSkills.length !== 10) {
      setError('You must select exactly 10 Defensive skills.');
      return;
    }
    if (intelSkills.length !== 3) {
      setError('You must select exactly 3 Intel skills.');
      return;
    }
    if (counterIntelSkills.length !== 10) {
      setError('You must select exactly 10 Counter-Intel skills.');
      return;
    }

    setSubmitting(true);
    try {
      await createCharacter({
        name: name.trim(),
        city_id: cityId,
        profession_id: professionId,
        assassination_skills: assassinationSkills,
        defensive_skills: defensiveSkills,
        intel_skills: intelSkills,
        counter_intel_skills: counterIntelSkills,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to mint operative character.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-mono text-xs text-amber-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span>ACCESSING CLASSIFIED OPERATIVE ARCHIVE...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const selectedProfession = data.professions.find((p) => p.id === professionId);
  const baseAp = 4;
  const calculatedMaxAp = baseAp + (selectedProfession?.ap_modifier || 0);

  const isBasicsValid = name.trim().length >= 2 && !!cityId && !!professionId;
  const isAssassinationValid = assassinationSkills.length === 3;
  const isDefensiveValid = defensiveSkills.length === 10;
  const isIntelValid = intelSkills.length === 3;
  const isCounterIntelValid = counterIntelSkills.length === 10;
  const canFinalSubmit = isBasicsValid && isAssassinationValid && isDefensiveValid && isIntelValid && isCounterIntelValid;

  return (
    <div className="max-w-4xl mx-auto my-8 p-4 font-mono">
      <div className="bg-neutral-900/95 border border-neutral-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="border-b border-neutral-800 pb-4 mb-6">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
            <UserPlus className="w-4 h-4" />
            <span>OPERATIVE CREATION PROTOCOL // CLASSIFIED IDENTITY MINT</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100">
            Mint New Field Operative
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Configure your cover identity, deployment sector, civilian profession, and 4 locked skill pools. Skills cannot be altered once operational.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-neutral-800 mb-6 text-xs">
          <button
            onClick={() => setActiveTab('basics')}
            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'basics'
                ? 'bg-neutral-800 text-amber-400 border-amber-500/60'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            <span>1. Identity & Cover</span>
            {isBasicsValid && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            onClick={() => setActiveTab('assassination')}
            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'assassination'
                ? 'bg-neutral-800 text-amber-400 border-amber-500/60'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            <span>2. Assassination ({assassinationSkills.length}/3)</span>
            {isAssassinationValid && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            onClick={() => setActiveTab('defensive')}
            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'defensive'
                ? 'bg-neutral-800 text-amber-400 border-amber-500/60'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            <span>3. Defensive ({defensiveSkills.length}/10)</span>
            {isDefensiveValid && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            onClick={() => setActiveTab('intel')}
            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'intel'
                ? 'bg-neutral-800 text-amber-400 border-amber-500/60'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            <span>4. Intel ({intelSkills.length}/3)</span>
            {isIntelValid && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            onClick={() => setActiveTab('counter_intel')}
            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'counter_intel'
                ? 'bg-neutral-800 text-amber-400 border-amber-500/60'
                : 'text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            <span>5. Counter-Intel ({counterIntelSkills.length}/10)</span>
            {isCounterIntelValid && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>

        {/* TAB 1: BASICS */}
        {activeTab === 'basics' && (
          <div className="space-y-5 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-semibold">Field Codename / Character Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ghost, Vesper, Jackal"
                maxLength={30}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/70"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">2-30 characters, letters and numbers only.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">Deployment City (Origin)</label>
                <select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500/70"
                >
                  {data.cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, {c.country} ({c.continent})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-semibold">Cover Profession</label>
                <select
                  value={professionId}
                  onChange={(e) => setProfessionId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500/70"
                >
                  {data.professions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (AP: {p.ap_modifier >= 0 ? `+${p.ap_modifier}` : p.ap_modifier}, ${p.credits_per_week}/wk)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedProfession && (
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-neutral-200 text-sm">{selectedProfession.name}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 font-bold">
                      Max AP: {calculatedMaxAp}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Salary: ${selectedProfession.credits_per_week}/week
                    </span>
                  </div>
                </div>
                <p className="text-neutral-400 leading-relaxed text-xs">
                  {selectedProfession.description}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('assassination')}
                disabled={!isBasicsValid}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs cursor-pointer"
              >
                Proceed to Assassination Pool →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ASSASSINATION SKILLS (Exactly 3) */}
        {activeTab === 'assassination' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-200 text-sm">Assassination Pool</h3>
                <p className="text-xs text-neutral-400">Select exactly 3 offensive execution skills. Used when targeting victims.</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                assassinationSkills.length === 3 ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-950 text-amber-400 border-amber-800'
              }`}>
                {assassinationSkills.length} / 3 Selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {data.skill_pools.assassination_defensive.map((s) => {
                const isSelected = assassinationSkills.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSkill(s.id, 'assassination', 3)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 text-amber-100'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="font-bold text-neutral-100">{s.name}</strong>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 uppercase">
                        Range: {s.range}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight mb-2">{s.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                      <span>AP: {s.base_ap_cost}</span>
                      <span>•</span>
                      <span>Cost: ${s.base_credit_cost}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('basics')}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('defensive')}
                disabled={assassinationSkills.length !== 3}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs cursor-pointer"
              >
                Proceed to Defensive Pool ({defensiveSkills.length}/10) →
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: DEFENSIVE SKILLS (Exactly 10) */}
        {activeTab === 'defensive' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-200 text-sm">Defensive Pool</h3>
                <p className="text-xs text-neutral-400">Select exactly 10 defensive skills. If an attacker uses a skill in your defensive pool, their attack is automatically countered!</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                defensiveSkills.length === 10 ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-950 text-amber-400 border-amber-800'
              }`}>
                {defensiveSkills.length} / 10 Selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {data.skill_pools.assassination_defensive.map((s) => {
                const isSelected = defensiveSkills.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSkill(s.id, 'defensive', 10)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-100'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="font-bold text-neutral-100">{s.name}</strong>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 uppercase">
                        Range: {s.range}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight mb-2">{s.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                      <span>AP: {s.base_ap_cost}</span>
                      <span>•</span>
                      <span>Cost: ${s.base_credit_cost}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('assassination')}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('intel')}
                disabled={defensiveSkills.length !== 10}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs cursor-pointer"
              >
                Proceed to Intel Pool ({intelSkills.length}/3) →
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: INTEL SKILLS (Exactly 3) */}
        {activeTab === 'intel' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-200 text-sm">Intel Pool</h3>
                <p className="text-xs text-neutral-400">Select exactly 3 offensive surveillance skills. Used to locate and tag targets across cities.</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                intelSkills.length === 3 ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-950 text-amber-400 border-amber-800'
              }`}>
                {intelSkills.length} / 3 Selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {data.skill_pools.intel_counter_intel.map((s) => {
                const isSelected = intelSkills.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSkill(s.id, 'intel', 3)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-100'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="font-bold text-neutral-100">{s.name}</strong>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 uppercase">
                        Scope: {s.range}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight mb-2">{s.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                      <span>AP: {s.base_ap_cost}</span>
                      <span>•</span>
                      <span>Cost: ${s.base_credit_cost}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('defensive')}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('counter_intel')}
                disabled={intelSkills.length !== 3}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs cursor-pointer"
              >
                Proceed to Counter-Intel Pool ({counterIntelSkills.length}/10) →
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: COUNTER-INTEL SKILLS (Exactly 10) */}
        {activeTab === 'counter_intel' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-200 text-sm">Counter-Intel Pool</h3>
                <p className="text-xs text-neutral-400">Select exactly 10 counter-surveillance skills. If an opponent scans your city using a skill in this pool, their tag fails completely.</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                counterIntelSkills.length === 10 ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-950 text-amber-400 border-amber-800'
              }`}>
                {counterIntelSkills.length} / 10 Selected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {data.skill_pools.intel_counter_intel.map((s) => {
                const isSelected = counterIntelSkills.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSkill(s.id, 'counter_intel', 10)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500 text-purple-100'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="font-bold text-neutral-100">{s.name}</strong>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 uppercase">
                        Scope: {s.range}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight mb-2">{s.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                      <span>AP: {s.base_ap_cost}</span>
                      <span>•</span>
                      <span>Cost: ${s.base_credit_cost}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setActiveTab('intel')}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer"
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={!canFinalSubmit || submitting}
                className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg"
              >
                {submitting ? 'Minting Identity...' : 'Finalize Operative & Deploy into Grid'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
