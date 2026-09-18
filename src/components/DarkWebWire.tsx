import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { darkwebApi } from '../services/api';
import { 
  DarkWebBulletin, 
  DarkWebKillFeedItem, 
  DarkWebThread, 
  DarkWebPost, 
  DarkWebMessage, 
  DarkWebCipherRoom, 
  DarkWebCipherMessage,
  VendettaBounty
} from '../types';
import { 
  Terminal, 
  ShieldAlert, 
  Skull, 
  MessageSquare, 
  Mail, 
  Lock, 
  Radio, 
  RefreshCw, 
  Send, 
  EyeOff, 
  Flame, 
  AlertTriangle, 
  PlusCircle, 
  ChevronRight, 
  Crosshair, 
  Shield, 
  CheckCircle2, 
  KeyRound, 
  Users, 
  Clock, 
  HelpCircle,
  Radar,
  Coins,
  Handshake,
  UserX
} from 'lucide-react';

type SubBoard = 'bulletins' | 'forum' | 'deaddrop' | 'cipher' | 'covenant';
type ForumChannel = 'all' | 'general' | 'trade' | 'intel' | 'bounties' | 'ops';

interface DarkWebWireProps {
  onHuntTarget?: (targetName: string, targetCity?: string) => void;
}

export const DarkWebWire: React.FC<DarkWebWireProps> = ({ onHuntTarget }) => {
  const { account, character, refreshCharacter } = useGame();

  // Active Sub-Board selection
  const [activeBoard, setActiveBoard] = useState<SubBoard>('bulletins');
  const [themeMode, setThemeMode] = useState<'emerald' | 'amber'>('emerald');
  const [soundHandshake, setSoundHandshake] = useState(false);

  // Sub-board 1: Sedes Obscura Bulletins & Kill Feed
  const [bulletins, setBulletins] = useState<DarkWebBulletin[]>([]);
  const [vendettas, setVendettas] = useState<VendettaBounty[]>([]);
  const [myVendetta, setMyVendetta] = useState<VendettaBounty | null>(null);
  const [bulletinFilter, setBulletinFilter] = useState<'all' | 'official' | 'vendetta'>('all');
  const [killFeed, setKillFeed] = useState<DarkWebKillFeedItem[]>([]);
  const [isLoadingBulletins, setIsLoadingBulletins] = useState(false);
  const [isSyncingTargets, setIsSyncingTargets] = useState(false);
  const [isSimulatingVendetta, setIsSimulatingVendetta] = useState(false);
  const [actionVendettaId, setActionVendettaId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'pacify' | 'negotiate' | 'eliminate' | null>(null);

  // Sub-board 2: Underground Forum
  const [activeChannel, setActiveChannel] = useState<ForumChannel>('all');
  const [threads, setThreads] = useState<DarkWebThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<DarkWebThread | null>(null);
  const [threadPosts, setThreadPosts] = useState<DarkWebPost[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isPostingThread, setIsPostingThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newThreadChannel, setNewThreadChannel] = useState<'general' | 'trade' | 'intel' | 'bounties' | 'ops'>('general');
  const [newThreadAnon, setNewThreadAnon] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);

  // Sub-board 3: Encrypted Dead-Drop (Email)
  const [messages, setMessages] = useState<DarkWebMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<DarkWebMessage | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isComposingMail, setIsComposingMail] = useState(false);
  const [mailRecipient, setMailRecipient] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [mailBurnOnRead, setMailBurnOnRead] = useState(false);

  // Sub-board 4: Cipher Rooms
  const [cipherRooms, setCipherRooms] = useState<DarkWebCipherRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<DarkWebCipherRoom | null>(null);
  const [roomMessages, setRoomMessages] = useState<DarkWebCipherMessage[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createRoomCode, setCreateRoomCode] = useState('');
  const [createRoomName, setCreateRoomName] = useState('');
  const [createRoomPasscode, setCreateRoomPasscode] = useState('');
  const [cipherMsgInput, setCipherMsgInput] = useState('');
  const [cipherError, setCipherError] = useState<string | null>(null);

  // Status feedback toast
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // ── Load Bulletins & Underworld Vendettas ──────────────────
  const fetchBulletins = async () => {
    setIsLoadingBulletins(true);
    try {
      const res = await darkwebApi.getBulletins(character?.id);
      if (res.success) {
        setBulletins(res.bulletins);
        setKillFeed(res.killFeed);
        if (res.vendettas) setVendettas(res.vendettas);
        if (res.myVendetta !== undefined) setMyVendetta(res.myVendetta);
      }
    } catch (err) {
      console.error('Failed to load bulletins', err);
    } finally {
      setIsLoadingBulletins(false);
    }
  };

  // ── Synchronize & Auto-Spawn Contract Targets ───────────────
  const handleSyncTargets = async () => {
    setIsSyncingTargets(true);
    try {
      const res = await darkwebApi.syncBulletinTargets();
      if (res.success) {
        setBulletins(res.bulletins);
        if (res.vendettas) setVendettas(res.vendettas);
        showStatus('TARGET REGISTRY SYNCHRONIZED: Contract marks verified active in DB.');
      }
    } catch (err: any) {
      showStatus(err.message || 'Target registry synchronization failed');
    } finally {
      setIsSyncingTargets(false);
    }
  };

  // ── Simulate Reckless Strike Retaliation (Dev/Testing Tool) ──
  const handleSimulateVendetta = async () => {
    setIsSimulatingVendetta(true);
    try {
      const res = await darkwebApi.testTriggerVendetta();
      if (res.success) {
        showStatus(`RETALIATION TRIGGERED: Associates placed blood-debt bounty on your head!`);
        await fetchBulletins();
      }
    } catch (err: any) {
      showStatus(err.message || 'Failed to simulate vendetta');
    } finally {
      setIsSimulatingVendetta(false);
    }
  };

  // ── Cessation Action 1: Pacify with Restitution ─────────────
  const handlePacify = async (vendettaId: string) => {
    setActionVendettaId(vendettaId);
    setActionLoading('pacify');
    try {
      const res = await darkwebApi.pacifyVendettaRestitution(vendettaId);
      if (res.success) {
        showStatus(res.message);
        await fetchBulletins();
        if (refreshCharacter) await refreshCharacter();
      }
    } catch (err: any) {
      showStatus(err.message || 'Restitution failed');
    } finally {
      setActionLoading(null);
      setActionVendettaId(null);
    }
  };

  // ── Cessation Action 2: Negotiate Underworld Truce ──────────
  const handleNegotiate = async (vendettaId: string) => {
    setActionVendettaId(vendettaId);
    setActionLoading('negotiate');
    try {
      const res = await darkwebApi.negotiateVendettaTruce(vendettaId);
      if (res.success) {
        showStatus(res.message);
        await fetchBulletins();
        if (refreshCharacter) await refreshCharacter();
      }
    } catch (err: any) {
      showStatus(err.message || 'Negotiation failed');
    } finally {
      setActionLoading(null);
      setActionVendettaId(null);
    }
  };

  // ── Cessation Action 3: Direct Hit Simulation on Patron ─────
  const handleEliminateIssuer = async (vendettaId: string) => {
    setActionVendettaId(vendettaId);
    setActionLoading('eliminate');
    try {
      const res = await darkwebApi.eliminateVendettaIssuer(vendettaId);
      if (res.success) {
        showStatus(res.message);
        await fetchBulletins();
        if (refreshCharacter) await refreshCharacter();
      }
    } catch (err: any) {
      showStatus(err.message || 'Elimination action failed');
    } finally {
      setActionLoading(null);
      setActionVendettaId(null);
    }
  };

  // ── Load Threads ────────────────────────────────────────────
  const fetchThreads = async (ch: ForumChannel = activeChannel) => {
    setIsLoadingThreads(true);
    try {
      const res = await darkwebApi.getThreads(ch);
      if (res.success) {
        setThreads(res.threads);
      }
    } catch (err) {
      console.error('Failed to load threads', err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const openThread = async (t: DarkWebThread) => {
    setSelectedThread(t);
    try {
      const res = await darkwebApi.getThread(t.id);
      if (res.success) {
        setThreadPosts(res.posts);
      }
    } catch (err) {
      console.error('Failed to load thread detail', err);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle.trim() || !newThreadContent.trim()) return;
    try {
      const res = await darkwebApi.createThread({
        channel: newThreadChannel,
        title: newThreadTitle.trim(),
        content: newThreadContent.trim(),
        is_anonymous: newThreadAnon,
      });
      if (res.success) {
        showStatus('TRANSMISSION SUCCESSFUL: Thread packet broadcasted.');
        setNewThreadTitle('');
        setNewThreadContent('');
        setIsPostingThread(false);
        fetchThreads(activeChannel);
      }
    } catch (err: any) {
      showStatus(err.message || 'Error transmitting thread');
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyContent.trim()) return;
    try {
      const res = await darkwebApi.replyToThread(selectedThread.id, {
        content: replyContent.trim(),
        is_anonymous: replyAnon,
      });
      if (res.success) {
        setThreadPosts((prev) => [...prev, res.post]);
        setReplyContent('');
        showStatus('REPLY DISPATCHED TO ENCRYPTED CLUSTER');
      }
    } catch (err: any) {
      showStatus(err.message || 'Error sending reply');
    }
  };

  // ── Load Messages ───────────────────────────────────────────
  const fetchMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const res = await darkwebApi.getMessages();
      if (res.success) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleOpenMessage = async (m: DarkWebMessage) => {
    setSelectedMessage(m);
    if (!m.is_read) {
      try {
        const res = await darkwebApi.readMessage(m.id);
        if (res.burned) {
          showStatus('SECURITY WARNING: This message self-destructed upon reading.');
          setMessages((prev) => prev.filter((item) => item.id !== m.id));
        } else {
          setMessages((prev) =>
            prev.map((item) => (item.id === m.id ? { ...item, is_read: true } : item))
          );
        }
      } catch (err) {
        // ignore
      }
    }
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailRecipient.trim() || !mailSubject.trim() || !mailBody.trim()) return;
    try {
      const res = await darkwebApi.sendMessage({
        recipient_handle: mailRecipient.trim(),
        subject: mailSubject.trim(),
        body: mailBody.trim(),
        burn_on_read: mailBurnOnRead,
      });
      if (res.success) {
        showStatus('DEAD-DROP PACKET SECURED & ENCRYPTED FOR RECIPIENT');
        setMailRecipient('');
        setMailSubject('');
        setMailBody('');
        setMailBurnOnRead(false);
        setIsComposingMail(false);
        fetchMessages();
      }
    } catch (err: any) {
      showStatus(err.message || 'Dead-drop dispatch failed');
    }
  };

  // ── Load Cipher Rooms ───────────────────────────────────────
  const fetchCipherRooms = async () => {
    try {
      const res = await darkwebApi.getCipherRooms();
      if (res.success) {
        setCipherRooms(res.rooms);
      }
    } catch (err) {
      console.error('Failed to load cipher rooms', err);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCipherError(null);
    if (!joinCode.trim() || !joinPasscode.trim()) return;
    try {
      const res = await darkwebApi.joinCipherRoom({
        room_code: joinCode.trim(),
        passcode: joinPasscode.trim(),
      });
      if (res.success) {
        setActiveRoom(res.room);
        setRoomMessages(res.messages);
        showStatus(`CIPHER CHANNEL ESTABLISHED: [${res.room.room_code}]`);
      }
    } catch (err: any) {
      setCipherError(err.message || 'Access Denied: Invalid Passcode');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCipherError(null);
    if (!createRoomCode.trim() || !createRoomName.trim() || !createRoomPasscode.trim()) return;
    try {
      const res = await darkwebApi.createCipherRoom({
        room_code: createRoomCode.trim(),
        name: createRoomName.trim(),
        passcode: createRoomPasscode.trim(),
      });
      if (res.success) {
        showStatus(`ROOM INITIALIZED: [${res.room.room_code}]`);
        setIsCreatingRoom(false);
        setJoinCode(res.room.room_code);
        setJoinPasscode(createRoomPasscode.trim());
        fetchCipherRooms();
      }
    } catch (err: any) {
      setCipherError(err.message || 'Room initialization failed');
    }
  };

  const handleSendCipherMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !cipherMsgInput.trim()) return;
    try {
      const res = await darkwebApi.sendCipherMessage(activeRoom.id, cipherMsgInput.trim());
      if (res.success) {
        setRoomMessages((prev) => [...prev, res.message]);
        setCipherMsgInput('');
      }
    } catch (err: any) {
      showStatus(err.message || 'Packet dropped');
    }
  };

  // Initial Load
  useEffect(() => {
    fetchBulletins();
    fetchThreads();
    fetchMessages();
    fetchCipherRooms();
  }, []);

  const colorTheme = themeMode === 'emerald' ? {
    border: 'border-emerald-500/40',
    borderLight: 'border-emerald-500/20',
    textPrimary: 'text-emerald-400',
    textSecondary: 'text-emerald-500/80',
    bgBadge: 'bg-emerald-950/60',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    accentText: 'text-emerald-300',
    cursor: 'bg-emerald-400',
  } : {
    border: 'border-amber-500/40',
    borderLight: 'border-amber-500/20',
    textPrimary: 'text-amber-400',
    textSecondary: 'text-amber-500/80',
    bgBadge: 'bg-amber-950/60',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    accentText: 'text-amber-300',
    cursor: 'bg-amber-400',
  };

  return (
    <div className={`space-y-4 font-mono select-none transition-colors duration-300 ${colorTheme.textPrimary}`}>
      {/* ── Retro CRT Top Shell ────────────────────────────────────────── */}
      <div className={`bg-black/95 border-2 ${colorTheme.border} rounded-lg p-3 ${colorTheme.glow} relative overflow-hidden`}>
        {/* Subtle scanline texture simulation */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-25 z-0" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold tracking-wider text-sm">
                NODE 0x7A // THE SHADOW NET &bull; SEDES OBSCURA CIPHER TERMINAL
              </span>
            </div>
            <p className="text-[11px] opacity-75">
              BAUD: 28,800 bps &bull; PGP: 4096-BIT RSA &bull; LOGGED AS: [{account?.dark_web_handle || 'ANONYMOUS'}]
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* CRT Phosphor Palette Toggle */}
            <div className="flex items-center border border-neutral-800 bg-neutral-950 p-0.5 rounded text-[10px]">
              <button
                type="button"
                onClick={() => setThemeMode('emerald')}
                className={`px-2 py-1 rounded transition-colors ${themeMode === 'emerald' ? 'bg-emerald-900/60 text-emerald-300 font-bold' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                PHOSPHOR [P1-GREEN]
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('amber')}
                className={`px-2 py-1 rounded transition-colors ${themeMode === 'amber' ? 'bg-amber-900/60 text-amber-300 font-bold' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                AMBER [P3-GOLD]
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchBulletins();
                fetchThreads();
                fetchMessages();
                fetchCipherRooms();
                showStatus('CARRIER SYNC RE-ESTABLISHED.');
              }}
              className={`p-1.5 border ${colorTheme.border} rounded hover:bg-white/5 transition-colors`}
              title="Refresh BBS Feed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ASCII Channel Navigation Bar */}
        <div className="relative z-10 mt-3 pt-2.5 border-t border-dashed border-neutral-800/80 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] opacity-60 mr-1 uppercase">Select Sub-Board:</span>
          
          <button
            type="button"
            onClick={() => { setActiveBoard('bulletins'); setSelectedThread(null); }}
            className={`px-2.5 py-1 rounded border text-xs transition-all flex items-center gap-1.5 ${
              activeBoard === 'bulletins'
                ? `bg-white/10 ${colorTheme.border} font-bold shadow-sm`
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>[01] SEDES OBSCURA BULLETINS</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveBoard('forum'); }}
            className={`px-2.5 py-1 rounded border text-xs transition-all flex items-center gap-1.5 ${
              activeBoard === 'forum'
                ? `bg-white/10 ${colorTheme.border} font-bold shadow-sm`
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>[02] UNDERGROUND FORUM</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveBoard('deaddrop'); }}
            className={`px-2.5 py-1 rounded border text-xs transition-all flex items-center gap-1.5 ${
              activeBoard === 'deaddrop'
                ? `bg-white/10 ${colorTheme.border} font-bold shadow-sm`
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>[03] ENCRYPTED DEAD-DROP</span>
            {messages.some(m => !m.is_read) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => { setActiveBoard('cipher'); }}
            className={`px-2.5 py-1 rounded border text-xs transition-all flex items-center gap-1.5 ${
              activeBoard === 'cipher'
                ? `bg-white/10 ${colorTheme.border} font-bold shadow-sm`
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>[04] CIPHER ROOMS</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveBoard('covenant'); }}
            className={`px-2.5 py-1 rounded border text-xs transition-all flex items-center gap-1.5 ${
              activeBoard === 'covenant'
                ? `bg-white/10 ${colorTheme.border} font-bold shadow-sm`
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>[05] COVENANT LAW</span>
          </button>
        </div>

        {/* Live system status toast ticker */}
        {statusMsg && (
          <div className="relative z-10 mt-2 text-[11px] bg-neutral-900/90 border border-neutral-700 px-3 py-1 rounded text-white flex items-center gap-2">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>&gt; {statusMsg}</span>
          </div>
        )}
      </div>

      {/* ── SUB-BOARD 1: SEDES OBSCURA SANCTIONS & UNDERWORLD VENDETTAS ─────────── */}
      {activeBoard === 'bulletins' && (
        <div className="space-y-4">
          {/* Active Personal Vendetta Threat Warning Banner if PC has a bounty on their head */}
          {myVendetta && (
            <div className="bg-gradient-to-r from-rose-950/90 via-neutral-950 to-neutral-950 border-2 border-rose-600 rounded-xl p-4 text-xs space-y-3 shadow-2xl relative overflow-hidden animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-800/60 pb-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold tracking-wider uppercase">
                  <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>⚠️ ACTIVE UNDERWORLD VENDETTA ON YOUR HEAD</span>
                  {myVendetta.escalation_count && myVendetta.escalation_count > 1 && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-900 text-white font-mono text-[9px]">
                      ESCALATED x{myVendetta.escalation_count}
                    </span>
                  )}
                </div>
                <div className="px-2.5 py-1 bg-amber-950/90 border border-amber-500 rounded text-amber-300 font-mono font-bold self-start sm:self-auto flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  <span>BOUNTY ON YOUR LIFE: ${myVendetta.bounty_credits.toLocaleString()} CHF</span>
                </div>
              </div>

              {/* Linked NPC Issuer Dossier */}
              <div className="bg-black/60 border border-rose-900/50 rounded-lg p-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div>
                    <span className="text-neutral-400 font-mono">CONTRACT PATRON (NPC): </span>
                    <strong className="text-rose-300 text-xs">{myVendetta.issuer_npc_name || myVendetta.issued_by}</strong>
                    {myVendetta.issuer_faction && (
                      <span className="text-neutral-400 font-normal"> &bull; {myVendetta.issuer_faction}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-neutral-400">PATRON LOCATION:</span>
                    <span className="text-cyan-300 font-bold">{myVendetta.issuer_npc_city_name || myVendetta.target_city}</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold ${myVendetta.issuer_npc_is_alive !== false ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-neutral-800 text-neutral-400'}`}>
                      {myVendetta.issuer_npc_is_alive !== false ? 'TARGETABLE' : 'DECEASED'}
                    </span>
                  </div>
                </div>

                {myVendetta.issuer_dialogue && (
                  <div className="bg-rose-950/30 border-l-2 border-rose-500 pl-2.5 py-1 text-[11px] italic text-rose-200/90">
                    &ldquo;{myVendetta.issuer_dialogue}&rdquo;
                  </div>
                )}

                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Following an unprovoked strike against <strong className="text-neutral-100">{myVendetta.victim_name}</strong> in {myVendetta.incident_city}, patron <strong className="text-rose-300">{myVendetta.issuer_npc_name || myVendetta.issued_by}</strong> placed this open bounty. To cease this contract, you must eliminate the patron, pay blood-money restitution, or negotiate an underworld truce.
                </p>
              </div>

              {/* Three Cessation Pathways */}
              <div className="pt-2 border-t border-rose-900/60 space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 flex items-center justify-between">
                  <span>// CONTRACT CESSATION PROTOCOLS (RESOLVE THREAT)</span>
                  <span className="text-amber-400 font-bold">YOUR ASSETS: {character?.credits.toLocaleString()} CHF | {character?.action_points?.current_ap ?? 0} AP</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* Path 1: Eliminate NPC Issuer */}
                  <div className="bg-neutral-950/80 border border-neutral-800 hover:border-rose-700/80 rounded-lg p-2.5 space-y-2 flex flex-col justify-between transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
                        <UserX className="w-3.5 h-3.5" />
                        <span>1. ELIMINATE PATRON</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-tight">
                        Assassinate {myVendetta.issuer_npc_name} in {myVendetta.issuer_npc_city_name}. Once dead, all escrow is voided.
                      </p>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {onHuntTarget && (
                        <button
                          type="button"
                          onClick={() => onHuntTarget(myVendetta.issuer_npc_name || myVendetta.issued_by, myVendetta.issuer_npc_city_name)}
                          className="w-full py-1 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Radar className="w-3 h-3 text-rose-400 animate-pulse" />
                          <span>HUNT IN {myVendetta.issuer_npc_city_name?.toUpperCase()}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEliminateIssuer(myVendetta.id)}
                        disabled={actionLoading !== null}
                        className="w-full py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Simulate direct assassination of this contract patron"
                      >
                        <Skull className="w-3 h-3 text-neutral-400" />
                        <span>{actionLoading === 'eliminate' && actionVendettaId === myVendetta.id ? 'EXECUTING HIT...' : 'DIRECT HIT (TEST)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Path 2: Pacify (Blood-Money Restitution) */}
                  <div className="bg-neutral-950/80 border border-neutral-800 hover:border-amber-700/80 rounded-lg p-2.5 space-y-2 flex flex-col justify-between transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                        <Coins className="w-3.5 h-3.5" />
                        <span>2. PACIFY (RESTITUTION)</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-tight">
                        Transfer blood money directly to {myVendetta.issuer_npc_name} to lift the contract immediately.
                      </p>
                    </div>
                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] font-mono text-neutral-400 flex justify-between">
                        <span>COST:</span>
                        <strong className="text-amber-300">{(myVendetta.settlement_cost || Math.round(myVendetta.bounty_credits * 0.65)).toLocaleString()} CHF</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePacify(myVendetta.id)}
                        disabled={actionLoading !== null || (character?.credits ?? 0) < (myVendetta.settlement_cost || Math.round(myVendetta.bounty_credits * 0.65))}
                        className="w-full py-1 bg-amber-950/90 hover:bg-amber-900 text-amber-200 border border-amber-700/80 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Coins className="w-3 h-3 text-amber-400" />
                        <span>
                          {actionLoading === 'pacify' && actionVendettaId === myVendetta.id
                            ? 'TRANSFERRING...'
                            : (character?.credits ?? 0) < (myVendetta.settlement_cost || Math.round(myVendetta.bounty_credits * 0.65))
                            ? 'INSUFFICIENT FUNDS'
                            : 'PAY RESTITUTION'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Path 3: Negotiate (Underworld Truce) */}
                  <div className="bg-neutral-950/80 border border-neutral-800 hover:border-cyan-700/80 rounded-lg p-2.5 space-y-2 flex flex-col justify-between transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
                        <Handshake className="w-3.5 h-3.5" />
                        <span>3. DIPLOMATIC TRUCE</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-tight">
                        Deploy clandestine leverage &amp; underworld mediation with {myVendetta.issuer_npc_name}.
                      </p>
                    </div>
                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] font-mono text-neutral-400 flex justify-between">
                        <span>AP COST:</span>
                        <strong className="text-cyan-300">{myVendetta.negotiation_ap_cost || 20} AP</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNegotiate(myVendetta.id)}
                        disabled={actionLoading !== null || (character?.action_points?.current_ap ?? 0) < (myVendetta.negotiation_ap_cost || 20)}
                        className="w-full py-1 bg-cyan-950/90 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/80 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Handshake className="w-3 h-3 text-cyan-400" />
                        <span>
                          {actionLoading === 'negotiate' && actionVendettaId === myVendetta.id
                            ? 'MEDIATING TRUCE...'
                            : (character?.action_points?.current_ap ?? 0) < (myVendetta.negotiation_ap_cost || 20)
                            ? 'INSUFFICIENT AP'
                            : 'BROKER CEASEFIRE'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Contracts & Bulletins Column (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className={`bg-black/90 border ${colorTheme.border} rounded-lg p-3.5 shadow-md space-y-3`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span className="font-bold text-xs tracking-wider text-rose-400">
                      CONTRACT REGISTRY // SANCTIONS &amp; VENDETTAS
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-900 border border-neutral-700 text-amber-400">
                      {bulletins.filter(b => b.target_name && b.target_status === 'ACTIVE').length}/5 OFFICIAL LIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSimulateVendetta}
                      disabled={isSimulatingVendetta}
                      className="px-2 py-0.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Simulate reckless attack retribution against your character (Testing)"
                    >
                      <Skull className="w-3 h-3 text-rose-400" />
                      <span>{isSimulatingVendetta ? 'SIMULATING...' : 'TEST RETALIATION'}</span>
                    </button>

                    <button
                      onClick={handleSyncTargets}
                      disabled={isSyncingTargets}
                      className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Verify and synchronize active contracts (capped at 5 live)"
                    >
                      <RefreshCw className={`w-3 h-3 text-amber-400 ${isSyncingTargets ? 'animate-spin' : ''}`} />
                      <span>{isSyncingTargets ? 'SYNCING...' : 'SYNC'}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Filter Tabs: All Intel, Official Sanctions, Underworld Vendettas */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs border-b border-neutral-800/80 pb-2">
                  <button
                    type="button"
                    onClick={() => setBulletinFilter('all')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      bulletinFilter === 'all'
                        ? 'bg-neutral-800 text-white font-bold border border-neutral-600'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    ALL INTEL ({bulletins.length + vendettas.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulletinFilter('official')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      bulletinFilter === 'official'
                        ? 'bg-rose-950/80 text-rose-200 font-bold border border-rose-700'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    OFFICIAL SANCTIONS ({bulletins.filter(b => b.target_name && b.target_status === 'ACTIVE').length}/5 LIVE)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulletinFilter('vendetta')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      bulletinFilter === 'vendetta'
                        ? 'bg-purple-950/80 text-purple-200 font-bold border border-purple-700'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    UNDERWORLD VENDETTAS ({vendettas.length})
                  </button>
                </div>

                {isLoadingBulletins ? (
                  <div className="py-8 text-center text-xs opacity-60">DECRYPTING CARRIER TRANSMISSION...</div>
                ) : (
                  <div className="space-y-3">
                    {/* 1. Underworld Vendetta Contracts (Shown if 'all' or 'vendetta') */}
                    {(bulletinFilter === 'all' || bulletinFilter === 'vendetta') && vendettas.length > 0 && (
                      <div className="space-y-2.5">
                        {bulletinFilter === 'all' && (
                          <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-purple-400 flex items-center gap-1 pt-1">
                            <span>// PRIVATE UNDERWORLD VENDETTAS ({vendettas.length})</span>
                          </div>
                        )}
                        {vendettas.map((v) => {
                          const isMarkOnPlayer = v.target_name === character?.name;
                          const isCeased = v.is_active === false || v.target_status === 'LIQUIDATED' || !!v.cease_reason;

                          return (
                            <div
                              key={v.id}
                              className={`bg-neutral-950/90 border ${
                                isMarkOnPlayer ? 'border-rose-800/80' : 'border-purple-900/60'
                              } rounded-lg p-3 text-xs space-y-2.5 relative overflow-hidden shadow-sm`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-purple-950 text-purple-300 border border-purple-700">
                                    &lt;PRIVATE VENDETTA&gt;
                                  </span>
                                  {isMarkOnPlayer && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-rose-950 text-rose-300 border border-rose-700 animate-pulse">
                                      ⚠️ TARGET: YOU
                                    </span>
                                  )}
                                  {v.escalation_count && v.escalation_count > 1 && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                      ESCALATION #{v.escalation_count}
                                    </span>
                                  )}
                                  {isCeased && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-900 text-neutral-400 border border-neutral-700">
                                      STATUS: CEASED
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-neutral-500 font-mono">
                                  ESCROW VERIFIED &bull; {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <h4 className="font-bold text-sm text-purple-200 flex items-center gap-1.5">
                                {v.title}
                              </h4>

                              <p className="text-neutral-300 text-xs leading-relaxed opacity-90 border-l-2 border-purple-700/60 pl-2">
                                {v.body}
                              </p>

                              {/* NPC Patron Dossier Banner */}
                              <div className="bg-neutral-900/70 border border-neutral-800 rounded p-2 text-[11px] space-y-1.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <div>
                                    <span className="text-neutral-500 font-mono text-[10px]">PATRON: </span>
                                    <strong className="text-purple-300">{v.issuer_npc_name || v.issued_by}</strong>
                                    {v.issuer_faction && (
                                      <span className="text-neutral-400 font-normal"> &bull; {v.issuer_faction}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 font-mono text-[10px]">
                                    <span className="text-neutral-500">SECTOR:</span>
                                    <span className="text-cyan-300 font-bold">{v.issuer_npc_city_name || v.target_city}</span>
                                    <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${v.issuer_npc_is_alive !== false ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                                      {v.issuer_npc_is_alive !== false ? 'PATRON ALIVE' : 'PATRON DEAD'}
                                    </span>
                                  </div>
                                </div>

                                {v.issuer_dialogue && (
                                  <div className="text-[10px] italic text-neutral-400 border-l border-neutral-700 pl-2">
                                    &ldquo;{v.issuer_dialogue}&rdquo;
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-900 text-[11px]">
                                <div className="text-neutral-400">
                                  <span>MARK: <strong className={isMarkOnPlayer ? "text-rose-400 underline" : "text-rose-400"}>{v.target_name}</strong></span>
                                  <span className="ml-3">SECTOR: <strong className="text-cyan-300">{v.target_city}</strong></span>
                                </div>

                                <div className="bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded text-amber-300 font-bold flex items-center gap-1">
                                  <Crosshair className="w-3 h-3 text-amber-400" />
                                  <span>ESCROW: ${v.bounty_credits.toLocaleString()} CHF</span>
                                </div>
                              </div>

                              {/* Action Bar & Resolution Outcomes */}
                              <div className="mt-2 pt-2 border-t border-neutral-900/80">
                                {isCeased ? (
                                  /* Cessation Outcomes */
                                  <div className="space-y-1.5">
                                    {v.cease_reason === 'ISSUER_ELIMINATED' ? (
                                      <div className="bg-emerald-950/40 border border-emerald-800/80 p-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                        <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                          <UserX className="w-3.5 h-3.5 text-emerald-400" />
                                          <span>CONTRACT CEASED // PATRON ELIMINATED</span>
                                          <span className="text-neutral-400 font-normal">
                                            &bull; {v.issuer_npc_name || v.issued_by} was liquidated; escrow voided.
                                          </span>
                                        </div>
                                        <span className="text-emerald-400 font-mono text-[10px] tracking-widest uppercase font-bold">
                                          [VOIDED BY DEATH]
                                        </span>
                                      </div>
                                    ) : v.cease_reason === 'RESTITUTION_PAID' ? (
                                      <div className="bg-amber-950/40 border border-amber-800/80 p-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                                          <span>CONTRACT CEASED // RESTITUTION PAID</span>
                                          <span className="text-neutral-400 font-normal">
                                            &bull; Settlement paid to {v.issuer_npc_name || v.issued_by}.
                                          </span>
                                        </div>
                                        <span className="text-amber-400 font-mono text-[10px] tracking-widest uppercase font-bold">
                                          [BLOOD DEBT PAID]
                                        </span>
                                      </div>
                                    ) : v.cease_reason === 'DIPLOMATIC_TRUCE' ? (
                                      <div className="bg-cyan-950/40 border border-cyan-800/80 p-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                                          <Handshake className="w-3.5 h-3.5 text-cyan-400" />
                                          <span>CONTRACT CEASED // DIPLOMATIC TRUCE</span>
                                          <span className="text-neutral-400 font-normal">
                                            &bull; Ceasefire accord brokered with {v.issuer_npc_name || v.issued_by}.
                                          </span>
                                        </div>
                                        <span className="text-cyan-400 font-mono text-[10px] tracking-widest uppercase font-bold">
                                          [TRUCE ACTIVE]
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="bg-neutral-900/90 border border-rose-900/60 p-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                        <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                                          <Skull className="w-3.5 h-3.5" />
                                          <span>VENDETTA SETTLED // MARK LIQUIDATED</span>
                                          {v.killer_name && (
                                            <span className="text-neutral-400 font-normal">
                                              &bull; Claimed by <strong className="text-neutral-200">{v.killer_name}</strong>
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-rose-500 font-mono text-[10px] tracking-widest uppercase font-bold">
                                          [MARK ELIMINATED]
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : isMarkOnPlayer ? (
                                  /* Active Vendetta on Player: Show 3 Cessation Pathways directly */
                                  <div className="bg-rose-950/30 border border-rose-900/60 p-2.5 rounded space-y-2">
                                    <div className="text-[10px] font-mono text-rose-300 uppercase tracking-wider font-bold flex items-center justify-between">
                                      <span>RESOLVE BOUNTY ON YOUR HEAD:</span>
                                      <span className="text-amber-300 font-normal">CREDITS: {character?.credits.toLocaleString()} CHF | AP: {character?.action_points?.current_ap ?? 0}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      {/* Path 1: Eliminate Issuer */}
                                      <div className="flex flex-col gap-1">
                                        {onHuntTarget && (
                                          <button
                                            type="button"
                                            onClick={() => onHuntTarget(v.issuer_npc_name || v.issued_by, v.issuer_npc_city_name)}
                                            className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                            title={`Track patron ${v.issuer_npc_name} in ${v.issuer_npc_city_name}`}
                                          >
                                            <Radar className="w-3 h-3 text-rose-400" />
                                            <span>HUNT PATRON</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleEliminateIssuer(v.id)}
                                          disabled={actionLoading !== null}
                                          className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded text-[9px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                          <Skull className="w-2.5 h-2.5 text-neutral-400" />
                                          <span>{actionLoading === 'eliminate' && actionVendettaId === v.id ? 'EXECUTING...' : 'DIRECT HIT (TEST)'}</span>
                                        </button>
                                      </div>

                                      {/* Path 2: Pacify (Restitution) */}
                                      <button
                                        type="button"
                                        onClick={() => handlePacify(v.id)}
                                        disabled={actionLoading !== null || (character?.credits ?? 0) < (v.settlement_cost || Math.round(v.bounty_credits * 0.65))}
                                        className="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/80 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={`Pay ${(v.settlement_cost || Math.round(v.bounty_credits * 0.65)).toLocaleString()} CHF restitution`}
                                      >
                                        <Coins className="w-3 h-3 text-amber-400" />
                                        <span>
                                          {actionLoading === 'pacify' && actionVendettaId === v.id
                                            ? 'PAYING...'
                                            : `PAY RESTITUTION (${(v.settlement_cost || Math.round(v.bounty_credits * 0.65)).toLocaleString()} CHF)`}
                                        </span>
                                      </button>

                                      {/* Path 3: Negotiate Truce */}
                                      <button
                                        type="button"
                                        onClick={() => handleNegotiate(v.id)}
                                        disabled={actionLoading !== null || (character?.action_points?.current_ap ?? 0) < (v.negotiation_ap_cost || 20)}
                                        className="px-2 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/80 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={`Negotiate ceasefire with ${v.issuer_npc_name} (20 AP)`}
                                      >
                                        <Handshake className="w-3 h-3 text-cyan-400" />
                                        <span>
                                          {actionLoading === 'negotiate' && actionVendettaId === v.id
                                            ? 'NEGOTIATING...'
                                            : `BROKER TRUCE (${v.negotiation_ap_cost || 20} AP)`}
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Active Vendetta on another character: Player can hunt mark or patron */
                                  <div className="bg-neutral-900/80 border border-purple-900/50 p-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                                        <span>
                                          ESCROW ACTIVE &bull; MARK IN {v.target_city}
                                        </span>
                                      </div>
                                      <div className="text-neutral-500 text-[10px] font-mono">
                                        PATRON: {v.issuer_npc_name || v.issued_by} ({v.issuer_npc_city_name || v.target_city}) &bull; VICTIM: {v.victim_name}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {onHuntTarget && (
                                        <button
                                          type="button"
                                          onClick={() => onHuntTarget(v.target_name, v.target_city)}
                                          className="px-2 py-1 bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-700/80 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                          title={`Open Intel Terminal to track ${v.target_name}`}
                                        >
                                          <Radar className="w-3 h-3 text-purple-400" />
                                          <span>TRACK MARK</span>
                                        </button>
                                      )}

                                      {onHuntTarget && v.issuer_npc_name && (
                                        <button
                                          type="button"
                                          onClick={() => onHuntTarget(v.issuer_npc_name!, v.issuer_npc_city_name)}
                                          className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                          title={`Track patron ${v.issuer_npc_name} in ${v.issuer_npc_city_name}`}
                                        >
                                          <UserX className="w-3 h-3 text-rose-400" />
                                          <span>TRACK PATRON</span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleEliminateIssuer(v.id)}
                                        disabled={actionLoading !== null}
                                        className="px-1.5 py-1 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-rose-300 border border-neutral-800 rounded text-[9px] font-mono transition-colors cursor-pointer disabled:opacity-40"
                                        title="Simulate patron assassination to verify contract revocation"
                                      >
                                        [KILL PATRON TEST]
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 2. Official Sedes Obscura Sanctions (Shown if 'all' or 'official') */}
                    {(bulletinFilter === 'all' || bulletinFilter === 'official') && (
                      <div className="space-y-2.5">
                        {bulletinFilter === 'all' && (
                          <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-rose-400 flex items-center gap-1 pt-1">
                            <span>// SEDES OBSCURA OFFICIAL SANCTIONS (MAX 5 LIVE)</span>
                          </div>
                        )}
                        {bulletins.map((b) => (
                          <div
                            key={b.id}
                            className={`bg-neutral-950/80 border ${
                              b.priority === 'CRITICAL' ? 'border-rose-900/70' : colorTheme.borderLight
                            } rounded p-3 text-xs space-y-2 relative overflow-hidden`}
                          >
                            {/* Priority tag */}
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${
                                  b.category === 'EXCOMMUNICADO'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : b.category === 'CEASEFIRE'
                                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}
                              >
                                &lt;{b.category}&gt;
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                ISSUED: {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <h4 className="font-bold text-sm text-neutral-100 flex items-center gap-1.5">
                              {b.title}
                            </h4>

                            <p className="text-neutral-300 text-xs leading-relaxed opacity-90 border-l-2 border-neutral-700 pl-2">
                              {b.body}
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-900 text-[11px]">
                              <div className="text-neutral-400">
                                {b.target_city && <span>SECTOR: <strong className="text-neutral-200">{b.target_city}</strong></span>}
                                {b.target_name && <span className="ml-3">MARK: <strong className="text-rose-400">{b.target_name}</strong></span>}
                              </div>

                              {b.bounty_credits > 0 && (
                                <div className="bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded text-amber-300 font-bold flex items-center gap-1">
                                  <Crosshair className="w-3 h-3 text-amber-400" />
                                  <span>ESCROW: ${b.bounty_credits.toLocaleString()} CHF</span>
                                </div>
                              )}
                            </div>

                            {/* Live Autonomous NPC Target Telemetry & Action Bar */}
                            {b.target_name && (
                              <div className="mt-2 pt-2 border-t border-neutral-900/80">
                                {b.target_status === 'LIQUIDATED' ? (
                                  <div className="bg-neutral-900/90 border border-rose-900/60 p-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                    <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                                      <Skull className="w-3.5 h-3.5" />
                                      <span>SANCTION EXECUTED: TARGET LIQUIDATED</span>
                                      {b.killer_name && (
                                        <span className="text-neutral-400 font-normal">
                                          • Bounty claimed by <strong className="text-neutral-200">{b.killer_name}</strong>
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-rose-500 font-mono text-[10px] tracking-widest uppercase font-bold">
                                      [CONTRACT CLOSED]
                                    </span>
                                  </div>
                                ) : (
                                  <div className="bg-neutral-900/80 border border-emerald-900/50 p-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>
                                          SYN-DB RECORD: ACTIVE IN {b.current_city_name || b.target_city}
                                        </span>
                                      </div>
                                      <div className="text-neutral-500 text-[10px] font-mono">
                                        REGISTRY ID: {b.target_character_id ? b.target_character_id.substring(0, 8) + '...' : 'SPAWNED NPC'} • STATUS: CONFIRMED LIVE
                                      </div>
                                    </div>

                                    {onHuntTarget && (
                                      <button
                                        onClick={() => onHuntTarget(b.target_name!, b.current_city_name || b.target_city || undefined)}
                                        className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-700/80 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer shadow-sm"
                                        title={`Open Intel Terminal to track ${b.target_name}`}
                                      >
                                        <Radar className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                                        <span>TRACK IN INTEL TERMINAL</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          {/* Live Assassination Kill Wire (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className={`bg-black/90 border ${colorTheme.border} rounded-lg p-3.5 shadow-md`}>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs tracking-wider">
                    LIVE FIELD FEED // ELIMINATION WIRE
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500">REAL-TIME</span>
              </div>

              {killFeed.length === 0 ? (
                <div className="py-8 text-center text-xs opacity-60">NO VERIFIED LIQUIDATIONS DETECTED.</div>
              ) : (
                <div className="space-y-2">
                  {killFeed.map((k) => (
                    <div
                      key={k.id}
                      className="bg-neutral-950 border border-neutral-800/80 p-2.5 rounded text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-neutral-500">
                          {new Date(k.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                        </span>
                        <span className={`font-bold ${k.victim_survived ? 'text-amber-400' : 'text-rose-400'}`}>
                          {k.victim_survived ? '[STRIKE PARRIED]' : '[TARGET ELIMINATED]'}
                        </span>
                      </div>

                      <div className="text-xs text-neutral-200">
                        {k.victim_survived ? (
                          <p>
                            Surveillance alert in <span className="text-white font-bold">{k.city_name}</span>: Strike attempt against mark <span className="text-amber-300 font-bold">{k.target_name}</span> was neutralized by active countermeasures.
                          </p>
                        ) : (
                          <p>
                            Mark <span className="text-rose-300 font-bold">{k.target_name}</span> liquidated in <span className="text-white font-bold">{k.city_name}</span> via <span className="text-neutral-400">{k.skill_name}</span>.
                            {k.credits_awarded > 0 && (
                              <span className="block text-emerald-400 text-[10px] font-bold mt-0.5">
                                +${k.credits_awarded.toLocaleString()} Swiss Credits claimed.
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Warning Footer */}
            <div className="bg-neutral-950/90 border border-neutral-800/80 p-3 rounded text-[11px] text-neutral-400 space-y-1">
              <span className="text-white font-bold block flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                SEDES OBSCURA DIRECTIVE 01
              </span>
              <p className="leading-relaxed">
                Liquidating an operative marked with an active <strong className="text-rose-400">Writ of Excommunicado</strong> yields full escrow liquidation without retaliatory blood debt.
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── SUB-BOARD 2: UNDERGROUND FORUM ──────────────────────────────────────── */}
      {activeBoard === 'forum' && (
        <div className="space-y-3">
          {/* Forum Channel Filter Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-black/90 border border-neutral-800 p-2.5 rounded-lg text-xs">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] opacity-50 mr-1">CHANNEL:</span>
              {(['all', 'general', 'trade', 'intel', 'bounties', 'ops'] as ForumChannel[]).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    setActiveChannel(ch);
                    setSelectedThread(null);
                    fetchThreads(ch);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] uppercase transition-all ${
                    activeChannel === ch
                      ? `bg-white/10 ${colorTheme.border} font-bold text-white`
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  #{ch}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsPostingThread(!isPostingThread)}
              className={`px-3 py-1 rounded border ${colorTheme.border} bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isPostingThread ? 'CANCEL PACKET' : 'START NEW THREAD'}</span>
            </button>
          </div>

          {/* New Thread Composer Modal/Dropdown */}
          {isPostingThread && (
            <form onSubmit={handleCreateThread} className={`bg-neutral-950 border-2 ${colorTheme.border} rounded-lg p-4 space-y-3 shadow-2xl`}>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs font-bold tracking-wider">DISPATCH NEW FORUM THREAD</span>
                <span className="text-[10px] text-neutral-500">ENCRYPTED BROKER</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">DESTINATION CHANNEL</label>
                  <select
                    value={newThreadChannel}
                    onChange={(e) => setNewThreadChannel(e.target.value as any)}
                    className="w-full bg-black border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="general">#general — War Stories &amp; Syndicate Politics</option>
                    <option value="trade">#trade — Sell 48hr Tags &amp; Intelligence</option>
                    <option value="intel">#intel — Reconnaissance &amp; City Sightings</option>
                    <option value="bounties">#bounties — Open Escrow Marks</option>
                    <option value="ops">#ops — Loadout &amp; Skill Discussion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">TRANSMISSION IDENTITY</label>
                  <button
                    type="button"
                    onClick={() => setNewThreadAnon(!newThreadAnon)}
                    className={`w-full text-left border px-2.5 py-1.5 rounded flex items-center justify-between ${
                      newThreadAnon ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-black border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span>{newThreadAnon ? 'IDENTITY: BURNER ANONYMOUS' : `IDENTITY: ${account?.dark_web_handle || 'OPERATIVE'}`}</span>
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 mb-1">THREAD TITLE</label>
                <input
                  type="text"
                  placeholder="e.g. Sighting of high-level operative in Sector Tokyo..."
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-400 mb-1">MESSAGE BODY</label>
                <textarea
                  placeholder="Type dispatch content..."
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  rows={4}
                  className="w-full bg-black border border-neutral-800 rounded p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setIsPostingThread(false)}
                  className="px-3 py-1 rounded text-xs text-neutral-400 hover:text-white"
                >
                  DISCARD
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded text-xs font-bold bg-white/10 hover:bg-white/20 border ${colorTheme.border} text-white flex items-center gap-1.5`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>TRANSMIT PACKET</span>
                </button>
              </div>
            </form>
          )}

          {/* Thread Detail View OR Thread List */}
          {selectedThread ? (
            <div className={`bg-black/90 border ${colorTheme.border} rounded-lg p-4 space-y-4 shadow-xl`}>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedThread(null)}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <span>&larr; BACK TO THREAD LIST</span>
                </button>

                <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                  <span>CHANNEL: #{selectedThread.channel}</span>
                  <span>&bull;</span>
                  <span>POSTED: {new Date(selectedThread.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  {selectedThread.is_pinned && (
                    <span className="px-1.5 py-0.5 bg-amber-950 border border-amber-800 text-amber-300 text-[9px] rounded font-bold">
                      [PINNED]
                    </span>
                  )}
                  <h3 className="font-bold text-sm text-neutral-100">{selectedThread.title}</h3>
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">
                  FROM: <strong className="text-neutral-200">{selectedThread.author_handle}</strong>
                </div>
              </div>

              {/* Thread Posts Stream */}
              <div className="space-y-2.5 border-t border-b border-neutral-900 py-3">
                {threadPosts.length === 0 ? (
                  <div className="py-4 text-center text-xs opacity-50">FETCHING ENCRYPTED DISPATCHES...</div>
                ) : (
                  threadPosts.map((p, idx) => (
                    <div
                      key={p.id}
                      className="bg-neutral-950 border border-neutral-800/80 p-3 rounded text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] text-neutral-500">
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-300 font-bold">
                            {p.author_handle === 'ANONYMOUS' ? (
                              <span className="text-amber-400/80">[BURNER IDENTITY]</span>
                            ) : (
                              p.author_handle
                            )}
                          </span>
                          {idx === 0 && (
                            <span className="text-[9px] bg-neutral-900 border border-neutral-800 px-1 rounded text-neutral-400">
                              ORIGIN
                            </span>
                          )}
                        </div>
                        <span>{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <p className="text-neutral-200 leading-relaxed whitespace-pre-wrap">{p.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleReply} className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">COMPOSE REPLY DISPATCH:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-400 hover:text-white">
                    <input
                      type="checkbox"
                      checked={replyAnon}
                      onChange={(e) => setReplyAnon(e.target.checked)}
                      className="rounded border-neutral-700 bg-black"
                    />
                    <span>Post via Burner Proxy</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type encoded reply..."
                    className="flex-1 bg-black border border-neutral-800 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="submit"
                    className={`px-4 rounded text-xs font-bold bg-white/10 hover:bg-white/20 border ${colorTheme.border} text-white flex items-center justify-center`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className={`bg-black/90 border ${colorTheme.border} rounded-lg overflow-hidden shadow-md`}>
              <div className="bg-neutral-950 px-4 py-2 border-b border-neutral-800 text-[10px] text-neutral-400 flex items-center justify-between">
                <span>THREAD SUBJECT</span>
                <div className="flex items-center gap-6">
                  <span>DISPATCHER</span>
                  <span>REPLIES</span>
                  <span>ACTIVITY</span>
                </div>
              </div>

              {isLoadingThreads ? (
                <div className="py-12 text-center text-xs opacity-60">SCANNING BBS SECTOR THREADS...</div>
              ) : threads.length === 0 ? (
                <div className="py-12 text-center text-xs opacity-60">NO FORUM DISPATCHES IN THIS CHANNEL.</div>
              ) : (
                <div className="divide-y divide-neutral-900">
                  {threads.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => openThread(t)}
                      className="px-4 py-3 text-xs hover:bg-white/5 cursor-pointer transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {t.is_pinned && (
                            <span className="px-1 py-0.2 bg-amber-950 border border-amber-800 text-amber-300 text-[9px] rounded font-bold">
                              PIN
                            </span>
                          )}
                          <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">
                            #{t.channel}
                          </span>
                          <span className="font-bold text-neutral-100 truncate hover:underline">
                            {t.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-[11px] text-neutral-400 shrink-0">
                        <span className="text-neutral-300 w-24 truncate text-right">
                          {t.author_handle}
                        </span>
                        <span className="w-8 text-center bg-neutral-900 border border-neutral-800 rounded px-1 text-[10px]">
                          {t.reply_count}
                        </span>
                        <span className="text-[10px] text-neutral-500 w-16 text-right">
                          {new Date(t.last_post_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SUB-BOARD 3: ENCRYPTED DEAD-DROP (DIRECT EMAIL) ──────────────────────── */}
      {activeBoard === 'deaddrop' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Mailbox List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className={`bg-black/90 border ${colorTheme.border} rounded-lg p-3 shadow-md space-y-3`}>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs tracking-wider">DEAD-DROP INBOX</span>
                </div>

                <button
                  type="button"
                  onClick={() => { setIsComposingMail(true); setSelectedMessage(null); }}
                  className={`px-2.5 py-1 rounded border ${colorTheme.border} text-xs font-bold bg-white/5 hover:bg-white/10`}
                >
                  + COMPOSE
                </button>
              </div>

              {isLoadingMessages ? (
                <div className="py-8 text-center text-xs opacity-60">DECRYPTING PACKET QUEUE...</div>
              ) : messages.length === 0 ? (
                <div className="py-8 text-center text-xs opacity-60">DEAD-DROP QUEUE EMPTY.</div>
              ) : (
                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => { handleOpenMessage(m); setIsComposingMail(false); }}
                      className={`p-2.5 rounded border text-xs cursor-pointer transition-colors space-y-1 ${
                        selectedMessage?.id === m.id
                          ? `bg-white/10 ${colorTheme.border}`
                          : m.is_read
                          ? 'bg-neutral-950/70 border-neutral-800/80 hover:bg-white/5'
                          : 'bg-neutral-900 border-amber-500/50 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-neutral-300 flex items-center gap-1">
                          {!m.is_read && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                          FROM: {m.sender_handle}
                        </span>
                        <span className="text-neutral-500">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="font-bold text-neutral-100 truncate text-[11px] flex items-center gap-1">
                        {m.burn_on_read && <Flame className="w-3 h-3 text-rose-400 shrink-0" />}
                        <span>{m.subject}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mail Reader or Composer (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {isComposingMail ? (
              <form onSubmit={handleSendMail} className={`bg-black/90 border ${colorTheme.border} rounded-lg p-4 space-y-3 shadow-xl`}>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-xs font-bold tracking-wider">NEW ENCRYPTED DEAD-DROP PACKET</span>
                  <span className="text-[10px] text-neutral-500">1024-BIT ASYMMETRIC</span>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">RECIPIENT CODENAME / HANDLE</label>
                  <input
                    type="text"
                    placeholder="e.g. GhostProtocol or ALL"
                    value={mailRecipient}
                    onChange={(e) => setMailRecipient(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">SUBJECT</label>
                  <input
                    type="text"
                    placeholder="Subject line..."
                    value={mailSubject}
                    onChange={(e) => setMailSubject(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">ENCRYPTED BODY</label>
                  <textarea
                    rows={6}
                    placeholder="Enter clandestine dispatch..."
                    value={mailBody}
                    onChange={(e) => setMailBody(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
                  <label className="flex items-center gap-1.5 text-xs text-rose-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mailBurnOnRead}
                      onChange={(e) => setMailBurnOnRead(e.target.checked)}
                      className="rounded border-neutral-800 bg-black"
                    />
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-500" />
                      Self-Destruct on Read (Burn after opening)
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsComposingMail(false)}
                      className="px-3 py-1 text-xs text-neutral-400 hover:text-white"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-1.5 rounded text-xs font-bold bg-white/10 hover:bg-white/20 border ${colorTheme.border} text-white flex items-center gap-1.5`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>DISPATCH</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : selectedMessage ? (
              <div className={`bg-black/90 border ${colorTheme.border} rounded-lg p-4 space-y-4 shadow-xl`}>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-neutral-400">
                      ORIGIN: <strong className="text-white">{selectedMessage.sender_handle}</strong> &rarr; RECIPIENT: <strong className="text-neutral-200">{selectedMessage.recipient_handle}</strong>
                    </div>
                    <h3 className="font-bold text-sm text-neutral-100 flex items-center gap-2">
                      {selectedMessage.burn_on_read && <Flame className="w-4 h-4 text-rose-500" />}
                      <span>{selectedMessage.subject}</span>
                    </h3>
                  </div>

                  <div className="text-right text-[10px] text-neutral-500">
                    <div>{new Date(selectedMessage.created_at).toLocaleDateString()}</div>
                    <div>{new Date(selectedMessage.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>

                <div className="bg-neutral-950 p-4 rounded border border-neutral-800/80 text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed min-h-[140px]">
                  {selectedMessage.body}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-900 text-xs">
                  <span className="text-[10px] text-neutral-500">PGP VERIFIED PACKET</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposingMail(true);
                      setMailRecipient(selectedMessage.sender_handle);
                      setMailSubject(`RE: ${selectedMessage.subject}`);
                    }}
                    className={`px-3 py-1 rounded border ${colorTheme.border} bg-white/5 hover:bg-white/10 text-xs font-bold`}
                  >
                    REPLY TO SENDER
                  </button>
                </div>
              </div>
            ) : (
              <div className={`bg-black/90 border ${colorTheme.border} rounded-lg p-12 text-center text-xs opacity-60`}>
                SELECT A DEAD-DROP PACKET FROM THE INBOX TO DECRYPT
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-BOARD 4: CIPHER ROOMS (PRIVATE CHATS) ────────────────────────────── */}
      {activeBoard === 'cipher' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Active Rooms / Join Channel (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className={`bg-black/90 border ${colorTheme.border} rounded-lg p-3.5 shadow-md space-y-3`}>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs tracking-wider">CIPHER CHANNELS</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingRoom(!isCreatingRoom)}
                  className={`px-2 py-1 rounded border ${colorTheme.border} text-xs font-bold bg-white/5 hover:bg-white/10`}
                >
                  {isCreatingRoom ? 'JOIN EXISTING' : '+ INITIALIZE ROOM'}
                </button>
              </div>

              {cipherError && (
                <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-2 rounded text-[11px]">
                  &gt; {cipherError}
                </div>
              )}

              {isCreatingRoom ? (
                <form onSubmit={handleCreateRoom} className="space-y-2 text-xs">
                  <p className="text-[10px] text-neutral-400">
                    Create an encrypted tactical channel for your hit syndicate or cell.
                  </p>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">ROOM CODE</label>
                    <input
                      type="text"
                      placeholder="e.g. OMEGA-7"
                      value={createRoomCode}
                      onChange={(e) => setCreateRoomCode(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-neutral-800 rounded px-2.5 py-1 text-xs text-white"
                      maxLength={12}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">ROOM NAME</label>
                    <input
                      type="text"
                      placeholder="e.g. Black Watch Tactical"
                      value={createRoomName}
                      onChange={(e) => setCreateRoomName(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded px-2.5 py-1 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">PASSCODE CIPHER</label>
                    <input
                      type="password"
                      placeholder="6-digit PIN or passphrase"
                      value={createRoomPasscode}
                      onChange={(e) => setCreateRoomPasscode(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded px-2.5 py-1 text-xs text-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-1.5 rounded text-xs font-bold bg-white/10 hover:bg-white/20 border ${colorTheme.border} text-white mt-1`}
                  >
                    ESTABLISH SECURE NODE
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoinRoom} className="space-y-2.5 text-xs">
                  <p className="text-[10px] text-neutral-400">
                    Enter the access credentials of an active syndicate room:
                  </p>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">ROOM CODE</label>
                    <input
                      type="text"
                      placeholder="e.g. OMEGA-7"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-neutral-800 rounded px-2.5 py-1 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">PASSCODE</label>
                    <input
                      type="password"
                      placeholder="Enter passphrase..."
                      value={joinPasscode}
                      onChange={(e) => setJoinPasscode(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded px-2.5 py-1 text-xs text-white"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-1.5 rounded text-xs font-bold bg-white/10 hover:bg-white/20 border ${colorTheme.border} text-white`}
                  >
                    AUTHENTICATE HANDSHAKE
                  </button>
                </form>
              )}

              {/* Active Broadcast Channels list */}
              <div className="pt-2 border-t border-neutral-900 space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase block">ACTIVE CIPHER CHANNELS ON NODE:</span>
                {cipherRooms.length === 0 ? (
                  <span className="text-[10px] text-neutral-600 block">No public beacons broadcasting.</span>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {cipherRooms.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => { setJoinCode(r.room_code); }}
                        className="bg-neutral-950 border border-neutral-800/80 px-2 py-1 rounded text-[11px] flex items-center justify-between cursor-pointer hover:border-neutral-700"
                      >
                        <span className="font-bold text-white">[{r.room_code}] {r.name}</span>
                        <span className="text-[9px] text-neutral-500">HOST: {r.creator_handle}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Active Encrypted Room Session (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {activeRoom ? (
              <div className={`bg-black/90 border ${colorTheme.border} rounded-lg p-4 space-y-3 shadow-xl`}>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-xs">
                  <div>
                    <span className="font-bold text-white text-sm">[{activeRoom.room_code}] {activeRoom.name}</span>
                    <span className="text-[10px] text-neutral-400 block">SESSION ENCRYPTED &bull; ZERO PERMANENT DISK WRITES</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setActiveRoom(null); setRoomMessages([]); }}
                    className="text-neutral-400 hover:text-white text-xs"
                  >
                    DISCONNECT
                  </button>
                </div>

                {/* Message Log */}
                <div className="bg-neutral-950 p-3 rounded border border-neutral-800/80 h-[280px] overflow-y-auto space-y-2 text-xs">
                  {roomMessages.length === 0 ? (
                    <div className="py-20 text-center text-neutral-600">CIPHER SESSION INITIALIZED. NO PACKETS TRANSMITTED.</div>
                  ) : (
                    roomMessages.map((m) => (
                      <div key={m.id} className="space-y-0.5">
                        <div className="flex items-center gap-2 text-[10px]">
                          <strong className="text-emerald-400">&lt;{m.sender_handle}&gt;</strong>
                          <span className="text-neutral-600">{new Date(m.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-neutral-200 text-xs pl-2 border-l border-neutral-800">{m.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Packet Input */}
                <form onSubmit={handleSendCipherMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Broadcast to cipher room..."
                    value={cipherMsgInput}
                    onChange={(e) => setCipherMsgInput(e.target.value)}
                    className="flex-1 bg-black border border-neutral-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="submit"
                    className={`px-4 rounded text-xs font-bold bg-white/10 hover:bg-white/20 border ${colorTheme.border} text-white`}
                  >
                    SEND
                  </button>
                </form>
              </div>
            ) : (
              <div className={`bg-black/90 border ${colorTheme.border} rounded-lg p-16 text-center text-xs opacity-60`}>
                ENTER A ROOM CODE AND PASSCODE TO ACCESS AN ENCRYPTED CIPHER CHANNEL
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-BOARD 5: COVENANT LAW OF SEDES OBSCURA ──────────────────────────── */}
      {activeBoard === 'covenant' && (
        <div className={`bg-black/90 border ${colorTheme.border} rounded-lg p-6 space-y-6 shadow-2xl`}>
          <div className="border-b border-neutral-800 pb-3 text-center space-y-1">
            <h3 className="font-bold text-sm tracking-widest text-neutral-100 uppercase">
              THE SACRED COVENANT &amp; LEX OBSCURA
            </h3>
            <p className="text-xs text-neutral-500">
              CODEX OF SEDES OBSCURA &bull; BINDING ACROSS ALL CONTINENTAL SECTORS
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-neutral-950 p-4 rounded border border-neutral-800 space-y-1.5">
              <span className="text-rose-400 font-bold block text-sm">
                I. SANCTUARY OF NEUTRAL CANTONS
              </span>
              <p className="text-neutral-300 leading-relaxed text-xs">
                Designated sanctuary zones (such as Continental Zurich or declared Ceasefire Sectors) are inviolable. Drawing blood or discharging ordinance on consecrated ground incurs immediate, unconditional <strong className="text-rose-400">Excommunicado</strong>.
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded border border-neutral-800 space-y-1.5">
              <span className="text-amber-400 font-bold block text-sm">
                II. THE GOLD BULLION INDEMNITY
              </span>
              <p className="text-neutral-300 leading-relaxed text-xs">
                Liquid Swiss Credits are forfeit upon operative liquidation. However, numbered accounts denominated in Swiss Gold Bullion are shielded by banking secrecy laws and persist across all successive reincarnations.
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded border border-neutral-800 space-y-1.5">
              <span className="text-cyan-400 font-bold block text-sm">
                III. DETERMINISTIC RETALIATION &amp; COUNTERS
              </span>
              <p className="text-neutral-300 leading-relaxed text-xs">
                The universe admits no luck or random chance. An operative equipped with a prepared Defensive Counterpart skill shall parry an inbound assassination strike with 100% mathematical certainty.
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded border border-neutral-800 space-y-1.5">
              <span className="text-emerald-400 font-bold block text-sm">
                IV. IN-TRANSIT DISCOVERY LAW
              </span>
              <p className="text-neutral-300 leading-relaxed text-xs">
                An operative embarking across international borders remains vulnerable at their departure terminal until their arrival countdown reaches zero. Plan your departures with utmost discretion.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
