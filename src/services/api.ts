// TAG: The Assassination Game — API Client

import { 
  Account, 
  Character, 
  CreationData, 
  TravelMapData, 
  ActiveTag, 
  AssassinationOutcome 
} from '../types';

const API_BASE = '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('tag_jwt_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('tag_jwt_token', token);
}

export function clearStoredToken() {
  localStorage.removeItem('tag_jwt_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `HTTP ${res.status} Error`;
    const err = new Error(errorMsg) as Error & { status?: number; data?: any };
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

// ── Auth API ──────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await request<{ message: string; token: string; account: Account }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  register: async (email: string, password: string, dark_web_handle: string) => {
    const res = await request<{ message: string; token: string; account: Account }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, dark_web_handle }),
    });
    setStoredToken(res.token);
    return res;
  },

  me: async () => {
    return request<{ account: Account }>('/auth/me');
  },

  logout: () => {
    clearStoredToken();
  },
};

// ── Character API ─────────────────────────────────────────────
export const characterApi = {
  getCreationData: async () => {
    return request<CreationData>('/character/creation-data');
  },

  create: async (params: {
    name: string;
    city_id: string;
    profession_id: string;
    assassination_skills: string[];
    defensive_skills: string[];
    intel_skills: string[];
    counter_intel_skills: string[];
  }) => {
    return request<{ message: string; character: any }>('/character/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getMe: async () => {
    return request<{ character: Character }>('/character/me');
  },
};

// ── Travel API ────────────────────────────────────────────────
export const travelApi = {
  getMap: async () => {
    return request<TravelMapData>('/travel/map');
  },

  initiate: async (destination_city_id: string, transport_mode: 'air' | 'rail' | 'water' | 'road') => {
    return request<{
      message: string;
      status: 'arrived' | 'in_transit';
      transport_mode: string;
      distance_px: number;
      ap_spent: number;
      credits_spent: number;
      remaining_ap: number;
      remaining_credits: number;
      ap_deficit_hours?: number;
      arrives_at?: string;
    }>('/travel/initiate', {
      method: 'POST',
      body: JSON.stringify({ destination_city_id, transport_mode }),
    });
  },

  cancel: async () => {
    return request<{
      message: string;
      status: 'arrived';
    }>('/travel/cancel', {
      method: 'POST',
    });
  },
};

// ── Intel API ─────────────────────────────────────────────────
export const intelApi = {
  search: async (params: {
    target_city_id: string;
    skill_id: string;
    target_name?: string;
    is_sweep: boolean;
  }) => {
    return request<{
      message: string;
      status?: 'completed' | 'in_surveillance';
      skill_used: string;
      target_city: string;
      is_sweep?: boolean;
      target_name?: string | null;
      ap_spent: number;
      credits_spent: number;
      ap_deficit_hours?: number;
      remaining_ap: number;
      remaining_credits: number;
      completes_at?: string;
      tagged?: { name: string; city: string; is_in_transit: boolean }[];
      tagged_count?: number;
      result?: string;
    }>('/intel/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getActiveTags: async () => {
    return request<{ active_tags: ActiveTag[]; count: number }>('/intel/tags');
  },

  abort: async () => {
    return request<{
      message: string;
      status: 'arrived';
    }>('/intel/abort', {
      method: 'POST',
    });
  },

  getStatus: async () => {
    return request<{
      status: 'idle' | 'in_surveillance' | 'completed';
      probe?: any;
      completes_at?: string;
      started_at?: string;
      seconds_remaining?: number;
      report?: any;
      message?: string;
    }>('/intel/status');
  },
};

// ── Assassination API ─────────────────────────────────────────
export const assassinationApi = {
  execute: async (target_character_id: string, skill_id: string) => {
    return request<AssassinationOutcome>('/assassination/execute', {
      method: 'POST',
      body: JSON.stringify({ target_character_id, skill_id }),
    });
  },
};

// ── Test Dev Tools API ────────────────────────────────────────
export const testApi = {
  triggerApRegen: async () => {
    return request<{ message: string }>('/test/trigger-ap-regen', { method: 'POST' });
  },

  drainAp: async () => {
    return request<{ message: string; before: number; after: number; max: number }>('/test/drain-ap', {
      method: 'POST',
    });
  },

  topupCredits: async () => {
    return request<{ message: string; before: number; after: number }>('/test/topup-credits', {
      method: 'POST',
    });
  },

  grantSkill: async (skill_id: string, pool: string) => {
    return request<{ message: string }>('/test/grant-skill', {
      method: 'POST',
      body: JSON.stringify({ skill_id, pool }),
    });
  },

  resurrect: async () => {
    return request<{ message: string; character_id: string; ap_restored_to: number }>('/test/resurrect', {
      method: 'POST',
    });
  },
};

// ── Dark Web BBS API ──────────────────────────────────────────
export const darkwebApi = {
  getBulletins: async (characterId?: string) => {
    const query = characterId ? `?character_id=${characterId}` : '';
    return request<{
      success: boolean;
      bulletins: import('../types').DarkWebBulletin[];
      vendettas?: import('../types').VendettaBounty[];
      myVendetta?: import('../types').VendettaBounty | null;
      killFeed: import('../types').DarkWebKillFeedItem[];
    }>(`/darkweb/bulletins${query}`);
  },

  getVendettas: async () => {
    return request<{
      success: boolean;
      vendettas: import('../types').VendettaBounty[];
    }>('/darkweb/vendettas');
  },

  testTriggerVendetta: async (victimName?: string) => {
    return request<{
      success: boolean;
      message: string;
      vendetta: import('../types').VendettaBounty;
    }>('/darkweb/vendettas/test-trigger', {
      method: 'POST',
      body: JSON.stringify({ victim_name: victimName })
    });
  },

  syncBulletinTargets: async () => {
    return request<{
      success: boolean;
      message: string;
      bulletins: import('../types').DarkWebBulletin[];
      vendettas?: import('../types').VendettaBounty[];
    }>('/darkweb/bulletins/sync-targets', {
      method: 'POST',
    });
  },

  pacifyVendettaRestitution: async (vendettaId: string) => {
    return request<{
      success: boolean;
      message: string;
      remaining_credits: number;
      vendetta: import('../types').VendettaBounty;
    }>(`/darkweb/vendettas/${vendettaId}/pacify-restitution`, {
      method: 'POST'
    });
  },

  negotiateVendettaTruce: async (vendettaId: string) => {
    return request<{
      success: boolean;
      message: string;
      remaining_ap: number;
      vendetta: import('../types').VendettaBounty;
    }>(`/darkweb/vendettas/${vendettaId}/negotiate-truce`, {
      method: 'POST'
    });
  },

  eliminateVendettaIssuer: async (vendettaId: string) => {
    return request<{
      success: boolean;
      message: string;
      revoked: import('../types').VendettaBounty[];
    }>(`/darkweb/vendettas/${vendettaId}/eliminate-issuer`, {
      method: 'POST'
    });
  },

  getThreads: async (channel = 'all') => {
    return request<{
      success: boolean;
      threads: import('../types').DarkWebThread[];
    }>(`/darkweb/threads?channel=${channel}`);
  },

  getThread: async (threadId: string) => {
    return request<{
      success: boolean;
      thread: import('../types').DarkWebThread;
      posts: import('../types').DarkWebPost[];
    }>(`/darkweb/threads/${threadId}`);
  },

  createThread: async (params: { channel: string; title: string; content: string; is_anonymous?: boolean }) => {
    return request<{
      success: boolean;
      thread: import('../types').DarkWebThread;
    }>('/darkweb/threads', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  replyToThread: async (threadId: string, params: { content: string; is_anonymous?: boolean }) => {
    return request<{
      success: boolean;
      post: import('../types').DarkWebPost;
    }>(`/darkweb/threads/${threadId}/reply`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getMessages: async () => {
    return request<{
      success: boolean;
      messages: import('../types').DarkWebMessage[];
      myHandle: string;
    }>('/darkweb/messages');
  },

  sendMessage: async (params: { recipient_handle: string; subject: string; body: string; burn_on_read?: boolean }) => {
    return request<{
      success: boolean;
      message: import('../types').DarkWebMessage;
    }>('/darkweb/messages', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  readMessage: async (messageId: string) => {
    return request<{
      success: boolean;
      burned?: boolean;
    }>(`/darkweb/messages/${messageId}/read`, {
      method: 'POST',
    });
  },

  getCipherRooms: async () => {
    return request<{
      success: boolean;
      rooms: import('../types').DarkWebCipherRoom[];
    }>('/darkweb/cipher-rooms');
  },

  joinCipherRoom: async (params: { room_code: string; passcode: string }) => {
    return request<{
      success: boolean;
      room: import('../types').DarkWebCipherRoom;
      messages: import('../types').DarkWebCipherMessage[];
    }>('/darkweb/cipher-rooms/join', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  createCipherRoom: async (params: { room_code: string; name: string; passcode: string }) => {
    return request<{
      success: boolean;
      room: import('../types').DarkWebCipherRoom;
    }>('/darkweb/cipher-rooms', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  sendCipherMessage: async (roomId: string, message: string) => {
    return request<{
      success: boolean;
      message: import('../types').DarkWebCipherMessage;
    }>(`/darkweb/cipher-rooms/${roomId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
};

