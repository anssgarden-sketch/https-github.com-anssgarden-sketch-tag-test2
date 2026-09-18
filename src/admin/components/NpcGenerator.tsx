import React, { useState, useEffect, useMemo } from 'react';
import { adminApi, PlayerOperative } from '../adminApi';
import { 
  Bot, 
  Sparkles, 
  Dice5, 
  Check, 
  AlertCircle, 
  X, 
  Users, 
  ShieldCheck, 
  Crosshair, 
  Radar, 
  EyeOff, 
  MapPin, 
  Briefcase, 
  Coins, 
  Zap, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  ArrowRight,
  User,
  AtSign,
  Lock,
  Flame,
  RefreshCw
} from 'lucide-react';

interface NpcGeneratorProps {
  cities: any[];
  skills: any[];
  professions?: any[];
  onRefreshParent?: () => void;
  onNavigateToPlayers?: () => void;
}

// Spy random pool data for instant client-side rolling
const RANDOM_FIRST_NAMES = [
  'Alexander', 'Elena', 'Viktor', 'Natasha', 'Dmitri', 'Maya', 'Sebastian', 'Cassian',
  'Leila', 'Darius', 'Kira', 'Leon', 'Astrid', 'Julian', 'Rowan', 'Valeria',
  'Gideon', 'Sora', 'Corin', 'Talia', 'Zane', 'Vesper', 'Nikolai', 'Roxanne',
  'Damian', 'Seraphina', 'Kaelen', 'Morrigan', 'Ronan', 'Camilla', 'Malik', 'Freya'
];

const RANDOM_LAST_NAMES = [
  'Vance', 'Cross', 'Rostova', 'Mercer', 'Blackwood', 'Chen', 'Sterling', 'Kovacs',
  'Sinclair', 'Voss', 'Holloway', 'Moreau', 'Novak', 'Drake', 'Steele', 'Hawthorne',
  'Winters', 'Monroe', 'Frost', 'Graves', 'Bishop', 'Carver', 'Strand', 'Ashford'
];

const RANDOM_CODENAMES = [
  'Viper', 'Cipher', 'Specter', 'Revenant', 'Wraith', 'Onyx', 'Apex', 'Zero',
  'Echo', 'Falcon', 'Kestrel', 'Nemesis', 'Mirage', 'Blackbird', 'Scythe', 'Hydra',
  'Valkyrie', 'Phantom', 'Gargoyle', 'Ronin', 'Eclipse', 'Havoc', 'Tempest', 'Obsidian',
  'Archon', 'Rook', 'Banshee', 'Ghost', 'Sentinel', 'Vanguard', 'Razor'
];

const RANDOM_DOMAINS = [
  'shadowgrid.io', 'darknet-node.org', 'tag-ops.net', 'ciphermail.ch', 'ghostlink.net', 'apex-syndicate.org'
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomSample<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export interface NpcDraft {
  id: string; // client-side temp id
  name: string;
  dark_web_handle: string;
  email: string;
  city_id: string;
  profession_id: string;
  credits: number;
  current_ap: number;
  max_ap: number;
  assassination_skills: string[]; // 3
  defensive_skills: string[]; // 10
  intel_skills: string[]; // 3
  counter_intel_skills: string[]; // 10
}

export const NpcGenerator: React.FC<NpcGeneratorProps> = ({
  cities,
  skills,
  professions = [],
  onRefreshParent,
  onNavigateToPlayers,
}) => {
  const [count, setCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recentlyCreated, setRecentlyCreated] = useState<PlayerOperative[] | null>(null);

  // Filter skills by category
  const assSkillsPool = useMemo(() => skills.filter(s => s.category === 'assassination'), [skills]);
  const intelSkillsPool = useMemo(() => skills.filter(s => s.category === 'intel'), [skills]);

  // Generate a fresh NPC draft object with optional overrides
  const createFreshDraft = (overrides: Partial<NpcDraft> = {}): NpcDraft => {
    const firstName = pickRandom(RANDOM_FIRST_NAMES);
    const lastName = pickRandom(RANDOM_LAST_NAMES);
    const rawCodename = pickRandom(RANDOM_CODENAMES);
    const suffix = Math.floor(10 + Math.random() * 90);
    const codename = `${rawCodename}-${suffix}`;
    const cleanHandle = codename.toLowerCase().replace(/[^a-z0-9]/g, '');
    const domain = pickRandom(RANDOM_DOMAINS);
    const email = `${cleanHandle}.${Math.floor(100 + Math.random() * 900)}@${domain}`;

    const city = cities.length > 0 ? pickRandom(cities) : null;
    const prof = professions.length > 0 ? pickRandom(professions) : null;
    const apMod = prof?.ap_modifier || 0;
    const maxAp = Math.max(1, 4 + apMod);

    const ass3 = pickRandomSample(assSkillsPool, 3).map(s => s.id);
    const def10 = pickRandomSample(assSkillsPool, 10).map(s => s.id);
    const intel3 = pickRandomSample(intelSkillsPool, 3).map(s => s.id);
    const count10 = pickRandomSample(intelSkillsPool, 10).map(s => s.id);

    return {
      id: Math.random().toString(36).substring(2, 9),
      name: `${firstName} ${lastName}`,
      dark_web_handle: codename,
      email,
      city_id: city ? city.id : '',
      profession_id: prof ? prof.id : '',
      credits: 500,
      current_ap: maxAp,
      max_ap: maxAp,
      assassination_skills: ass3,
      defensive_skills: def10,
      intel_skills: intel3,
      counter_intel_skills: count10,
      ...overrides,
    };
  };

  // State for single NPC editor
  const [singleDraft, setSingleDraft] = useState<NpcDraft>(() => createFreshDraft());

  // State for multi-NPC roster drafts (when count > 1)
  const [rosterDrafts, setRosterDrafts] = useState<NpcDraft[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Template settings for batch generation
  const [batchCityLock, setBatchCityLock] = useState<string>('random');
  const [batchProfessionLock, setBatchProfessionLock] = useState<string>('random');
  const [batchCredits, setBatchCredits] = useState<number>(500);

  // Re-sync roster drafts when count changes
  useEffect(() => {
    if (count === 1) {
      // Ensure single draft has valid city and profession
      if ((!singleDraft.city_id && cities.length > 0) || (!singleDraft.profession_id && professions.length > 0)) {
        setSingleDraft(createFreshDraft());
      }
    } else {
      setRosterDrafts(prev => {
        const nextDrafts: NpcDraft[] = [];
        for (let i = 0; i < count; i++) {
          if (prev[i]) {
            nextDrafts.push(prev[i]);
          } else {
            nextDrafts.push(createFreshDraft({
              city_id: batchCityLock !== 'random' ? batchCityLock : undefined,
              profession_id: batchProfessionLock !== 'random' ? batchProfessionLock : undefined,
              credits: batchCredits,
            }));
          }
        }
        return nextDrafts;
      });
    }
  }, [count, cities, professions]);

  // Notification helper
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  // --- Single NPC Randomizers ---
  const handleRandomizeSingleField = (field: keyof NpcDraft) => {
    if (field === 'name') {
      const first = pickRandom(RANDOM_FIRST_NAMES);
      const last = pickRandom(RANDOM_LAST_NAMES);
      setSingleDraft(prev => ({ ...prev, name: `${first} ${last}` }));
    } else if (field === 'dark_web_handle') {
      const handle = `${pickRandom(RANDOM_CODENAMES)}-${Math.floor(10 + Math.random() * 90)}`;
      setSingleDraft(prev => ({ ...prev, dark_web_handle: handle }));
    } else if (field === 'email') {
      const handle = singleDraft.dark_web_handle.toLowerCase().replace(/[^a-z0-9]/g, '') || 'npc';
      const email = `${handle}.${Math.floor(100 + Math.random() * 900)}@${pickRandom(RANDOM_DOMAINS)}`;
      setSingleDraft(prev => ({ ...prev, email }));
    } else if (field === 'city_id') {
      if (cities.length > 0) {
        setSingleDraft(prev => ({ ...prev, city_id: pickRandom(cities).id }));
      }
    } else if (field === 'profession_id') {
      if (professions.length > 0) {
        const prof = pickRandom(professions);
        const apMod = prof.ap_modifier || 0;
        const maxAp = Math.max(1, 4 + apMod);
        setSingleDraft(prev => ({ 
          ...prev, 
          profession_id: prof.id,
          max_ap: maxAp,
          current_ap: maxAp,
        }));
      }
    } else if (field === 'assassination_skills') {
      setSingleDraft(prev => ({
        ...prev,
        assassination_skills: pickRandomSample(assSkillsPool, 3).map(s => s.id),
      }));
    } else if (field === 'defensive_skills') {
      setSingleDraft(prev => ({
        ...prev,
        defensive_skills: pickRandomSample(assSkillsPool, 10).map(s => s.id),
      }));
    } else if (field === 'intel_skills') {
      setSingleDraft(prev => ({
        ...prev,
        intel_skills: pickRandomSample(intelSkillsPool, 3).map(s => s.id),
      }));
    } else if (field === 'counter_intel_skills') {
      setSingleDraft(prev => ({
        ...prev,
        counter_intel_skills: pickRandomSample(intelSkillsPool, 10).map(s => s.id),
      }));
    } else if (field === 'credits') {
      const creditsPreset = [300, 500, 750, 1000, 1500, 2000];
      setSingleDraft(prev => ({ ...prev, credits: pickRandom(creditsPreset) }));
    }
  };

  const handleRandomizeSingleAll = () => {
    setSingleDraft(createFreshDraft());
    showStatus('Randomized all fields for operative', 'success');
  };

  // --- Roster Multi-NPC Randomizers ---
  const handleRerollRosterItem = (index: number) => {
    setRosterDrafts(prev => {
      const copy = [...prev];
      copy[index] = createFreshDraft({
        city_id: batchCityLock !== 'random' ? batchCityLock : undefined,
        profession_id: batchProfessionLock !== 'random' ? batchProfessionLock : undefined,
        credits: batchCredits,
      });
      return copy;
    });
  };

  const handleRandomizeEntireRoster = () => {
    const newRoster: NpcDraft[] = [];
    for (let i = 0; i < count; i++) {
      newRoster.push(createFreshDraft({
        city_id: batchCityLock !== 'random' ? batchCityLock : undefined,
        profession_id: batchProfessionLock !== 'random' ? batchProfessionLock : undefined,
        credits: batchCredits,
      }));
    }
    setRosterDrafts(newRoster);
    showStatus(`Re-rolled all ${count} NPC operatives`, 'success');
  };

  // When profession changes on single draft, auto-update AP bounds
  const handleSingleProfessionChange = (profId: string) => {
    const prof = professions.find(p => p.id === profId);
    const apMod = prof?.ap_modifier || 0;
    const maxAp = Math.max(1, 4 + apMod);
    setSingleDraft(prev => ({
      ...prev,
      profession_id: profId,
      max_ap: maxAp,
      current_ap: maxAp,
    }));
  };

  // Execute Generation
  const handleDeployNpcs = async () => {
    setIsGenerating(true);
    setRecentlyCreated(null);

    try {
      let npcsToDeploy: NpcDraft[] = [];
      if (count === 1) {
        // Validate single draft
        if (!singleDraft.name.trim()) throw new Error('Operative name cannot be empty');
        if (!singleDraft.dark_web_handle.trim()) throw new Error('Codename cannot be empty');
        if (!singleDraft.city_id) throw new Error('Please select a city');
        if (!singleDraft.profession_id) throw new Error('Please select a profession');
        npcsToDeploy = [singleDraft];
      } else {
        npcsToDeploy = rosterDrafts.slice(0, count);
      }

      const res = await adminApi.generateNpcs(count, npcsToDeploy);
      showStatus(`Successfully deployed ${res.count} human-grade NPC operative(s)!`, 'success');
      setRecentlyCreated(res.npcs);

      if (onRefreshParent) onRefreshParent();

      // Reset single draft to a fresh one
      setSingleDraft(createFreshDraft());
      // Re-randomize roster drafts
      handleRandomizeEntireRoster();
    } catch (err: any) {
      showStatus(err.message || 'Failed to deploy NPC operatives', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono transition-all shadow-lg ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-neutral-800/60 rounded text-neutral-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Control Panel */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-amber-400 font-mono tracking-wide flex items-center gap-2">
                  <span>NPC OPERATIVE GENERATOR</span>
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                    Full Human Stats
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Generate autonomous operatives with authentic accounts, Swiss bank accounts, AP, and complete skill loadouts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToPlayers && (
              <button
                onClick={onNavigateToPlayers}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700 transition-colors cursor-pointer font-mono"
              >
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                <span>View All Players</span>
              </button>
            )}
          </div>
        </div>

        {/* Count Selector (1 to 10) */}
        <div className="bg-neutral-950 border border-neutral-800/90 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-mono text-xs font-bold text-neutral-200 block">
                NUMBER OF NPCS TO GENERATE: <span className="text-amber-400 text-sm font-bold ml-1">{count}</span>
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                Select between 1 and 10 operatives to deploy simultaneously.
              </span>
            </div>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 5, 10].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCount(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    count === preset
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="10"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Recently Created Confirmation Banner */}
      {recentlyCreated && recentlyCreated.length > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-300 font-mono">
                {recentlyCreated.length} NPC OPERATIVE(S) DEPLOYED SUCCESSFULLY
              </h3>
            </div>
            <button
              onClick={() => setRecentlyCreated(null)}
              className="text-emerald-400/80 hover:text-emerald-200 text-xs font-mono"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentlyCreated.map((npc) => (
              <div
                key={npc.id}
                className="bg-neutral-900/90 border border-emerald-900/60 rounded-xl p-3.5 space-y-1.5 font-mono text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-100 font-sans">{npc.name}</span>
                  <span className="text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    @{npc.accounts?.dark_web_handle}
                  </span>
                </div>
                <div className="text-neutral-400 text-[11px] truncate">
                  {npc.accounts?.email}
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-800 text-neutral-400">
                  <span>{npc.cities?.name || 'Unknown'}</span>
                  <span>{npc.professions?.name || 'Freelance'}</span>
                  <span className="text-amber-400 font-bold">{npc.action_points?.current_ap}/{npc.action_points?.max_ap} AP</span>
                  <span className="text-cyan-400 font-bold">{npc.credits} ¢</span>
                </div>
              </div>
            ))}
          </div>

          {onNavigateToPlayers && (
            <div className="pt-2 text-right">
              <button
                onClick={onNavigateToPlayers}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white font-mono underline underline-offset-4"
              >
                <span>Inspect in Players Roster & Adjust AP/Credits</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODE 1: SINGLE NPC SPECIFICATION (when count === 1) */}
      {count === 1 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-100 font-mono flex items-center gap-2">
                <span>INDIVIDUAL OPERATIVE PROFILE SPECIFICATION</span>
              </h3>
              <p className="text-xs text-neutral-400">
                You can fill each field manually or click <span className="text-amber-400 font-mono font-bold">"🎲 Random"</span> on any field to auto-generate.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRandomizeSingleAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 text-xs font-mono border border-neutral-700 transition-colors cursor-pointer"
            >
              <Dice5 className="w-4 h-4" />
              <span>Randomize All Fields</span>
            </button>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono text-xs">
            {/* Field: Full Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  Operative Name
                </label>
                <button
                  type="button"
                  onClick={() => handleRandomizeSingleField('name')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  title="Roll random name"
                >
                  <Dice5 className="w-3 h-3" />
                  <span>Random</span>
                </button>
              </div>
              <input
                type="text"
                value={singleDraft.name}
                onChange={(e) => setSingleDraft({ ...singleDraft, name: e.target.value })}
                placeholder="e.g. Alexander Vance"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Field: Dark Web Handle / Codename */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-neutral-500" />
                  Codename / Dark Web Handle
                </label>
                <button
                  type="button"
                  onClick={() => handleRandomizeSingleField('dark_web_handle')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  title="Roll random codename"
                >
                  <Dice5 className="w-3 h-3" />
                  <span>Random</span>
                </button>
              </div>
              <input
                type="text"
                value={singleDraft.dark_web_handle}
                onChange={(e) => setSingleDraft({ ...singleDraft, dark_web_handle: e.target.value })}
                placeholder="e.g. Viper-42"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Field: Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-neutral-500" />
                  Account Email
                </label>
                <button
                  type="button"
                  onClick={() => handleRandomizeSingleField('email')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  title="Roll random email"
                >
                  <Dice5 className="w-3 h-3" />
                  <span>Random</span>
                </button>
              </div>
              <input
                type="email"
                value={singleDraft.email}
                onChange={(e) => setSingleDraft({ ...singleDraft, email: e.target.value })}
                placeholder="e.g. viper42.821@tag-ops.net"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Field: Autonomous Security */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  Terminal Access
                </label>
                <span className="text-[10px] text-amber-400 font-mono font-bold">LOCKED / NO CREDENTIALS</span>
              </div>
              <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-400 flex items-center justify-between">
                <span>Autonomous Operative (Credentials Disabled)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/80 text-amber-300 font-mono">
                  Admin Impersonate Only
                </span>
              </div>
            </div>

            {/* Field: Starting City */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  Starting Sector / City
                </label>
                <button
                  type="button"
                  onClick={() => handleRandomizeSingleField('city_id')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  title="Roll random city"
                >
                  <Dice5 className="w-3 h-3" />
                  <span>Random</span>
                </button>
              </div>
              <select
                value={singleDraft.city_id}
                onChange={(e) => setSingleDraft({ ...singleDraft, city_id: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name} ({city.country} - {city.continent})
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Profession */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                  Profession & Schedule
                </label>
                <button
                  type="button"
                  onClick={() => handleRandomizeSingleField('profession_id')}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  title="Roll random profession"
                >
                  <Dice5 className="w-3 h-3" />
                  <span>Random</span>
                </button>
              </div>
              <select
                value={singleDraft.profession_id}
                onChange={(e) => handleSingleProfessionChange(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
              >
                {professions.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name} ({prof.credits_per_week} ¢/wk | {prof.ap_modifier >= 0 ? `+${prof.ap_modifier}` : prof.ap_modifier} AP)
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Starting AP / Max AP */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Action Points (AP)
                </label>
                <span className="text-[10px] text-neutral-500">Base 4 + Profession Mod</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={singleDraft.current_ap}
                  onChange={(e) => setSingleDraft({ ...singleDraft, current_ap: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-amber-300 focus:outline-none focus:border-amber-500"
                  placeholder="Current AP"
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={singleDraft.max_ap}
                  onChange={(e) => setSingleDraft({ ...singleDraft, max_ap: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-200 focus:outline-none focus:border-amber-500"
                  placeholder="Max AP"
                />
              </div>
            </div>

            {/* Field: Credits */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-cyan-400" />
                  Starting Swiss Bank Credits
                </label>
                <button
                  type="button"
                  onClick={() => handleRandomizeSingleField('credits')}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  title="Roll random credits"
                >
                  <Dice5 className="w-3 h-3" />
                  <span>Random</span>
                </button>
              </div>
              <input
                type="number"
                min="0"
                step="50"
                value={singleDraft.credits}
                onChange={(e) => setSingleDraft({ ...singleDraft, credits: parseInt(e.target.value, 10) || 0 })}
                placeholder="Credits"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Skills Loadout Selection (Assassination, Defense, Intel, Counter-Intel) */}
          <div className="pt-4 border-t border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-400 font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>SKILLS LOADOUT (26 SKILLS // FULL HUMAN STANDARD)</span>
                </h4>
                <p className="text-[11px] text-neutral-400 font-mono">
                  3 Assassination, 10 Defensive, 3 Intel, and 10 Counter-Intel skills.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleRandomizeSingleField('assassination_skills');
                    handleRandomizeSingleField('defensive_skills');
                    handleRandomizeSingleField('intel_skills');
                    handleRandomizeSingleField('counter_intel_skills');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-mono"
                >
                  <Dice5 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Roll All 26 Skills</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              {/* Assassination Pool (3) */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5" />
                    Assassination ({singleDraft.assassination_skills.length}/3)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRandomizeSingleField('assassination_skills')}
                    className="text-[10px] text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <Dice5 className="w-3 h-3" />
                    <span>Random 3</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {singleDraft.assassination_skills.map((skillId) => {
                    const skill = skills.find(s => s.id === skillId);
                    return (
                      <span key={skillId} className="px-2 py-1 bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded text-[11px]">
                        {skill?.name || skillId.substring(0, 6)}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Defensive Pool (10) */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Defensive ({singleDraft.defensive_skills.length}/10)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRandomizeSingleField('defensive_skills')}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Dice5 className="w-3 h-3" />
                    <span>Random 10</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {singleDraft.defensive_skills.map((skillId) => {
                    const skill = skills.find(s => s.id === skillId);
                    return (
                      <span key={skillId} className="px-2 py-0.5 bg-amber-950/40 border border-amber-800/60 text-amber-300 rounded text-[10px]">
                        {skill?.name || skillId.substring(0, 6)}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Intel Pool (3) */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <Radar className="w-3.5 h-3.5" />
                    Intel ({singleDraft.intel_skills.length}/3)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRandomizeSingleField('intel_skills')}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Dice5 className="w-3 h-3" />
                    <span>Random 3</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {singleDraft.intel_skills.map((skillId) => {
                    const skill = skills.find(s => s.id === skillId);
                    return (
                      <span key={skillId} className="px-2 py-1 bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 rounded text-[11px]">
                        {skill?.name || skillId.substring(0, 6)}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Counter-Intel Pool (10) */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-400 flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5" />
                    Counter-Intel ({singleDraft.counter_intel_skills.length}/10)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRandomizeSingleField('counter_intel_skills')}
                    className="text-[10px] text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <Dice5 className="w-3 h-3" />
                    <span>Random 10</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {singleDraft.counter_intel_skills.map((skillId) => {
                    const skill = skills.find(s => s.id === skillId);
                    return (
                      <span key={skillId} className="px-2 py-0.5 bg-purple-950/40 border border-purple-800/60 text-purple-300 rounded text-[10px]">
                        {skill?.name || skillId.substring(0, 6)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
            <div className="text-[11px] text-neutral-500 font-mono">
              Ready to deploy 1 NPC with Swiss Bank account and full game attributes.
            </div>

            <button
              type="button"
              onClick={handleDeployNpcs}
              disabled={isGenerating}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs font-mono transition-colors cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Deploying NPC into Game...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Deploy NPC Operative</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: BATCH NPC ROSTER GENERATOR (when count > 1, up to 10) */}
      {count > 1 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-100 font-mono flex items-center gap-2">
                <span>BATCH NPC ROSTER PREVIEW ({count} OPERATIVES)</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Each NPC receives unique human-grade stats, Swiss banking, and valid skill sets. Inspect or reroll individuals below.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRandomizeEntireRoster}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-mono border border-neutral-700 transition-colors cursor-pointer self-start md:self-auto"
            >
              <Dice5 className="w-4 h-4" />
              <span>Reroll All {count} NPCs</span>
            </button>
          </div>

          {/* Batch Template Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs font-mono">
            <div>
              <label className="block text-neutral-400 text-[11px] mb-1">City Policy for Batch</label>
              <select
                value={batchCityLock}
                onChange={(e) => {
                  setBatchCityLock(e.target.value);
                  if (e.target.value !== 'random') {
                    setRosterDrafts(prev => prev.map(d => ({ ...d, city_id: e.target.value })));
                  }
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-amber-500"
              >
                <option value="random">🎲 Random for each NPC</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    All spawn in {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 text-[11px] mb-1">Profession Policy for Batch</label>
              <select
                value={batchProfessionLock}
                onChange={(e) => {
                  setBatchProfessionLock(e.target.value);
                  if (e.target.value !== 'random') {
                    const prof = professions.find(p => p.id === e.target.value);
                    const apMod = prof?.ap_modifier || 0;
                    const maxAp = Math.max(1, 4 + apMod);
                    setRosterDrafts(prev => prev.map(d => ({ 
                      ...d, 
                      profession_id: e.target.value,
                      current_ap: maxAp,
                      max_ap: maxAp
                    })));
                  }
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-amber-500"
              >
                <option value="random">🎲 Random for each NPC</option>
                {professions.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    All {prof.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 text-[11px] mb-1">Starting Credits for Batch</label>
              <input
                type="number"
                min="0"
                step="50"
                value={batchCredits}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setBatchCredits(val);
                  setRosterDrafts(prev => prev.map(d => ({ ...d, credits: val })));
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Roster Table Preview */}
          <div className="overflow-x-auto border border-neutral-800 rounded-xl bg-neutral-950">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-900/90 border-b border-neutral-800 text-[11px] text-neutral-400 uppercase">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Name & Codename</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">City</th>
                  <th className="px-3 py-2.5">Profession</th>
                  <th className="px-3 py-2.5 text-center">AP</th>
                  <th className="px-3 py-2.5 text-center">Credits</th>
                  <th className="px-3 py-2.5 text-right">Reroll</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {rosterDrafts.slice(0, count).map((npc, idx) => {
                  const cityObj = cities.find(c => c.id === npc.city_id);
                  const profObj = professions.find(p => p.id === npc.profession_id);

                  return (
                    <tr key={npc.id || idx} className="hover:bg-neutral-900/50">
                      <td className="px-3 py-2.5 text-neutral-500">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-neutral-100 font-sans">{npc.name}</div>
                        <div className="text-[10px] text-amber-400">@{npc.dark_web_handle}</div>
                      </td>
                      <td className="px-3 py-2.5 text-neutral-300 text-[11px] truncate max-w-[170px]">
                        {npc.email}
                      </td>
                      <td className="px-3 py-2.5 text-neutral-200">
                        {cityObj?.name || 'Random City'}
                      </td>
                      <td className="px-3 py-2.5 text-neutral-400">
                        {profObj?.name || 'Random'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-amber-400 font-bold">
                        {npc.current_ap}/{npc.max_ap}
                      </td>
                      <td className="px-3 py-2.5 text-center text-cyan-400 font-bold">
                        {npc.credits} ¢
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRerollRosterItem(idx)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 cursor-pointer transition-colors"
                          title="Reroll this operative"
                        >
                          <Dice5 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Batch Deploy Button */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono">
              Total to deploy: <span className="text-amber-400 font-bold">{count} autonomous human-grade NPCs</span>
            </span>

            <button
              type="button"
              onClick={handleDeployNpcs}
              disabled={isGenerating}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs font-mono transition-colors cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Deploying {count} Operatives...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Deploy All {count} NPC Operatives</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
