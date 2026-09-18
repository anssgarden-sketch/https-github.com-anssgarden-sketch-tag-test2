// TAG: The Assassination Game — Core Types

export interface Account {
  id: string;
  email: string;
  dark_web_handle: string;
  swiss_bank_number: string;
  gold_coins: number;
  death_count: number;
  created_at?: string;
}

export interface City {
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

export interface Profession {
  id: string;
  name: string;
  description: string;
  credits_per_week: number;
  ap_modifier: number;
  schedule_type: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'assassination' | 'defensive' | 'intel' | 'counter_intel';
  range: 'close' | 'short' | 'medium' | 'long' | 'remote' | 'city' | 'country' | 'continent' | 'global';
  base_ap_cost: number;
  base_credit_cost: number;
}

export interface CharacterSkill {
  pool: 'assassination' | 'defensive' | 'intel' | 'counter_intel';
  skills: Skill;
}

export interface ActionPoints {
  current_ap: number;
  max_ap: number;
  last_regen_at?: string;
}

export interface SurveillanceProbeInfo {
  type: 'surveillance';
  is_sweep: boolean;
  target_name: string | null;
  skill_id: string;
  skill_name?: string;
  target_city_id: string;
  target_city_name?: string;
  ap_cost: number;
  credit_cost: number;
  ap_deficit_hours: number;
  completes_at: string;
}

export interface Character {
  id: string;
  account_id: string;
  name: string;
  player_type?: 'PC' | 'NPC';
  is_alive: boolean;
  credits: number;
  current_city_id: string;
  profession_id: string;
  travel_status: 'arrived' | 'in_transit' | 'in_surveillance';
  destination_city_id: string | null;
  transport_mode: 'air' | 'rail' | 'water' | 'road' | string | null;
  journey_started_at: string | null;
  arrives_at: string | null;
  ap_committed: number;
  kill_count: number;
  intel_sold_count: number;
  items_sold_count: number;
  survival_days: number;
  killed_by_account_id?: string | null;
  killed_with_skill_id?: string | null;
  killed_at?: string | null;
  created_at: string;
  surveillance_info?: SurveillanceProbeInfo | null;
  last_surveillance_report?: {
    success: boolean;
    tagged?: { name: string; city: string; is_in_transit: boolean }[];
    tagged_count?: number;
    blocked_count?: number;
    result?: string;
    error?: string;
  } | null;
  cities?: {
    name: string;
    country: string;
    continent: string;
    map_x?: number;
    map_y?: number;
  };
  professions?: {
    name: string;
    credits_per_week: number;
    ap_modifier: number;
  };
  action_points?: ActionPoints;
  character_skills?: CharacterSkill[];
}

export interface ActiveTag {
  id: string;
  tagged_at: string;
  expires_at: string;
  tagged_in_city_id: string;
  cities?: {
    id?: string;
    name: string;
    country: string;
    continent?: string;
  };
  characters?: {
    id: string;
    name: string;
    travel_status: string;
    current_city_id?: string;
    cities?: {
      id?: string;
      name: string;
      country: string;
      continent?: string;
    };
  };
  skills?: {
    name: string;
  };
}

export interface TransportRates {
  ap: number;
  credits: number;
}

export interface TravelMapData {
  cities: City[];
  rail_connections: { id: string; city_a_id: string; city_b_id: string }[];
  water_routes: { id: string; city_a_id: string; city_b_id: string }[];
  rates: {
    air: TransportRates;
    rail: TransportRates;
    water: TransportRates;
    road: TransportRates;
  };
}

export interface CreationData {
  cities: City[];
  professions: Profession[];
  skill_pools: {
    assassination_defensive: Skill[];
    intel_counter_intel: Skill[];
  };
  rules: {
    assassination_slots: number;
    defensive_slots: number;
    intel_slots: number;
    counter_intel_slots: number;
  };
}

export interface AssassinationOutcome {
  outcome: 'killed' | 'survived' | 'counter_attacked' | 'mutual_survival';
  message: string;
  target_name?: string;
  attacker_name?: string;
  skill_used?: string;
  counter_skill_used?: string | null;
  attacker_identity_revealed?: boolean;
  ap_spent?: number;
  credits_spent?: number;
  vendetta_bounty?: VendettaBounty | null;
  vendetta_warning?: string;
  revoked_vendettas?: VendettaBounty[];
  patron_eliminated_notice?: string;
}

// ── Dark Web BBS / Sedes Obscura Types ──────────────────────
export interface VendettaBounty {
  id: string;
  category: 'VENDETTA' | string;
  priority: 'CRITICAL' | 'ELEVATED' | 'HIGH' | 'MODERATE' | string;
  title: string;
  target_name: string;
  target_character_id?: string | null;
  target_city: string;
  target_status: 'ACTIVE' | 'LIQUIDATED' | 'PACIFIED' | 'VOIDED' | string;
  bounty_credits: number;
  issued_by: string;
  // Real NPC Issuer Link
  issuer_npc_character_id?: string | null;
  issuer_npc_name?: string;
  issuer_npc_handle?: string;
  issuer_npc_city_name?: string;
  issuer_npc_city_id?: string | null;
  issuer_faction?: string;
  issuer_npc_is_alive?: boolean;
  issuer_dialogue?: string;
  settlement_cost?: number;
  negotiation_ap_cost?: number;
  cease_reason?: 'ISSUER_ELIMINATED' | 'RESTITUTION_PAID' | 'DIPLOMATIC_TRUCE' | 'MARK_LIQUIDATED' | string | null;
  resolved_at?: string | null;
  victim_name: string;
  victim_character_id?: string | null;
  incident_city: string;
  body: string;
  is_active: boolean;
  created_at: string;
  escalation_count?: number;
  killer_name?: string | null;
}

export interface DarkWebBulletin {
  id: string;
  title: string;
  priority: 'CRITICAL' | 'URGENT' | 'HIGH' | 'STANDARD' | 'ELEVATED' | string;
  category: 'EXCOMMUNICADO' | 'PROSCRIPTION' | 'CEASEFIRE' | 'BOUNTY' | 'DIRECTIVE' | 'VENDETTA' | string;
  body: string;
  target_name?: string | null;
  target_city?: string | null;
  bounty_credits: number;
  is_active: boolean;
  issued_by: string;
  created_at: string;
  target_character_id?: string | null;
  target_is_alive?: boolean;
  target_status?: 'ACTIVE' | 'LIQUIDATED' | 'UNKNOWN' | string;
  current_city_name?: string | null;
  killer_name?: string | null;
  escalation_count?: number;
  victim_name?: string | null;
}

export interface DarkWebKillFeedItem {
  id: string;
  assassin_name: string;
  target_name: string;
  city_name: string;
  skill_name: string;
  victim_survived: boolean;
  credits_awarded: number;
  timestamp: string;
}

export interface DarkWebThread {
  id: string;
  channel: 'general' | 'trade' | 'intel' | 'bounties' | 'ops' | string;
  title: string;
  author_handle: string;
  author_account_id?: string | null;
  is_anonymous: boolean;
  is_pinned: boolean;
  reply_count: number;
  last_post_at: string;
  created_at: string;
}

export interface DarkWebPost {
  id: string;
  thread_id: string;
  author_handle: string;
  is_anonymous: boolean;
  content: string;
  created_at: string;
}

export interface DarkWebMessage {
  id: string;
  sender_handle: string;
  recipient_handle: string;
  subject: string;
  body: string;
  is_read: boolean;
  burn_on_read: boolean;
  created_at: string;
}

export interface DarkWebCipherRoom {
  id: string;
  room_code: string;
  name: string;
  creator_handle: string;
  created_at: string;
}

export interface DarkWebCipherMessage {
  id: string;
  room_id: string;
  sender_handle: string;
  message: string;
  created_at: string;
}

