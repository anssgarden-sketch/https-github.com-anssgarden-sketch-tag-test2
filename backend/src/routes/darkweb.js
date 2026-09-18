const router = require('express').Router();
const supabase = require('../services/supabase');
const auth = require('../middleware/auth');
const { createNpcOperative } = require('../services/npcService');
const { 
  syncAndReplenishContracts, 
  MAX_LIVE_CONTRACTS,
  getActiveVendettas,
  getVendettaForCharacter,
  triggerVendettaBounty,
  syncVendettaVitality,
  pacifyVendettaWithRestitution,
  negotiateVendettaCeasefire,
  checkAndRevokeVendettasForKilledIssuer
} = require('../services/contractService');

// Helper: Ensure darkweb tables exist gracefully in Supabase
let tablesInitialized = false;

// In-memory memory fallback store if Supabase user hasn't run darkweb migration yet
const fallbackStore = {
  bulletins: [
    {
      id: 'b-01',
      title: 'WRIT OF EXCOMMUNICADO: OPERATIVE SCARLET',
      priority: 'CRITICAL',
      category: 'EXCOMMUNICADO',
      body: 'BY UNANIMOUS VERDICT OF SEDES OBSCURA: Operative Scarlet has violated Covenant Rule IV by initiating unsanctioned bloodshed on neutral ground. All syndicate protections, Continental sanctuary immunities, and Swiss escrow banking access are irrevocably REVOKED. Any sworn operative who liquidates this renegade shall receive immediate bounty settlement.',
      target_name: 'Operative Scarlet',
      target_city: 'Berlin',
      bounty_credits: 75000,
      is_active: true,
      issued_by: 'SEDES OBSCURA GRAND CHANCELLERY',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 'b-02',
      title: 'SECTOR ADVISORY: CEASEFIRE ACCORD — SECTOR ZURICH',
      priority: 'URGENT',
      category: 'CEASEFIRE',
      body: 'Notice to all active hitmen and contractors: Zurich Central Banking District is designated an absolute Ceasefire Zone for the next 72 hours due to high-table banking audits. Drawing blood or discharging ordinance within Canton Zurich carries immediate summary proscription.',
      target_name: null,
      target_city: 'Zurich',
      bounty_credits: 0,
      is_active: true,
      issued_by: 'SEDES OBSCURA ENFORCEMENT PREFECTURE',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 'b-03',
      title: 'OPEN PROSCRIPTION: THE GHOST SYNDICATE LEAK',
      priority: 'HIGH',
      category: 'PROSCRIPTION',
      body: 'An encrypted cipher cache containing deep-cover operative IDs was intercepted in Transit Sector Singapore. An open proscription contract is awarded to whoever neutralizes the courier before transmission completes.',
      target_name: 'Unknown Courier #99',
      target_city: 'Singapore',
      bounty_credits: 40000,
      is_active: true,
      issued_by: 'SEDES OBSCURA INTELLIGENCE TRIBUNAL',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ],
  threads: [
    {
      id: 'th-01',
      channel: 'general',
      title: 'WARNING: Unmarked surveillance probes active in Sector London',
      author_handle: 'Cipher_09',
      is_anonymous: false,
      is_pinned: true,
      reply_count: 2,
      last_post_at: new Date(Date.now() - 1800000).toISOString(),
      created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'th-02',
      channel: 'trade',
      title: 'WTS: 48hr Active Surveillance Tag — Target located in Sector Tokyo',
      author_handle: 'GhostProtocol',
      is_anonymous: false,
      is_pinned: false,
      reply_count: 1,
      last_post_at: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date(Date.now() - 14400000).toISOString()
    },
    {
      id: 'th-03',
      channel: 'ops',
      title: 'Discussion: Long-Range Rifle calibration vs. Close-Quarters Poison build',
      author_handle: 'BlackBriar',
      is_anonymous: false,
      is_pinned: false,
      reply_count: 3,
      last_post_at: new Date(Date.now() - 5400000).toISOString(),
      created_at: new Date(Date.now() - 21600000).toISOString()
    },
    {
      id: 'th-04',
      channel: 'bounties',
      title: 'Private escrow bounty: 15,000 credits for verified coordinates of Operative Fox',
      author_handle: 'ANONYMOUS',
      is_anonymous: true,
      is_pinned: false,
      reply_count: 1,
      last_post_at: new Date(Date.now() - 7200000).toISOString(),
      created_at: new Date(Date.now() - 28800000).toISOString()
    }
  ],
  posts: [
    {
      id: 'p-01',
      thread_id: 'th-01',
      author_handle: 'Cipher_09',
      is_anonymous: false,
      content: 'Be advised if you are operating in London. Multiple electronic sweeps have been pinging Heathrow and Waterloo hubs. Someone is burning AP trying to pin down operatives in transit.',
      created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'p-02',
      thread_id: 'th-01',
      author_handle: 'NightStalker',
      is_anonymous: false,
      content: 'Confirmed. My counter-intel perimeter triggered two false alerts near Westminster 40 minutes ago.',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'p-03',
      thread_id: 'th-01',
      author_handle: 'ShadowWeaver',
      is_anonymous: true,
      content: 'Whoever is doing it forgot that rail transit between London and Paris has zero detection checkpoints if you take the overnight sleeper.',
      created_at: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: 'p-04',
      thread_id: 'th-02',
      author_handle: 'GhostProtocol',
      is_anonymous: false,
      content: 'I have a fresh 48-hour tracking beacon firmly attached to a high-value mark currently holed up in Tokyo. Looking for 12,000 credits or trade for defensive intel in Berlin.',
      created_at: new Date(Date.now() - 14400000).toISOString()
    },
    {
      id: 'p-05',
      thread_id: 'th-02',
      author_handle: 'Kitsune_7',
      is_anonymous: false,
      content: 'Are they in Shinjuku or Ginza? If they are within 1 AP transit of the bullet train, I will buy.',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'p-06',
      thread_id: 'th-03',
      author_handle: 'BlackBriar',
      is_anonymous: false,
      content: 'Rifle allows strike from medium/long range, which completely bypasses most close-quarter defensive perks. What are your field results?',
      created_at: new Date(Date.now() - 21600000).toISOString()
    },
    {
      id: 'p-07',
      thread_id: 'th-04',
      author_handle: 'ANONYMOUS',
      is_anonymous: true,
      content: 'Escrow deposited in Zurich sub-account #8821. Provide verifiable timestamp of Fox entering any European capital.',
      created_at: new Date(Date.now() - 28800000).toISOString()
    }
  ],
  messages: [
    {
      id: 'm-01',
      sender_handle: 'SEDES OBSCURA SECRETARIAT',
      recipient_handle: 'ALL',
      subject: 'WELCOME TO THE SHADOW NET // NODE-0X7A',
      body: 'Operative: This terminal is an encrypted node administered under Sedes Obscura jurisdiction. You may review official Sanction writs, exchange tactical dispatches in the forum, access the dead-drop mailbox, or construct ephemeral cipher rooms with trusted partners. Remember Covenant Law: Blood is never spilled upon neutral ground.',
      is_read: false,
      burn_on_read: false,
      created_at: new Date().toISOString()
    }
  ],
  cipherRooms: [
    {
      id: 'cr-01',
      room_code: 'OMEGA-7',
      name: 'Black Watch Syndicate',
      passcode: '3301',
      creator_handle: 'Viper',
      created_at: new Date(Date.now() - 7200000).toISOString()
    }
  ],
  cipherMessages: [
    {
      id: 'cm-01',
      room_id: 'cr-01',
      sender_handle: 'Viper',
      message: 'Channel secure. Recon report ready for next operation.',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ]
};

// Helper: Ensure any contract targets listed in bulletins exist as real, trackable NPCs in the game database
async function syncAndEnsureBulletinNpcs(bulletinList) {
  try {
    const { data: cities } = await supabase.from('cities').select('id, name, country, continent');
    if (!cities || cities.length === 0) return bulletinList;

    let preloaded = null;
    const enriched = [];

    for (const b of bulletinList) {
      if (!b.target_name || !b.target_city) {
        enriched.push(b);
        continue;
      }

      // Search if NPC already exists in database (matching target name or codename)
      const cleanKeyword = b.target_name.replace(/^Operative\s+/i, '').trim();
      const { data: existingChars } = await supabase
        .from('characters')
        .select('id, name, is_alive, current_city_id, credits, killed_by_account_id, killed_at')
        .ilike('name', `%${cleanKeyword}%`)
        .limit(1);

      let targetChar = existingChars && existingChars.length > 0 ? existingChars[0] : null;

      // If missing and bulletin is active, automatically generate the NPC operative in the specified city!
      if (!targetChar && b.is_active) {
        const cityMatch = cities.find(c => c.name.toLowerCase() === b.target_city.toLowerCase()) || cities[0];

        if (!preloaded) {
          const [profsRes, skillsRes] = await Promise.all([
            supabase.from('professions').select('id, name, credits_per_week, ap_modifier, schedule_type').order('name'),
            supabase.from('skills').select('id, name, category, range, base_ap_cost, base_credit_cost').order('name'),
          ]);
          preloaded = {
            cities,
            professions: profsRes.data || [],
            skills: skillsRes.data || [],
          };
        }

        const safeHandle = cleanKeyword.replace(/[^a-zA-Z0-9]/g, '');
        const spec = {
          name: b.target_name,
          dark_web_handle: safeHandle,
          email: `${safeHandle.toLowerCase()}.target@shadowgrid.io`,
          city_id: cityMatch.id,
          credits: b.bounty_credits || 50000,
          max_ap: 8,
          current_ap: 8,
        };

        try {
          const spawned = await createNpcOperative(spec, preloaded);
          targetChar = {
            id: spawned.id,
            name: spawned.name,
            is_alive: true,
            current_city_id: cityMatch.id,
            credits: spawned.credits,
          };
          console.log(`[DarkWeb Auto-Generator] Successfully spawned contract NPC '${b.target_name}' in ${b.target_city} (ID: ${spawned.id})`);
        } catch (spawnErr) {
          console.error(`[DarkWeb Auto-Generator] Failed to spawn NPC for ${b.target_name}:`, spawnErr.message);
        }
      }

      // Check if target was liquidated
      let isFulfilled = false;
      let killerHandle = null;
      if (targetChar) {
        if (!targetChar.is_alive) {
          isFulfilled = true;
          if (targetChar.killed_by_account_id) {
            try {
              const { data: killerAcc } = await supabase
                .from('accounts')
                .select('dark_web_handle')
                .eq('id', targetChar.killed_by_account_id)
                .maybeSingle();
              killerHandle = killerAcc?.dark_web_handle || 'CLASSIFIED OPERATIVE';
            } catch {}
          }
        }
      }

      const currentCity = cities.find(c => c.id === targetChar?.current_city_id);

      enriched.push({
        ...b,
        target_character_id: targetChar?.id || null,
        target_is_alive: targetChar ? targetChar.is_alive : true,
        target_status: isFulfilled ? 'LIQUIDATED' : (targetChar ? 'ACTIVE' : 'UNKNOWN'),
        current_city_name: currentCity?.name || b.target_city,
        killer_name: killerHandle,
        is_active: isFulfilled ? false : b.is_active,
        bounty_credits: b.bounty_credits
      });
    }

    return enriched;
  } catch (err) {
    console.error('Error in syncAndEnsureBulletinNpcs:', err);
    return bulletinList;
  }
}

// ── 1. SEDES OBSCURA BULLETINS & KILL FEED ───────────────────
router.get('/bulletins', async (req, res) => {
  try {
    // Maintain and synchronize at most 5 live contracts with NPC telemetry
    const bulletins = await syncAndReplenishContracts();

    // 2. Fetch live recent assassination events from assassination_logs to populate the live kill feed
    let killFeed = [];
    const { data: logKills } = await supabase
      .from('assassination_logs')
      .select(`
        id,
        created_at,
        assassin:characters!assassin_character_id (name, current_city:cities!current_city_id (name)),
        target:characters!target_character_id (name, current_city:cities!current_city_id (name)),
        skill:skills!skill_used_id (name, category),
        victim_survived,
        credits_awarded
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (logKills && logKills.length > 0) {
      killFeed = logKills.map(k => ({
        id: k.id,
        assassin_name: k.victim_survived ? 'REDACTED OPERATIVE' : (k.assassin?.name || 'UNKNOWN HITMAN'),
        target_name: k.target?.name || 'PROSCRIBED TARGET',
        city_name: k.target?.current_city?.name || 'UNDISCLOSED SECTOR',
        skill_name: k.skill?.name || 'COVERT METHOD',
        victim_survived: k.victim_survived,
        credits_awarded: k.credits_awarded || 0,
        timestamp: k.created_at
      }));
    } else {
      // Historical seed feed for immersion
      killFeed = [
        {
          id: 'kf-01',
          assassin_name: 'Cipher_09',
          target_name: 'Ex-Operative Vance',
          city_name: 'Vienna',
          skill_name: 'Precision Sniper Rifle',
          victim_survived: false,
          credits_awarded: 35000,
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
        },
        {
          id: 'kf-02',
          assassin_name: 'GhostProtocol',
          target_name: 'Renegade Agent Sterling',
          city_name: 'Tokyo',
          skill_name: 'Lethal Neurotoxin',
          victim_survived: false,
          credits_awarded: 50000,
          timestamp: new Date(Date.now() - 1000 * 60 * 48).toISOString()
        },
        {
          id: 'kf-03',
          assassin_name: 'REDACTED',
          target_name: 'Target Corvus',
          city_name: 'Cairo',
          skill_name: 'Car Bomb Sabotage',
          victim_survived: true,
          credits_awarded: 0,
          timestamp: new Date(Date.now() - 1000 * 60 * 115).toISOString()
        }
      ];
    }

    // Sync vital status of contract issuing NPCs
    await syncVendettaVitality();
    const vendettas = getActiveVendettas();

    // Check if requester has a personal vendetta bounty on their head
    let myVendetta = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_jwt_key_super_secret');
        if (decoded && decoded.account_id) {
          const { data: char } = await supabase
            .from('characters')
            .select('id, name')
            .eq('account_id', decoded.account_id)
            .eq('is_alive', true)
            .maybeSingle();
          if (char) {
            myVendetta = getVendettaForCharacter(char.id, char.name);
          }
        }
      } catch {}
    } else if (req.query.character_id) {
      myVendetta = getVendettaForCharacter(req.query.character_id, req.query.character_name);
    }

    res.json({
      success: true,
      bulletins,
      vendettas,
      myVendetta,
      killFeed
    });
  } catch (err) {
    res.json({
      success: true,
      bulletins: fallbackStore.bulletins,
      vendettas: getActiveVendettas(),
      myVendetta: null,
      killFeed: []
    });
  }
});

// Explicit endpoint to trigger target NPC sync/spawn and contract replenishment on demand
router.post('/bulletins/sync-targets', async (req, res) => {
  try {
    const bulletins = await syncAndReplenishContracts();
    const vendettas = getActiveVendettas();
    res.json({
      success: true,
      message: 'Active contracts verified (capped at 5 live) and synchronized.',
      bulletins,
      vendettas
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 1b. UNDERWORLD VENDETTAS & RETALIATION CONTRACTS ─────────
router.get('/vendettas', (req, res) => {
  try {
    const vendettas = getActiveVendettas();
    res.json({ success: true, vendettas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to simulate/test a vendetta bounty on the calling character
router.post('/vendettas/test-trigger', auth, async (req, res) => {
  try {
    const account_id = req.account.account_id;
    const { data: attacker } = await supabase
      .from('characters')
      .select('id, name, current_city_id, credits, cities!current_city_id(name)')
      .eq('account_id', account_id)
      .eq('is_alive', true)
      .single();

    if (!attacker) {
      return res.status(404).json({ success: false, error: 'Active character not found' });
    }

    const attackerCity = Array.isArray(attacker.cities) ? attacker.cities[0] : attacker.cities;

    // Simulate an unsanctioned strike against a neutral operative
    const fakeTarget = {
      id: 'npc-simulated-' + Date.now(),
      name: req.body.victim_name || 'Agent Marcus Ward'
    };
    const fakeTargetCity = { name: attackerCity?.name || 'Berlin' };

    const vendetta = await triggerVendettaBounty({
      attacker,
      target: fakeTarget,
      attackerCity,
      targetCity: fakeTargetCity,
      outcome: 'killed'
    });

    res.json({
      success: true,
      message: `Vendetta blood-debt contract successfully declared by associates of ${fakeTarget.name}!`,
      vendetta
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to pacify the contract issuer by paying blood-money restitution
router.post('/vendettas/:id/pacify-restitution', auth, async (req, res) => {
  try {
    const result = await pacifyVendettaWithRestitution({
      vendettaId: req.params.id,
      accountId: req.account.account_id
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Endpoint to negotiate an underworld ceasefire with the contract issuer using AP
router.post('/vendettas/:id/negotiate-truce', auth, async (req, res) => {
  try {
    const result = await negotiateVendettaCeasefire({
      vendettaId: req.params.id,
      accountId: req.account.account_id
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Quick testing/simulation endpoint: Eliminate the contract issuing patron
router.post('/vendettas/:id/eliminate-issuer', auth, async (req, res) => {
  try {
    const vendettas = getActiveVendettas();
    const v = vendettas.find(item => item.id === req.params.id);
    if (!v) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    if (!v.issuer_npc_character_id) {
      return res.status(400).json({ success: false, error: 'No NPC issuer linked to this contract' });
    }

    // Mark NPC dead in DB
    await supabase
      .from('characters')
      .update({
        is_alive: false,
        killed_by_account_id: req.account.account_id,
        killed_at: new Date().toISOString()
      })
      .eq('id', v.issuer_npc_character_id);

    const revoked = await checkAndRevokeVendettasForKilledIssuer(v.issuer_npc_character_id, req.account.account_id);

    res.json({
      success: true,
      message: `Contract patron ${v.issuer_npc_name} was eliminated! The blood-debt contract has ceased immediately.`,
      revoked
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 2. FORUM THREADS & POSTS ─────────────────────────────────
router.get('/threads', async (req, res) => {
  const channel = req.query.channel || 'all';
  try {
    let query = supabase
      .from('darkweb_threads')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('last_post_at', { ascending: false });

    if (channel !== 'all') {
      query = query.eq('channel', channel);
    }

    const { data: dbThreads, error } = await query.limit(50);
    if (!error && dbThreads && dbThreads.length > 0) {
      return res.json({ success: true, threads: dbThreads });
    }

    let filtered = fallbackStore.threads;
    if (channel !== 'all') {
      filtered = filtered.filter(t => t.channel === channel);
    }
    return res.json({ success: true, threads: filtered });
  } catch (err) {
    return res.json({ success: true, threads: fallbackStore.threads });
  }
});

router.get('/threads/:id', async (req, res) => {
  const threadId = req.params.id;
  try {
    // 1. Thread detail
    let thread = null;
    const { data: dbThread } = await supabase
      .from('darkweb_threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (dbThread) {
      thread = dbThread;
    } else {
      thread = fallbackStore.threads.find(t => t.id === threadId);
    }

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // 2. Thread posts
    let posts = [];
    const { data: dbPosts } = await supabase
      .from('darkweb_posts')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (dbPosts && dbPosts.length > 0) {
      posts = dbPosts;
    } else {
      posts = fallbackStore.posts.filter(p => p.thread_id === threadId);
    }

    res.json({ success: true, thread, posts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve thread' });
  }
});

router.post('/threads', auth, async (req, res) => {
  const { channel, title, content, is_anonymous } = req.body;
  const accountId = req.account.id;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    // Fetch author's handle
    const { data: account } = await supabase
      .from('accounts')
      .select('dark_web_handle')
      .eq('id', accountId)
      .single();

    const authorHandle = is_anonymous ? 'ANONYMOUS' : (account?.dark_web_handle || 'OPERATIVE');

    // Try inserting into Supabase
    const { data: newThread, error: thError } = await supabase
      .from('darkweb_threads')
      .insert({
        channel: channel || 'general',
        title: title.trim(),
        author_handle: authorHandle,
        author_account_id: is_anonymous ? null : accountId,
        is_anonymous: Boolean(is_anonymous),
        reply_count: 1,
        last_post_at: new Date().toISOString()
      })
      .select()
      .single();

    if (!thError && newThread) {
      // Insert initial post
      await supabase.from('darkweb_posts').insert({
        thread_id: newThread.id,
        author_handle: authorHandle,
        author_account_id: is_anonymous ? null : accountId,
        is_anonymous: Boolean(is_anonymous),
        content: content.trim()
      });

      return res.json({ success: true, thread: newThread });
    }

    // Fallback store
    const fallbackId = `th-${Date.now()}`;
    const fbThread = {
      id: fallbackId,
      channel: channel || 'general',
      title: title.trim(),
      author_handle: authorHandle,
      author_account_id: is_anonymous ? null : accountId,
      is_anonymous: Boolean(is_anonymous),
      is_pinned: false,
      reply_count: 1,
      last_post_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    fallbackStore.threads.unshift(fbThread);
    fallbackStore.posts.push({
      id: `p-${Date.now()}`,
      thread_id: fallbackId,
      author_handle: authorHandle,
      author_account_id: is_anonymous ? null : accountId,
      is_anonymous: Boolean(is_anonymous),
      content: content.trim(),
      created_at: new Date().toISOString()
    });

    res.json({ success: true, thread: fbThread });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

router.post('/threads/:id/reply', auth, async (req, res) => {
  const threadId = req.params.id;
  const { content, is_anonymous } = req.body;
  const accountId = req.account.id;

  if (!content) {
    return res.status(400).json({ error: 'Content cannot be empty' });
  }

  try {
    const { data: account } = await supabase
      .from('accounts')
      .select('dark_web_handle')
      .eq('id', accountId)
      .single();

    const authorHandle = is_anonymous ? 'ANONYMOUS' : (account?.dark_web_handle || 'OPERATIVE');

    // Try Supabase insert
    const { data: newPost, error: pError } = await supabase
      .from('darkweb_posts')
      .insert({
        thread_id: threadId,
        author_handle: authorHandle,
        author_account_id: is_anonymous ? null : accountId,
        is_anonymous: Boolean(is_anonymous),
        content: content.trim()
      })
      .select()
      .single();

    if (!pError && newPost) {
      await supabase
        .from('darkweb_threads')
        .update({
          last_post_at: new Date().toISOString()
        })
        .eq('id', threadId);

      return res.json({ success: true, post: newPost });
    }

    // Fallback store
    const fbPost = {
      id: `p-${Date.now()}`,
      thread_id: threadId,
      author_handle: authorHandle,
      author_account_id: is_anonymous ? null : accountId,
      is_anonymous: Boolean(is_anonymous),
      content: content.trim(),
      created_at: new Date().toISOString()
    };
    fallbackStore.posts.push(fbPost);
    const targetThread = fallbackStore.threads.find(t => t.id === threadId);
    if (targetThread) {
      targetThread.reply_count += 1;
      targetThread.last_post_at = new Date().toISOString();
    }

    res.json({ success: true, post: fbPost });
  } catch (err) {
    res.status(500).json({ error: 'Failed to post reply' });
  }
});

// ── 3. ENCRYPTED DEAD-DROP (DIRECT MESSAGES) ─────────────────
router.get('/messages', auth, async (req, res) => {
  const accountId = req.account.id;
  try {
    const { data: account } = await supabase
      .from('accounts')
      .select('dark_web_handle')
      .eq('id', accountId)
      .single();

    const handle = account?.dark_web_handle;

    // Fetch received and sent messages
    let inbox = [];
    const { data: dbMessages } = await supabase
      .from('darkweb_messages')
      .select('*')
      .or(`recipient_handle.eq.${handle},recipient_handle.eq.ALL,sender_handle.eq.${handle}`)
      .order('created_at', { ascending: false });

    if (dbMessages && dbMessages.length > 0) {
      inbox = dbMessages;
    } else {
      inbox = fallbackStore.messages.filter(
        m => m.recipient_handle === handle || m.recipient_handle === 'ALL' || m.sender_handle === handle
      );
    }

    res.json({ success: true, messages: inbox, myHandle: handle });
  } catch (err) {
    res.json({ success: true, messages: fallbackStore.messages, myHandle: 'OPERATIVE' });
  }
});

router.post('/messages', auth, async (req, res) => {
  const { recipient_handle, subject, body, burn_on_read } = req.body;
  const accountId = req.account.id;

  if (!recipient_handle || !subject || !body) {
    return res.status(400).json({ error: 'Recipient, subject, and body are required' });
  }

  try {
    const { data: account } = await supabase
      .from('accounts')
      .select('dark_web_handle')
      .eq('id', accountId)
      .single();

    const senderHandle = account?.dark_web_handle || 'ANONYMOUS';

    const { data: newMsg, error } = await supabase
      .from('darkweb_messages')
      .insert({
        sender_handle: senderHandle,
        sender_account_id: accountId,
        recipient_handle: recipient_handle.trim(),
        subject: subject.trim(),
        body: body.trim(),
        burn_on_read: Boolean(burn_on_read)
      })
      .select()
      .single();

    if (!error && newMsg) {
      return res.json({ success: true, message: newMsg });
    }

    const fbMsg = {
      id: `m-${Date.now()}`,
      sender_handle: senderHandle,
      sender_account_id: accountId,
      recipient_handle: recipient_handle.trim(),
      subject: subject.trim(),
      body: body.trim(),
      is_read: false,
      burn_on_read: Boolean(burn_on_read),
      created_at: new Date().toISOString()
    };
    fallbackStore.messages.unshift(fbMsg);

    res.json({ success: true, message: fbMsg });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send dead-drop message' });
  }
});

// Read and optionally burn message
router.post('/messages/:id/read', auth, async (req, res) => {
  const messageId = req.params.id;
  try {
    const { data: msg } = await supabase
      .from('darkweb_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (msg) {
      if (msg.burn_on_read) {
        await supabase.from('darkweb_messages').delete().eq('id', messageId);
        return res.json({ success: true, burned: true });
      } else {
        await supabase.from('darkweb_messages').update({ is_read: true }).eq('id', messageId);
        return res.json({ success: true, burned: false });
      }
    }

    const fbIndex = fallbackStore.messages.findIndex(m => m.id === messageId);
    if (fbIndex !== -1) {
      const fbMsg = fallbackStore.messages[fbIndex];
      if (fbMsg.burn_on_read) {
        fallbackStore.messages.splice(fbIndex, 1);
        return res.json({ success: true, burned: true });
      } else {
        fbMsg.is_read = true;
        return res.json({ success: true, burned: false });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update message state' });
  }
});

// ── 4. CIPHER ROOMS (PRIVATE CHATS) ──────────────────────────
router.get('/cipher-rooms', async (req, res) => {
  try {
    const { data: rooms } = await supabase
      .from('darkweb_cipher_rooms')
      .select('id, room_code, name, creator_handle, created_at')
      .order('created_at', { ascending: false });

    if (rooms && rooms.length > 0) {
      return res.json({ success: true, rooms });
    }

    return res.json({
      success: true,
      rooms: fallbackStore.cipherRooms.map(({ passcode, ...r }) => r)
    });
  } catch (err) {
    res.json({
      success: true,
      rooms: fallbackStore.cipherRooms.map(({ passcode, ...r }) => r)
    });
  }
});

router.post('/cipher-rooms/join', async (req, res) => {
  const { room_code, passcode } = req.body;
  if (!room_code || !passcode) {
    return res.status(400).json({ error: 'Room code and passcode are required' });
  }

  try {
    let room = null;
    const { data: dbRoom } = await supabase
      .from('darkweb_cipher_rooms')
      .select('*')
      .eq('room_code', room_code.trim().toUpperCase())
      .single();

    if (dbRoom) {
      if (dbRoom.passcode !== passcode.trim()) {
        return res.status(403).json({ error: 'Invalid cipher passcode. Handshake rejected.' });
      }
      room = dbRoom;
    } else {
      const fbRoom = fallbackStore.cipherRooms.find(
        r => r.room_code.toUpperCase() === room_code.trim().toUpperCase()
      );
      if (!fbRoom || fbRoom.passcode !== passcode.trim()) {
        return res.status(403).json({ error: 'Invalid cipher passcode. Handshake rejected.' });
      }
      room = fbRoom;
    }

    // Fetch messages for this room
    let messages = [];
    const { data: dbMessages } = await supabase
      .from('darkweb_cipher_messages')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (dbMessages) {
      messages = dbMessages;
    } else {
      messages = fallbackStore.cipherMessages.filter(m => m.room_id === room.id);
    }

    res.json({
      success: true,
      room: {
        id: room.id,
        room_code: room.room_code,
        name: room.name,
        creator_handle: room.creator_handle
      },
      messages
    });
  } catch (err) {
    res.status(500).json({ error: 'Cipher authentication failed' });
  }
});

router.post('/cipher-rooms', auth, async (req, res) => {
  const { room_code, name, passcode } = req.body;
  const accountId = req.account.id;

  if (!room_code || !name || !passcode) {
    return res.status(400).json({ error: 'Room code, name, and passcode are required' });
  }

  try {
    const { data: account } = await supabase
      .from('accounts')
      .select('dark_web_handle')
      .eq('id', accountId)
      .single();

    const creatorHandle = account?.dark_web_handle || 'OPERATIVE';

    const { data: newRoom, error } = await supabase
      .from('darkweb_cipher_rooms')
      .insert({
        room_code: room_code.trim().toUpperCase(),
        name: name.trim(),
        passcode: passcode.trim(),
        creator_handle: creatorHandle
      })
      .select()
      .single();

    if (!error && newRoom) {
      return res.json({ success: true, room: newRoom });
    }

    const fbRoom = {
      id: `cr-${Date.now()}`,
      room_code: room_code.trim().toUpperCase(),
      name: name.trim(),
      passcode: passcode.trim(),
      creator_handle: creatorHandle,
      created_at: new Date().toISOString()
    };
    fallbackStore.cipherRooms.unshift(fbRoom);

    res.json({ success: true, room: fbRoom });
  } catch (err) {
    res.status(500).json({ error: 'Failed to establish cipher room' });
  }
});

router.post('/cipher-rooms/:id/message', auth, async (req, res) => {
  const roomId = req.params.id;
  const { message } = req.body;
  const accountId = req.account.id;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  try {
    const { data: account } = await supabase
      .from('accounts')
      .select('dark_web_handle')
      .eq('id', accountId)
      .single();

    const senderHandle = account?.dark_web_handle || 'OPERATIVE';

    const { data: newMsg, error } = await supabase
      .from('darkweb_cipher_messages')
      .insert({
        room_id: roomId,
        sender_handle: senderHandle,
        message: message.trim()
      })
      .select()
      .single();

    if (!error && newMsg) {
      return res.json({ success: true, message: newMsg });
    }

    const fbMsg = {
      id: `cm-${Date.now()}`,
      room_id: roomId,
      sender_handle: senderHandle,
      message: message.trim(),
      created_at: new Date().toISOString()
    };
    fallbackStore.cipherMessages.push(fbMsg);

    res.json({ success: true, message: fbMsg });
  } catch (err) {
    res.status(500).json({ error: 'Failed to transmit encrypted packet' });
  }
});

module.exports = router;
