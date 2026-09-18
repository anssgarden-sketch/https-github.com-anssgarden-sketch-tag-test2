// Admin API Client for TAG Game Master Operations

const ADMIN_TOKEN_KEY = 'tag_admin_session_token';
const ADMIN_USER_KEY = 'tag_admin_session_user';
const LEGACY_STORAGE_KEY = 'tag_admin_access_key';

export function getStoredAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY) || null;
}

export function getStoredAdminUser(): { username: string; role: string } | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_USER_KEY) || localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAdminSession(token: string, user: { username: string; role: string }): void {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
}

export function clearStoredAdminSession(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
  sessionStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

// Backward compatibility helper
export function getStoredAdminKey(): string {
  return getStoredAdminToken() || '';
}

export function setStoredAdminKey(key: string): void {
  setStoredAdminSession(key, { username: 'admin', role: 'admin' });
}

export function clearStoredAdminKey(): void {
  clearStoredAdminSession();
}

async function adminFetch(endpoint: string, options: RequestInit = {}) {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}`, 'x-admin-token': token } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data.error || `Admin Request Failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export interface PlayerOperative {
  id: string;
  name: string;
  player_type?: 'PC' | 'NPC';
  is_alive: boolean;
  credits: number;
  travel_status: string;
  destination_city_id?: string | null;
  transport_mode?: string | null;
  kill_count: number;
  intel_sold_count: number;
  items_sold_count: number;
  survival_days: number;
  created_at: string;
  last_active_at?: string;
  current_city_id: string;
  profession_id: string;
  killed_by_account_id?: string | null;
  killed_with_skill_id?: string | null;
  killed_in_city_id?: string | null;
  killed_at?: string | null;
  cities?: { id: string; name: string; country: string; continent: string };
  destination_city?: { id: string; name: string; country: string; continent: string } | null;
  professions?: { id: string; name: string; credits_per_week: number; ap_modifier: number; schedule_type: string; description?: string };
  action_points?: { id: string; current_ap: number; max_ap: number; last_regen_at: string; updated_at?: string };
  accounts?: { id: string; email: string; dark_web_handle: string; swiss_bank_number: string; gold_coins: number; death_count: number; created_at: string; last_login_at?: string };
  character_skills?: { id: string; pool: string; skill_id: string; skills?: { id: string; name: string; category: string; range: string; base_ap_cost?: number; base_credit_cost?: number; description?: string; can_execute_in_transit?: boolean } }[];
}

export interface AdminDataResponse {
  skills: any[];
  cities: any[];
  professions?: any[];
  game_config: { key: string; value: string; description?: string; updated_at?: string }[];
  rail_connections: { id: string; city_a_id: string; city_b_id: string; created_at?: string }[];
  water_routes: { id: string; city_a_id: string; city_b_id: string; created_at?: string }[];
}

export const adminApi = {
  login: async (username: string, password: string) => {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Authentication failed');
    return data;
  },

  verifySession: async (token?: string) => {
    const tokenToVerify = token || getStoredAdminToken();
    if (!tokenToVerify) throw new Error('No active admin token');
    const res = await fetch('/api/admin/auth/verify', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenToVerify}`,
        'x-admin-token': tokenToVerify,
      },
      body: JSON.stringify({ token: tokenToVerify }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Admin session invalid');
    return data;
  },

  verifyKey: async (key: string) => {
    return adminApi.verifySession(key);
  },

  getData: async (): Promise<AdminDataResponse> => {
    return adminFetch('/api/admin/data');
  },

  // Skills
  createSkill: async (skillData: any) => {
    return adminFetch('/api/admin/skills', {
      method: 'POST',
      body: JSON.stringify(skillData),
    });
  },

  updateSkill: async (id: string, updates: any) => {
    return adminFetch(`/api/admin/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteSkill: async (id: string) => {
    return adminFetch(`/api/admin/skills/${id}`, {
      method: 'DELETE',
    });
  },

  // Cities
  createCity: async (cityData: any) => {
    return adminFetch('/api/admin/cities', {
      method: 'POST',
      body: JSON.stringify(cityData),
    });
  },

  updateCity: async (id: string, updates: any) => {
    return adminFetch(`/api/admin/cities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteCity: async (id: string) => {
    return adminFetch(`/api/admin/cities/${id}`, {
      method: 'DELETE',
    });
  },

  // Connections
  addRailConnection: async (city_a_id: string, city_b_id: string) => {
    return adminFetch('/api/admin/connections/rail', {
      method: 'POST',
      body: JSON.stringify({ city_a_id, city_b_id }),
    });
  },

  deleteRailConnection: async (id: string) => {
    return adminFetch(`/api/admin/connections/rail/${id}`, {
      method: 'DELETE',
    });
  },

  addWaterRoute: async (city_a_id: string, city_b_id: string) => {
    return adminFetch('/api/admin/connections/water', {
      method: 'POST',
      body: JSON.stringify({ city_a_id, city_b_id }),
    });
  },

  deleteWaterRoute: async (id: string) => {
    return adminFetch(`/api/admin/connections/water/${id}`, {
      method: 'DELETE',
    });
  },

  // Game Config & AP/Cost rules
  updateConfig: async (configs: { key: string; value: string | number; description?: string }[]) => {
    return adminFetch('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify({ configs }),
    });
  },

  // Players & AP / Credits Management
  getPlayers: async (): Promise<{ success: boolean; players: PlayerOperative[] }> => {
    return adminFetch('/api/admin/players');
  },

  updatePlayerResources: async (
    id: string,
    updates: {
      current_ap?: number;
      max_ap?: number;
      credits?: number;
      is_alive?: boolean;
      city_id?: string;
      player_type?: 'PC' | 'NPC';
      reason?: string;
    }
  ): Promise<{ success: boolean; message: string; character: any; action_points: any }> => {
    return adminFetch(`/api/admin/players/${id}/resources`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // NPC Generation
  generateNpcs: async (
    count: number,
    npcs?: any[]
  ): Promise<{ success: boolean; message: string; count: number; npcs: PlayerOperative[] }> => {
    return adminFetch('/api/admin/npcs/generate', {
      method: 'POST',
      body: JSON.stringify({ count, npcs }),
    });
  },

  // Admin Impersonation (Control an NPC or Player)
  impersonateOperative: async (
    characterId: string
  ): Promise<{
    success: boolean;
    message: string;
    token: string;
    account: any;
    character: any;
  }> => {
    return adminFetch(`/api/admin/impersonate/${characterId}`, {
      method: 'POST',
    });
  },
};
