import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  adminApi, 
  PlayerOperative 
} from '../adminApi';
import { 
  Search, 
  Users, 
  Zap, 
  Coins, 
  MapPin, 
  Briefcase, 
  RefreshCw, 
  Sliders, 
  Check, 
  X, 
  AlertCircle, 
  Shield, 
  Skull, 
  Sparkles,
  ExternalLink,
  Plus,
  Minus,
  Eye,
  Bot,
  User,
  FileText,
  Terminal,
  Loader2
} from 'lucide-react';
import { OperativeDossierModal } from './OperativeDossierModal';

interface PlayersManagerProps {
  cities: any[];
  onRefreshParent?: () => void;
  onNavigateToNpcGenerator?: () => void;
}

export const PlayersManager: React.FC<PlayersManagerProps> = ({ 
  cities, 
  onRefreshParent,
  onNavigateToNpcGenerator 
}) => {
  const [players, setPlayers] = useState<PlayerOperative[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alive' | 'dead'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'PC' | 'NPC'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  // Resource Edit Modal state
  const [editingPlayer, setEditingPlayer] = useState<PlayerOperative | null>(null);
  const [formCurrentAp, setFormCurrentAp] = useState<number>(4);
  const [formMaxAp, setFormMaxAp] = useState<number>(4);
  const [formCredits, setFormCredits] = useState<number>(500);
  const [formIsAlive, setFormIsAlive] = useState<boolean>(true);
  const [formPlayerType, setFormPlayerType] = useState<'PC' | 'NPC'>('PC');
  const [formCityId, setFormCityId] = useState<string>('');
  const [formReason, setFormReason] = useState<string>('Admin adjustment');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Operative Dossier Modal state
  const [selectedDossierPlayer, setSelectedDossierPlayer] = useState<PlayerOperative | null>(null);

  // Skills inspection drawer/modal
  const [viewingSkillsPlayer, setViewingSkillsPlayer] = useState<PlayerOperative | null>(null);

  // Impersonating state
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const fetchPlayers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getPlayers();
      setPlayers(res.players || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load operatives roster');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Open modal
  const handleOpenEdit = (player: PlayerOperative) => {
    setEditingPlayer(player);
    setFormCurrentAp(player.action_points?.current_ap ?? 4);
    setFormMaxAp(player.action_points?.max_ap ?? 4);
    setFormCredits(player.credits ?? 500);
    setFormIsAlive(player.is_alive ?? true);
    setFormPlayerType(player.player_type || 'PC');
    setFormCityId(player.current_city_id || '');
    setFormReason('Admin adjustment');
  };

  // Save resource changes
  const handleSaveResources = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    setIsSaving(true);
    try {
      await adminApi.updatePlayerResources(editingPlayer.id, {
        current_ap: formCurrentAp,
        max_ap: formMaxAp,
        credits: formCredits,
        is_alive: formIsAlive,
        player_type: formPlayerType,
        city_id: formCityId || undefined,
        reason: formReason || 'Admin resource adjustment',
      });

      showStatus(`Resources updated for operative ${editingPlayer.name} (${editingPlayer.accounts?.dark_web_handle || 'Agent'})`);
      setEditingPlayer(null);
      fetchPlayers();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      showStatus(err.message || 'Failed to update player resources', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick inline nudge for AP
  const handleQuickApChange = async (player: PlayerOperative, delta: number) => {
    const current = player.action_points?.current_ap ?? 4;
    const max = player.action_points?.max_ap ?? 4;
    const newAp = Math.max(0, current + delta);

    try {
      await adminApi.updatePlayerResources(player.id, {
        current_ap: newAp,
        reason: `Admin quick AP ${delta > 0 ? '+' : ''}${delta}`,
      });
      // Optimistic update
      setPlayers(prev => prev.map(p => {
        if (p.id === player.id && p.action_points) {
          return {
            ...p,
            action_points: {
              ...p.action_points,
              current_ap: newAp,
            },
          };
        }
        return p;
      }));
      if (selectedDossierPlayer && selectedDossierPlayer.id === player.id && selectedDossierPlayer.action_points) {
        setSelectedDossierPlayer(prev => prev ? {
          ...prev,
          action_points: {
            ...prev.action_points!,
            current_ap: newAp,
          }
        } : null);
      }
      showStatus(`AP updated to ${newAp}/${max} for ${player.name}`);
    } catch (err: any) {
      showStatus(err.message || 'Failed to update AP', 'error');
      fetchPlayers();
    }
  };

  // Quick inline nudge for Credits
  const handleQuickCreditsChange = async (player: PlayerOperative, delta: number) => {
    const current = player.credits ?? 0;
    const newCredits = Math.max(0, current + delta);

    try {
      await adminApi.updatePlayerResources(player.id, {
        credits: newCredits,
        reason: `Admin quick credit ${delta > 0 ? '+' : ''}${delta}`,
      });
      // Optimistic update
      setPlayers(prev => prev.map(p => {
        if (p.id === player.id) {
          return {
            ...p,
            credits: newCredits,
          };
        }
        return p;
      }));
      if (selectedDossierPlayer && selectedDossierPlayer.id === player.id) {
        setSelectedDossierPlayer(prev => prev ? {
          ...prev,
          credits: newCredits,
        } : null);
      }
      showStatus(`Credits updated to ${newCredits} for ${player.name}`);
    } catch (err: any) {
      showStatus(err.message || 'Failed to update credits', 'error');
      fetchPlayers();
    }
  };

  // Quick toggle player type (PC <=> NPC)
  const handleQuickToggleType = async (player: PlayerOperative) => {
    const newType = (player.player_type === 'NPC') ? 'PC' : 'NPC';
    try {
      await adminApi.updatePlayerResources(player.id, {
        player_type: newType,
        reason: `Admin toggle player type to ${newType}`,
      });
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, player_type: newType } : p));
      if (selectedDossierPlayer && selectedDossierPlayer.id === player.id) {
        setSelectedDossierPlayer(prev => prev ? { ...prev, player_type: newType } : null);
      }
      showStatus(`Operative ${player.name} reclassified as ${newType} (${newType === 'NPC' ? 'Non-Player Character / Bot' : 'Player Character / Human'})`);
    } catch (err: any) {
      showStatus(err.message || 'Failed to toggle player type', 'error');
    }
  };

  // Quick toggle alive / fallen status
  const handleQuickToggleAlive = async (player: PlayerOperative) => {
    const newAlive = !player.is_alive;
    try {
      await adminApi.updatePlayerResources(player.id, {
        is_alive: newAlive,
        reason: `Admin toggle vitality to ${newAlive ? 'Alive' : 'Fallen'}`,
      });
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, is_alive: newAlive } : p));
      if (selectedDossierPlayer && selectedDossierPlayer.id === player.id) {
        setSelectedDossierPlayer(prev => prev ? { ...prev, is_alive: newAlive } : null);
      }
      showStatus(`Operative ${player.name} marked as ${newAlive ? 'Active / Operational' : 'Fallen / Eliminated'}`);
    } catch (err: any) {
      showStatus(err.message || 'Failed to toggle vitality status', 'error');
    }
  };

  // Impersonate / Assume Control of Operative (NPC or PC)
  const handleImpersonateOperative = async (player: PlayerOperative) => {
    setImpersonatingId(player.id);
    try {
      const res = await adminApi.impersonateOperative(player.id);
      if (res && res.token) {
        // Set player session token (tag_jwt_token is used by player app)
        localStorage.setItem('tag_jwt_token', res.token);
        // Mark session as admin impersonating so player UI shows returning header
        localStorage.setItem('tag_admin_impersonating', 'true');
        showStatus(`Assumption of control successful! Launching terminal session as ${player.name}...`);
        
        // Navigate to player dashboard view
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        throw new Error('No session token returned from server');
      }
    } catch (err: any) {
      showStatus(err.message || 'Failed to assume control of operative', 'error');
      setImpersonatingId(null);
    }
  };

  // Filtered list
  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        (p.accounts?.dark_web_handle && p.accounts.dark_web_handle.toLowerCase().includes(q)) ||
        (p.accounts?.email && p.accounts.email.toLowerCase().includes(q)) ||
        (p.accounts?.swiss_bank_number && p.accounts.swiss_bank_number.toLowerCase().includes(q)) ||
        (p.cities?.name && p.cities.name.toLowerCase().includes(q)) ||
        (p.professions?.name && p.professions.name.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'alive' 
          ? p.is_alive 
          : !p.is_alive;

      const matchType = typeFilter === 'all'
        ? true
        : typeFilter === 'NPC'
          ? p.player_type === 'NPC'
          : (p.player_type === 'PC' || !p.player_type);

      const matchCity = cityFilter === 'all' || p.current_city_id === cityFilter;

      return matchSearch && matchStatus && matchType && matchCity;
    });
  }, [players, searchQuery, statusFilter, typeFilter, cityFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = players.length;
    const alive = players.filter(p => p.is_alive).length;
    const pcCount = players.filter(p => (p.player_type || 'PC') === 'PC').length;
    const npcCount = players.filter(p => p.player_type === 'NPC').length;
    const totalCredits = players.reduce((acc, p) => acc + (p.credits || 0), 0);
    const totalAp = players.reduce((acc, p) => acc + (p.action_points?.current_ap || 0), 0);
    return { total, alive, pcCount, npcCount, totalCredits, totalAp };
  }, [players]);

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

      {/* Top Banner / Controls */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-amber-400 font-mono tracking-wide flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                OPERATIVES ROSTER & RESOURCES
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {players.length} Total Players
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Directly adjust Action Points (AP) and Swiss Bank Credits for any active or fallen player in the TAG world.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPlayers}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700 transition-colors cursor-pointer"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh</span>
            </button>

            {onNavigateToNpcGenerator && (
              <button
                onClick={onNavigateToNpcGenerator}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer shadow-md font-mono"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>NPC Generator</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-neutral-800/80 font-mono">
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-2.5">
            <span className="text-[10px] text-neutral-500 block">Total Operatives</span>
            <span className="text-sm sm:text-base font-bold text-neutral-100">{stats.total}</span>
          </div>
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-2.5">
            <span className="text-[10px] text-neutral-500 block">PC (Human)</span>
            <span className="text-sm sm:text-base font-bold text-emerald-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {stats.pcCount}
            </span>
          </div>
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-2.5">
            <span className="text-[10px] text-neutral-500 block">NPC (Bots)</span>
            <span className="text-sm sm:text-base font-bold text-amber-400 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" />
              {stats.npcCount}
            </span>
          </div>
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-2.5">
            <span className="text-[10px] text-neutral-500 block">Active / Alive</span>
            <span className="text-sm sm:text-base font-bold text-teal-400">{stats.alive}</span>
          </div>
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-2.5">
            <span className="text-[10px] text-neutral-500 block">Total AP Pool</span>
            <span className="text-sm sm:text-base font-bold text-amber-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              {stats.totalAp}
            </span>
          </div>
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-2.5">
            <span className="text-[10px] text-neutral-500 block">Total Credits</span>
            <span className="text-sm sm:text-base font-bold text-cyan-400 flex items-center gap-1 truncate">
              <Coins className="w-3.5 h-3.5 shrink-0" />
              {stats.totalCredits.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, codename, email, city, Swiss Bank #..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-mono placeholder:text-neutral-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Player Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="all">All Types (PC & NPC)</option>
              <option value="PC">PC (Human Players)</option>
              <option value="NPC">NPC (Bots / AI)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="all">All Statuses</option>
              <option value="alive">Alive Only</option>
              <option value="dead">Eliminated Only</option>
            </select>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-amber-500 font-mono"
            >
              <option value="all">All Cities</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} ({city.country})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Players List Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading && players.length === 0 ? (
          <div className="py-20 text-center space-y-2 font-mono text-xs text-neutral-400">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading operatives from neural network...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="py-16 text-center space-y-2 font-mono text-xs text-neutral-500">
            <Users className="w-8 h-8 mx-auto text-neutral-600 mb-1" />
            <p>No operatives found matching your criteria.</p>
            {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || cityFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all'); setCityFilter('all'); }}
                className="text-amber-400 hover:underline text-xs"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-neutral-950/80 border-b border-neutral-800 text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Operative (Click for Dossier)</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3">Credentials & Bank</th>
                  <th className="px-4 py-3">Location & Job</th>
                  <th className="px-4 py-3 text-center">Action Points (AP)</th>
                  <th className="px-4 py-3 text-center">Credits</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-mono">
                {filteredPlayers.map((player) => {
                  const currentAp = player.action_points?.current_ap ?? 0;
                  const maxAp = player.action_points?.max_ap ?? 4;
                  const isAlive = player.is_alive;
                  const isNpc = player.player_type === 'NPC';

                  return (
                    <tr 
                      key={player.id} 
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Operative Name & Codename (Click opens full Dossier) */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDossierPlayer(player)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer hover:scale-105 transition-transform ${
                              isAlive 
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:border-amber-400' 
                                : 'bg-rose-950/40 border border-rose-800/60 text-rose-400 hover:border-rose-500'
                            }`}
                            title="Click to view complete Operative Dossier"
                          >
                            {isAlive ? (
                              <span>{player.name.charAt(0).toUpperCase()}</span>
                            ) : (
                              <Skull className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <div className="font-bold text-neutral-100 flex items-center gap-1.5 font-sans">
                              <button
                                type="button"
                                onClick={() => setSelectedDossierPlayer(player)}
                                className="hover:text-amber-400 hover:underline decoration-dotted underline-offset-2 transition-colors cursor-pointer text-left flex items-center gap-1 font-bold group"
                                title="Click to view complete Operative Dossier"
                              >
                                <span className="text-neutral-100 group-hover:text-amber-300">{player.name}</span>
                                <FileText className="w-3 h-3 text-neutral-500 group-hover:text-amber-400 shrink-0" />
                              </button>
                              {player.accounts?.dark_web_handle && (
                                <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                  @{player.accounts.dark_web_handle}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                              <span>ID: {player.id.substring(0, 8)}...</span>
                              <button
                                type="button"
                                onClick={() => setSelectedDossierPlayer(player)}
                                className="text-amber-500/80 hover:text-amber-300 hover:underline ml-1"
                              >
                                [Dossier]
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Player Type (PC vs NPC) */}
                      <td className="px-4 py-3.5 text-center">
                        {isNpc ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-amber-950/70 text-amber-300 border border-amber-600/50 shadow-sm"
                            title="Non-Player Character (Autonomous Bot / System Operative)"
                          >
                            <Bot className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>NPC</span>
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-emerald-950/70 text-emerald-300 border border-emerald-600/50 shadow-sm"
                            title="Player Character (Human Operative)"
                          >
                            <User className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>PC</span>
                          </span>
                        )}
                      </td>

                      {/* Credentials & Bank */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="text-neutral-300 text-[11px] truncate max-w-[180px]">
                            {player.accounts?.email || 'No email attached'}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            Bank: <span className="text-neutral-400">{player.accounts?.swiss_bank_number || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Location & Profession */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-neutral-200 text-xs font-sans">
                            <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{player.cities?.name || 'Unknown City'}</span>
                            <span className="text-neutral-500 text-[10px]">({player.cities?.country})</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-mono">
                            <Briefcase className="w-3 h-3 text-neutral-500 shrink-0" />
                            <span>{player.professions?.name || 'Unemployed'}</span>
                            {player.professions?.ap_modifier !== undefined && (
                              <span className="text-[10px] text-neutral-500">
                                ({player.professions.ap_modifier >= 0 ? `+${player.professions.ap_modifier}` : player.professions.ap_modifier} AP)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* AP Controller */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
                          <button
                            onClick={() => handleQuickApChange(player, -1)}
                            disabled={currentAp <= 0}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Decrease AP by 1"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <div className="px-1 text-center min-w-[50px]">
                            <span className={`font-bold text-xs ${
                              currentAp === 0 
                                ? 'text-neutral-500' 
                                : currentAp >= maxAp 
                                  ? 'text-emerald-400' 
                                  : 'text-amber-400'
                            }`}>
                              {currentAp}
                            </span>
                            <span className="text-neutral-500 text-[10px]"> / {maxAp}</span>
                          </div>

                          <button
                            onClick={() => handleQuickApChange(player, 1)}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer"
                            title="Increase AP by 1"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Credits Controller */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
                          <button
                            onClick={() => handleQuickCreditsChange(player, -100)}
                            disabled={(player.credits || 0) <= 0}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Deduct 100 Credits"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="px-1 text-center min-w-[65px] font-bold text-xs text-cyan-400 font-mono">
                            {(player.credits ?? 0).toLocaleString()}
                          </span>

                          <button
                            onClick={() => handleQuickCreditsChange(player, 100)}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer"
                            title="Add 100 Credits"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        {isAlive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ALIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/80">
                            <Skull className="w-2.5 h-2.5" />
                            FALLEN
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Impersonate / Control Operative Button */}
                          <button
                            type="button"
                            onClick={() => handleImpersonateOperative(player)}
                            disabled={impersonatingId === player.id}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                              player.player_type === 'NPC'
                                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 hover:border-amber-400'
                                : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400'
                            }`}
                            title={`Assume control of ${player.name} in game terminal`}
                          >
                            {impersonatingId === player.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span className="hidden sm:inline">Connecting...</span>
                              </>
                            ) : (
                              <>
                                <Terminal className="w-3.5 h-3.5" />
                                <span>{player.player_type === 'NPC' ? 'Control NPC' : 'Play As'}</span>
                              </>
                            )}
                          </button>

                          {/* Dossier Quick View Button */}
                          <button
                            onClick={() => setSelectedDossierPlayer(player)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-600 text-xs font-mono transition-colors cursor-pointer"
                            title="View Complete Operative Dossier"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">Dossier</span>
                          </button>

                          {player.character_skills && player.character_skills.length > 0 && (
                            <button
                              onClick={() => setViewingSkillsPlayer(player)}
                              className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs transition-colors cursor-pointer"
                              title="Quick Skills Summary"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(player)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono transition-colors cursor-pointer"
                            title="Directly Edit AP & Credits"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Edit AP/Credits</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Direct AP & Credits Modification Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
          <div className="w-full max-w-lg bg-neutral-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-neutral-950 p-4 px-6 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100 font-mono">
                    ADJUST OPERATIVE RESOURCES
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Target: <span className="text-amber-400 font-bold">{editingPlayer.name}</span> ({editingPlayer.accounts?.dark_web_handle || 'Codename Unknown'})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingPlayer(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveResources} className="p-6 space-y-5 text-xs">
              {/* Action Points Section */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-amber-400 font-bold flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    ACTION POINTS (AP)
                  </label>
                  <span className="text-neutral-500 font-mono text-[11px]">
                    Current: {editingPlayer.action_points?.current_ap ?? 4} / {editingPlayer.action_points?.max_ap ?? 4}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 text-[11px] mb-1 font-mono">Current AP</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={formCurrentAp}
                      onChange={(e) => setFormCurrentAp(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 text-[11px] mb-1 font-mono">Max AP Capacity</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formMaxAp}
                      onChange={(e) => setFormMaxAp(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                {/* Quick Presets for AP */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-neutral-500 font-mono mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setFormCurrentAp(0)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-neutral-300 font-mono"
                  >
                    0 AP
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCurrentAp(formMaxAp)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-emerald-300 font-mono"
                  >
                    Full ({formMaxAp} AP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCurrentAp(prev => Math.min(formMaxAp, prev + 1))}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-amber-300 font-mono"
                  >
                    +1 AP
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCurrentAp(prev => Math.max(0, prev - 1))}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-rose-300 font-mono"
                  >
                    -1 AP
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormCurrentAp(4); setFormMaxAp(4); }}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-neutral-300 font-mono"
                  >
                    Reset (4/4)
                  </button>
                </div>
              </div>

              {/* Swiss Bank Credits Section */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    SWISS BANK CREDITS
                  </label>
                  <span className="text-neutral-500 font-mono text-[11px]">
                    Current: {(editingPlayer.credits || 0).toLocaleString()} Credits
                  </span>
                </div>

                <div>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formCredits}
                    onChange={(e) => setFormCredits(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                {/* Quick Presets for Credits */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-neutral-500 font-mono mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setFormCredits(0)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-neutral-300 font-mono"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCredits(prev => prev + 500)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-cyan-300 font-mono"
                  >
                    +500
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCredits(prev => prev + 1000)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-cyan-300 font-mono"
                  >
                    +1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCredits(prev => prev + 5000)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-cyan-300 font-mono"
                  >
                    +5,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCredits(prev => Math.max(0, prev - 500))}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-rose-300 font-mono"
                  >
                    -500
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCredits(10000)}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-emerald-300 font-mono"
                  >
                    High Roller (10k)
                  </button>
                </div>
              </div>

              {/* Status, Classification & Relocation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-400 text-[11px] mb-1 font-mono">Classification (Type)</label>
                  <select
                    value={formPlayerType}
                    onChange={(e) => setFormPlayerType(e.target.value as 'PC' | 'NPC')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  >
                    <option value="PC">PC (Human Player)</option>
                    <option value="NPC">NPC (Bot / System)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 text-[11px] mb-1 font-mono">Operative Status</label>
                  <select
                    value={formIsAlive ? 'alive' : 'dead'}
                    onChange={(e) => setFormIsAlive(e.target.value === 'alive')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  >
                    <option value="alive">Active (Alive)</option>
                    <option value="dead">Eliminated (Fallen)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 text-[11px] mb-1 font-mono">Relocate to City</label>
                  <select
                    value={formCityId}
                    onChange={(e) => setFormCityId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  >
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name} ({city.country})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 text-[11px] mb-1 font-mono">Audit Log Reason</label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Admin tournament reward, Balance patch, Test recharge"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Commit AP & Credits</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Skills Inspection Modal */}
      {viewingSkillsPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-neutral-950 p-4 px-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 font-mono">
                  LOADOUT SKILLS INSPECTION
                </h3>
                <p className="text-xs text-neutral-400">
                  Operative: <span className="text-amber-400 font-bold">{viewingSkillsPlayer.name}</span> (@{viewingSkillsPlayer.accounts?.dark_web_handle || 'Unknown'})
                </p>
              </div>

              <button
                onClick={() => setViewingSkillsPlayer(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
              {['assassination', 'defensive', 'intel', 'counter_intel'].map((poolKey) => {
                const poolSkills = (viewingSkillsPlayer.character_skills || []).filter(cs => cs.pool === poolKey);
                const title = poolKey.replace('_', '-').toUpperCase();

                return (
                  <div key={poolKey} className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-amber-400 text-[11px] tracking-wide">
                        {title} POOL ({poolSkills.length} SKILLS)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {poolSkills.map((cs, idx) => (
                        <div 
                          key={cs.id || idx}
                          className="p-2 bg-neutral-900/80 rounded-lg border border-neutral-800 flex items-center justify-between gap-2"
                        >
                          <span className="text-neutral-200 text-xs truncate">
                            {cs.skills?.name || `Skill ${cs.skill_id.substring(0, 6)}`}
                          </span>
                          {cs.skills?.range && (
                            <span className="text-[10px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded shrink-0">
                              {cs.skills.range}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-neutral-950 border-t border-neutral-800 text-right">
              <button
                onClick={() => setViewingSkillsPlayer(null)}
                className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operative Dossier Modal */}
      {selectedDossierPlayer && (
        <OperativeDossierModal
          player={selectedDossierPlayer}
          onClose={() => setSelectedDossierPlayer(null)}
          onOpenEditResources={(player) => {
            setSelectedDossierPlayer(null);
            handleOpenEdit(player);
          }}
          onQuickToggleAlive={handleQuickToggleAlive}
          onQuickToggleType={handleQuickToggleType}
          onQuickApChange={handleQuickApChange}
          onQuickCreditsChange={handleQuickCreditsChange}
          onImpersonateOperative={handleImpersonateOperative}
        />
      )}
    </div>
  );
};
