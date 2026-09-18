import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Skull, 
  Coins, 
  ShieldAlert, 
  Zap, 
  MapPin, 
  Plane, 
  Train, 
  Ship, 
  Car, 
  LogOut, 
  Clock, 
  User,
  AlertTriangle,
  Radar,
  Ban,
  XCircle,
  Bot,
  Shield,
  ArrowLeft
} from 'lucide-react';

interface HeaderProps {
  // player header interface
}

export const Header: React.FC<HeaderProps> = () => {
  const { account, character, logout, deathNotice, dismissDeathNotice, cancelTravel, abortSurveillance, refreshCharacter } = useGame();
  const [transitRemaining, setTransitRemaining] = useState<string>('');
  const [surveillanceRemaining, setSurveillanceRemaining] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'travel' | 'surveillance';
  }>({ isOpen: false, type: 'travel' });
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [timeToNextHour, setTimeToNextHour] = useState<string>('');
  const autoRefreshedRef = useRef<boolean>(false);

  // Next AP tick countdown (hourly on the clock hour :00)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const mins = 59 - now.getMinutes();
      const secs = 59 - now.getSeconds();
      setTimeToNextHour(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if this session is an admin impersonation session
  const adminActiveToken = typeof window !== 'undefined' ? localStorage.getItem('tag_admin_session_token') : null;
  const isImpersonated = typeof window !== 'undefined' && localStorage.getItem('tag_admin_impersonating') === 'true';

  const returnToAdmin = () => {
    localStorage.removeItem('tag_admin_impersonating');
    window.location.href = '/?app=admin';
  };

  // In Transit countdown
  useEffect(() => {
    if (!character || character.travel_status !== 'in_transit' || !character.arrives_at) {
      setTransitRemaining('');
      autoRefreshedRef.current = false;
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const arrival = new Date(character.arrives_at!).getTime();
      const diff = arrival - now;

      if (diff <= 0) {
        setTransitRemaining('Arriving momentarily...');
        if (!autoRefreshedRef.current) {
          autoRefreshedRef.current = true;
          setTimeout(() => {
            refreshCharacter();
          }, 1500);
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTransitRemaining(
          `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s remaining`
        );
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [character, refreshCharacter]);

  // In Surveillance countdown
  useEffect(() => {
    if (!character || character.travel_status !== 'in_surveillance' || !character.arrives_at) {
      setSurveillanceRemaining('');
      return;
    }

    const updateSurvTimer = () => {
      const now = new Date().getTime();
      const arrival = new Date(character.arrives_at!).getTime();
      const diff = arrival - now;

      if (diff <= 0) {
        setSurveillanceRemaining('Probe completed. Finalizing intelligence report...');
        if (!autoRefreshedRef.current) {
          autoRefreshedRef.current = true;
          setTimeout(() => {
            refreshCharacter();
          }, 1500);
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setSurveillanceRemaining(
          `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s remaining`
        );
      }
    };

    updateSurvTimer();
    const timer = setInterval(updateSurvTimer, 1000);
    return () => clearInterval(timer);
  }, [character, refreshCharacter]);

  const handleConfirmAction = async () => {
    setIsCanceling(true);
    setCancelError(null);
    try {
      if (confirmModal.type === 'travel') {
        await cancelTravel();
      } else {
        await abortSurveillance();
      }
      setConfirmModal({ isOpen: false, type: 'travel' });
    } catch (err: any) {
      setCancelError(err?.message || 'Action failed. Please try again.');
    } finally {
      setIsCanceling(false);
    }
  };

  const currentAp = character?.action_points?.current_ap ?? 0;
  const maxAp = character?.action_points?.max_ap ?? 4;
  const isDead = character && !character.is_alive;

  return (
    <>
      {/* Cancellation / Abort Confirmation Pop-up */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in font-mono">
          <div className="bg-neutral-950 border-2 border-amber-600/80 rounded-xl max-w-md w-full p-6 text-neutral-100 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-600 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-center text-amber-400 uppercase tracking-wider mb-2">
              {confirmModal.type === 'travel' ? 'CANCEL TRAVEL // CONFIRM' : 'ABORT SURVEILLANCE // CONFIRM'}
            </h3>
            <p className="text-xs text-neutral-300 text-center leading-relaxed mb-4">
              {confirmModal.type === 'travel' ? (
                <>
                  Are you sure you want to cancel your ongoing transit? The operative will abort the journey and remain stationed at{' '}
                  <strong className="text-neutral-100">{character?.cities?.name}</strong>.
                </>
              ) : (
                <>
                  Are you sure you want to abort your active surveillance sweep? The operative will terminate field probes immediately.
                </>
              )}
            </p>
            <div className="bg-rose-950/50 border border-rose-800/80 rounded-lg p-3 text-xs text-rose-300 mb-5 flex items-start gap-2">
              <Ban className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>CRITICAL RULE:</strong> All AP and Money paid to initiate {confirmModal.type === 'travel' ? 'Travel' : 'Surveillance'} is lost. Future AP locked for deficit will be released.
              </div>
            </div>

            {cancelError && (
              <div className="mb-4 p-2.5 rounded bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
                {cancelError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => setConfirmModal({ isOpen: false, type: 'travel' })}
                className="flex-1 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                disabled={isCanceling}
                onClick={handleConfirmAction}
                className="flex-1 py-2.5 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isCanceling ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>{confirmModal.type === 'travel' ? 'Cancel Travel' : 'Abort Probe'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Immediate Death Alert Pop-up */}
      {deathNotice.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-neutral-950 border-2 border-rose-600 rounded-xl max-w-md w-full p-6 text-neutral-100 shadow-2xl relative font-mono">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-600 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <Skull className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-center text-rose-400 uppercase tracking-wider mb-2">
              OPERATIVE ELIMINATED // PERMADEATH
            </h3>
            <p className="text-xs text-neutral-300 text-center leading-relaxed mb-4">
              {deathNotice.details || 'Your operative has been neutralized in the line of duty. All credentials, credits, and active operations are terminated.'}
            </p>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-400 mb-5 space-y-1">
              <div>Operative: <strong className="text-neutral-200">{deathNotice.characterName || character?.name}</strong></div>
              <div>Swiss Bank: <strong className="text-amber-300">{account?.swiss_bank_number}</strong> (Purged)</div>
              <div>Gold Coins: <strong className="text-yellow-400">{account?.gold_coins} ⛃</strong> (Safely retained in offshore escrow)</div>
            </div>
            <button
              onClick={dismissDeathNotice}
              className="w-full py-2.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Acknowledge & Prepare New Identity
            </button>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/90 sticky top-0 z-40 backdrop-blur-md font-mono">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: App Title & Operative Identity */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-amber-400 font-bold text-sm tracking-tighter">
                TAG
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-100 text-sm">
                    {character ? character.name : account?.dark_web_handle || 'UNREGISTERED'}
                  </span>
                  {character && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${
                      isDead 
                        ? 'bg-rose-950 text-rose-400 border-rose-800' 
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    }`}>
                      {isDead ? 'KILLED' : 'ACTIVE'}
                    </span>
                  )}
                  {character?.professions && (
                    <span className="text-[10px] text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                      {character.professions.name}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                  <span>Handle: <strong className="text-neutral-400">{account?.dark_web_handle}</strong></span>
                  <span>•</span>
                  <span>Swiss Bank: <strong className="text-neutral-300">{account?.swiss_bank_number}</strong></span>
                </div>
              </div>
            </div>

            {/* Middle: Live Stats (AP, Credits, Gold, City) */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* AP Bar */}
              <div
                className="bg-neutral-900/80 border border-neutral-800 rounded-lg px-3 py-1.5 flex items-center gap-2"
                title={`All operatives regain 1 AP at every tick of the clock hour (:00). Next tick in ${timeToNextHour}.`}
              >
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>AP:</span>
                </div>
                <span className={`font-bold ${currentAp < 0 ? 'text-rose-400' : currentAp === 0 ? 'text-amber-400' : 'text-neutral-100'}`}>
                  {currentAp} / {maxAp}
                </span>
                {currentAp < maxAp && (
                  <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                    <span>(+1 at :00 in</span>
                    <span className="text-amber-400 font-semibold">{timeToNextHour}</span>
                    <span>)</span>
                  </span>
                )}
                {currentAp < 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 uppercase font-mono">
                    Deficit ({Math.abs(currentAp)})
                  </span>
                )}
              </div>

              {/* Credits */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">$</span>
                <span className="font-bold text-neutral-200">
                  {character ? character.credits.toLocaleString() : 0}
                </span>
                <span className="text-[10px] text-neutral-500">Credits</span>
              </div>

              {/* Gold Coins */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="font-bold text-yellow-300">
                  {account?.gold_coins || 0}
                </span>
                <span className="text-[10px] text-neutral-500">Gold</span>
              </div>

              {/* Current City */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-neutral-200">
                  {character?.cities?.name || 'Sector Unknown'}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {isImpersonated && adminActiveToken && (
                <button
                  type="button"
                  onClick={returnToAdmin}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  title="Exit Operative Control and Return to Game Master Console"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Admin</span>
                </button>
              )}

              <button
                onClick={logout}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Disconnect from Secure Terminal"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Admin Puppet/Impersonation Banner */}
          {isImpersonated && (
            <div className="mt-2.5 bg-amber-950/60 border border-amber-500/60 rounded-lg p-2 px-3 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm font-mono">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-amber-300">ADMIN CONTROL ACTIVE:</strong> Controlling autonomous operative <strong>{character?.name}</strong> ({character?.player_type || 'NPC'}). All gameplay actions (Travel, Surveillance, Strike, Market) execute live in the game state.
                </span>
              </div>
              <button
                onClick={returnToAdmin}
                className="px-2.5 py-1 rounded bg-neutral-950 hover:bg-neutral-900 border border-amber-500/50 text-amber-300 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
              >
                Exit Control Mode
              </button>
            </div>
          )}

          {/* In-Transit Alert Banner */}
          {character?.travel_status === 'in_transit' && (
            <div className="mt-2.5 bg-amber-950/40 border border-amber-600/50 rounded-lg p-2.5 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {character.transport_mode === 'air' && <Plane className="w-4 h-4 text-cyan-400 animate-pulse" />}
                {character.transport_mode === 'rail' && <Train className="w-4 h-4 text-emerald-400 animate-pulse" />}
                {character.transport_mode === 'water' && <Ship className="w-4 h-4 text-blue-400 animate-pulse" />}
                {character.transport_mode === 'road' && <Car className="w-4 h-4 text-amber-400 animate-pulse" />}
                <span>
                  <strong>IN TRANSIT:</strong> Traveling via {typeof character.transport_mode === 'string' ? character.transport_mode.toUpperCase() : 'TRANSIT'} from {character.cities?.name}. Operative remains in departure city until verified arrival.
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{transitRemaining}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: true, type: 'travel' })}
                  className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Cancel travel (All paid AP & Credits will be lost)"
                >
                  <Ban className="w-3 h-3 text-rose-400" />
                  <span>Cancel Travel</span>
                </button>
              </div>
            </div>
          )}

          {/* In-Surveillance Alert Banner */}
          {character?.travel_status === 'in_surveillance' && (
            <div className="mt-2.5 bg-cyan-950/40 border border-cyan-500/50 rounded-lg p-2.5 text-xs text-cyan-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>
                  <strong>IN SURVEILLANCE MODE:</strong> Operative is locked in surveillance recon. Earning AP to cover deficit before intelligence delivery.
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{surveillanceRemaining}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: true, type: 'surveillance' })}
                  className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Abort surveillance (All paid AP & Credits will be lost)"
                >
                  <Ban className="w-3 h-3 text-rose-400" />
                  <span>Abort Surveillance</span>
                </button>
              </div>
            </div>
          )}

          {/* Permadeath Notice Banner */}
          {isDead && (
            <div className="mt-2.5 bg-rose-950/60 border border-rose-600/60 rounded-lg p-2.5 text-xs text-rose-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-rose-400" />
                <span>
                  <strong>OPERATIVE STATUS: DECEASED.</strong> This character has been permanently terminated. Create a new operative identity to rejoin the grid.
                </span>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
