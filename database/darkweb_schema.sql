-- ============================================================
-- TAG: The Assassination Game
-- Dark Web BBS: The Shadow Net (Node 0x7A) - Sedes Obscura
-- ============================================================

-- 1. Sedes Obscura Official Bulletins & Sanctions (The High Table Equivalent)
CREATE TABLE IF NOT EXISTS darkweb_bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'HIGH', -- 'CRITICAL', 'URGENT', 'HIGH', 'STANDARD'
  category TEXT NOT NULL DEFAULT 'SANCTION', -- 'EXCOMMUNICADO', 'PROSCRIPTION', 'CEASEFIRE', 'BOUNTY', 'DIRECTIVE'
  body TEXT NOT NULL,
  target_name TEXT,
  target_city TEXT,
  bounty_credits INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  issued_by TEXT NOT NULL DEFAULT 'SEDES OBSCURA SECRETARIAT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Underground Discussion Boards (Public Threads & Replies)
CREATE TABLE IF NOT EXISTS darkweb_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL DEFAULT 'general', -- 'general', 'trade', 'intel', 'bounties', 'ops'
  title TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  author_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  reply_count INTEGER NOT NULL DEFAULT 0,
  last_post_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS darkweb_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES darkweb_threads(id) ON DELETE CASCADE,
  author_handle TEXT NOT NULL,
  author_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Encrypted Dead-Drop (Asynchronous Direct Electronic Mail)
CREATE TABLE IF NOT EXISTS darkweb_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_handle TEXT NOT NULL,
  sender_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  recipient_handle TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  burn_on_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Ephemeral Cipher Rooms (Private Encrypted Chat Rooms)
CREATE TABLE IF NOT EXISTS darkweb_cipher_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  passcode TEXT NOT NULL,
  creator_handle TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS darkweb_cipher_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES darkweb_cipher_rooms(id) ON DELETE CASCADE,
  sender_handle TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initial Lore & Seed Bulletins from Sedes Obscura
INSERT INTO darkweb_bulletins (title, priority, category, body, target_name, target_city, bounty_credits, issued_by)
VALUES 
(
  'WRIT OF EXCOMMUNICADO: OPERATIVE SCARLET',
  'CRITICAL',
  'EXCOMMUNICADO',
  'BY UNANIMOUS VERDICT OF SEDES OBSCURA: Operative Scarlet has violated Covenant Rule IV by initiating unsanctioned bloodshed on neutral ground. All syndicate protections, Continental sanctuary immunities, and Swiss escrow banking access are irrevocably REVOKED. Any sworn operative who liquidates this renegade shall receive immediate bounty settlement.',
  'Operative Scarlet',
  'Berlin',
  75000,
  'SEDES OBSCURA GRAND CHANCELLERY'
),
(
  'SECTOR ADVISORY: CEASEFIRE ACCORD — SECTOR ZURICH',
  'URGENT',
  'CEASEFIRE',
  'Notice to all active hitmen and contractors: Zurich Central Banking District is designated an absolute Ceasefire Zone for the next 72 hours due to high-table banking audits. Drawing blood or discharging ordinance within Canton Zurich carries immediate summary proscription.',
  NULL,
  'Zurich',
  0,
  'SEDES OBSCURA ENFORCEMENT PREFECTURE'
),
(
  'OPEN PROSCRIPTION: THE GHOST SYNDICATE LEAK',
  'HIGH',
  'PROSCRIPTION',
  'An encrypted cipher cache containing deep-cover operative IDs was intercepted in Transit Sector Singapore. An open proscription contract is awarded to whoever neutralizes the courier before transmission completes.',
  'Unknown Courier #99',
  'Singapore',
  40000,
  'SEDES OBSCURA INTELLIGENCE TRIBUNAL'
)
ON CONFLICT DO NOTHING;

-- Initial Forum Threads
INSERT INTO darkweb_threads (channel, title, author_handle, is_anonymous, is_pinned, reply_count)
VALUES
(
  'general',
  'WARNING: Unmarked surveillance probes active in Sector London',
  'Cipher_09',
  FALSE,
  TRUE,
  3
),
(
  'trade',
  'WTS: 48hr Active Surveillance Tag — Target located in Sector Tokyo',
  'GhostProtocol',
  FALSE,
  FALSE,
  2
),
(
  'ops',
  'Discussion: Long-Range Rifle calibration vs. Close-Quarters Poison build',
  'BlackBriar',
  FALSE,
  FALSE,
  4
),
(
  'bounties',
  'Private escrow bounty: 15,000 credits for sighting of Operative Fox',
  'ANONYMOUS',
  TRUE,
  FALSE,
  1
)
ON CONFLICT DO NOTHING;
