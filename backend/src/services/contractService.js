const fs = require('fs');
const path = require('path');
const supabase = require('./supabase');
const { createNpcOperative } = require('./npcService');

const MAX_LIVE_CONTRACTS = 5;
const STORAGE_FILE = path.join(__dirname, '..', '..', 'scratch', 'bulletins_store.json');

// Curated high-value target templates
const CONTRACT_TEMPLATES = [
  {
    target_name: 'Operative Scarlet',
    target_city: 'Berlin',
    category: 'EXCOMMUNICADO',
    priority: 'CRITICAL',
    title: 'WRIT OF EXCOMMUNICADO: OPERATIVE SCARLET',
    body: 'BY UNANIMOUS VERDICT OF SEDES OBSCURA: Operative Scarlet has violated Covenant Rule IV by initiating unsanctioned bloodshed on neutral ground. All syndicate protections, Continental sanctuary immunities, and Swiss escrow banking access are irrevocably REVOKED. Any sworn operative who liquidates this renegade shall receive immediate bounty settlement.',
    bounty_credits: 75000,
    issued_by: 'SEDES OBSCURA GRAND CHANCELLERY'
  },
  {
    target_name: 'Unknown Courier #99',
    target_city: 'Singapore',
    category: 'PROSCRIPTION',
    priority: 'HIGH',
    title: 'OPEN PROSCRIPTION: THE GHOST SYNDICATE LEAK',
    body: 'An encrypted cipher cache containing deep-cover operative IDs was intercepted in Transit Sector Singapore. An open proscription contract is awarded to whoever neutralizes the courier before transmission completes.',
    bounty_credits: 40000,
    issued_by: 'SEDES OBSCURA INTELLIGENCE TRIBUNAL'
  },
  {
    target_name: "Elena 'Kestrel' Cross",
    target_city: 'London',
    category: 'EXCOMMUNICADO',
    priority: 'CRITICAL',
    title: 'WRIT OF EXCOMMUNICADO: RENEGADE SNIPER KESTREL',
    body: 'Former elite marksman Kestrel executed an unsanctioned high-table diplomat outside the London safehouse perimeter. Designated rogue with extreme prejudice; Continental sanctuary privileges are fully revoked.',
    bounty_credits: 85000,
    issued_by: 'SEDES OBSCURA HIGH ENFORCEMENT'
  },
  {
    target_name: "Viktor 'Moreau' Drake",
    target_city: 'Zurich',
    category: 'PROSCRIPTION',
    priority: 'HIGH',
    title: 'OPEN PROSCRIPTION: THE TOXIN ARCHITECT',
    body: 'Dr. Moreau has been blacklisted for synthesizing unregulated nerve agents in the Zurich underground biolabs and selling formulas to unvetted rogue cells. Neutralize to secure the chemical ledger.',
    bounty_credits: 60000,
    issued_by: 'SEDES OBSCURA SANCTION COUNCIL'
  },
  {
    target_name: "Cassian 'Vesper' Vance",
    target_city: 'Tokyo',
    category: 'EXCOMMUNICADO',
    priority: 'CRITICAL',
    title: 'WRIT OF EXCOMMUNICADO: VESPER PROTOCOL',
    body: 'Operative Vesper siphoned 400,000 credits from the Sedes Obscura blind trust using forged biometric tokens across Shibuya network terminals. High-priority proscription bounty authorized.',
    bounty_credits: 95000,
    issued_by: 'SEDES OBSCURA TREASURY PREFECTURE'
  },
  {
    target_name: 'Major Dmitri Chen',
    target_city: 'Hong Kong',
    category: 'PROSCRIPTION',
    priority: 'HIGH',
    title: 'OPEN PROSCRIPTION: RED CELL DEFECTOR',
    body: 'Major Chen absconded with classified transit routes and continental safehouse keys after abandoning his station in Sector East. Eliminate to prevent further intelligence proliferation.',
    bounty_credits: 55000,
    issued_by: 'SEDES OBSCURA INTELLIGENCE TRIBUNAL'
  },
  {
    target_name: "Valeria 'Sterling' Strand",
    target_city: 'Vienna',
    category: 'PROSCRIPTION',
    priority: 'HIGH',
    title: 'OPEN PROSCRIPTION: CONTRABAND BROKER VALERY',
    body: 'Charged with smuggling military-grade ordnance into the Vienna Grand Continental under false diplomatic seal. Escrow released on confirmation of death.',
    bounty_credits: 65000,
    issued_by: 'SEDES OBSCURA GRAND CHANCELLERY'
  },
  {
    target_name: "Maya 'Nyx' Blackwood",
    target_city: 'New York',
    category: 'EXCOMMUNICADO',
    priority: 'CRITICAL',
    title: 'WRIT OF EXCOMMUNICADO: SHADOW WEAVER NYX',
    body: 'Accused of the assassination of High Council Arbiter Corvin inside Manhattan neutral airspace. Highest tier bounty active across all sectors; extreme caution advised.',
    bounty_credits: 110000,
    issued_by: 'SEDES OBSCURA HIGH ENFORCEMENT'
  },
  {
    target_name: 'Corin Voss',
    target_city: 'Paris',
    category: 'PROSCRIPTION',
    priority: 'NORMAL',
    title: 'OPEN PROSCRIPTION: COUNTERFEIT FORGER VOSS',
    body: 'Sedes Obscura internal audit discovered corrupted biometric passports bearing forged Continental gold seals originating from Voss Paris printshop.',
    bounty_credits: 45000,
    issued_by: 'SEDES OBSCURA SANCTION COUNCIL'
  },
  {
    target_name: "Nikolai 'Razor' Volkov",
    target_city: 'Moscow',
    category: 'EXCOMMUNICADO',
    priority: 'HIGH',
    title: 'WRIT OF EXCOMMUNICADO: THE MOSCOW ENFORCER',
    body: 'Operative Volkov breached neutral ceasefire protocols by ambushing an accredited envoy in the Arbat district. Sanctuary cancelled; liquidation authorized.',
    bounty_credits: 70000,
    issued_by: 'SEDES OBSCURA HIGH ENFORCEMENT'
  }
];

// Baseline non-bounty general advisories
const BASELINE_ADVISORIES = [
  {
    id: 'b-advisory-01',
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
  }
];

const PROCEDURAL_CODENAMES = [
  'Phantom', 'Wraith', 'Specter', 'Nemesis', 'Hydra', 'Scythe', 'Valkyrie', 'Gargoyle',
  'Ronin', 'Eclipse', 'Havoc', 'Tempest', 'Obsidian', 'Archon', 'Rook', 'Banshee',
  'Apex', 'Vanguard', 'Razor', 'Cipher', 'Viper', 'Blackbird'
];

const PROCEDURAL_FIRST = [
  'Alexander', 'Elena', 'Viktor', 'Natasha', 'Dmitri', 'Maya', 'Sebastian', 'Cassian',
  'Julian', 'Rowan', 'Valeria', 'Gideon', 'Sora', 'Talia', 'Zane', 'Nikolai', 'Damian', 'Malik'
];

const PROCEDURAL_LAST = [
  'Vance', 'Cross', 'Rostova', 'Mercer', 'Blackwood', 'Chen', 'Sterling', 'Kovacs',
  'Sinclair', 'Voss', 'Moreau', 'Novak', 'Drake', 'Steele', 'Hawthorne', 'Winters', 'Volkov'
];

const CRIME_MOTIFS = [
  'violating Continental sanctuary protocols by discharging silenced ordnance in a neutral salon',
  'intercepting and decanting diplomatic gold reserves during cross-sector armored transit',
  'compromising encrypted biometric logs of active undercover agents in the local safehouse',
  'illicitly contracting hit orders without submitting mandatory escrow tokens to the Grand Chancellery',
  'synthesizing synthetic neurotoxins and tampering with local high-table diplomatic water supplies',
  'disseminating counterfeit Swiss banking certs to unsanctioned underground syndicates'
];

function loadStoredBulletins() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[ContractService] Could not read stored bulletins:', err.message);
  }

  // Initial fallback: load first 3 templates + advisory
  const initial = [];
  initial.push(BASELINE_ADVISORIES[0]);
  for (let i = 0; i < 3; i++) {
    const t = CONTRACT_TEMPLATES[i];
    initial.push({
      id: `b-${String(i + 1).padStart(2, '0')}`,
      ...t,
      is_active: true,
      created_at: new Date(Date.now() - (i + 1) * 3600000 * 4).toISOString()
    });
  }
  saveStoredBulletins(initial);
  return initial;
}

function saveStoredBulletins(bulletins) {
  try {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(bulletins, null, 2), 'utf8');
  } catch (err) {
    console.error('[ContractService] Failed to save bulletins:', err.message);
  }
}

/**
 * Generate a procedural contract if predefined templates are already in use
 */
function generateProceduralContract(existingNames, availableCities) {
  let name = '';
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    const first = PROCEDURAL_FIRST[Math.floor(Math.random() * PROCEDURAL_FIRST.length)];
    const code = PROCEDURAL_CODENAMES[Math.floor(Math.random() * PROCEDURAL_CODENAMES.length)];
    const last = PROCEDURAL_LAST[Math.floor(Math.random() * PROCEDURAL_LAST.length)];
    name = `${first} '${code}' ${last}`;
    if (!existingNames.has(name.toLowerCase())) break;
  }

  const city = availableCities[Math.floor(Math.random() * availableCities.length)]?.name || 'Berlin';
  const category = Math.random() > 0.4 ? 'EXCOMMUNICADO' : 'PROSCRIPTION';
  const bounty = Math.floor(40000 + Math.random() * 65000);
  const crime = CRIME_MOTIFS[Math.floor(Math.random() * CRIME_MOTIFS.length)];

  return {
    id: `b-proc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: `${category === 'EXCOMMUNICADO' ? 'WRIT OF EXCOMMUNICADO' : 'OPEN PROSCRIPTION'}: ${name.toUpperCase()}`,
    priority: bounty >= 75000 ? 'CRITICAL' : 'HIGH',
    category,
    body: `BY DECREE OF SEDES OBSCURA: Operative ${name} is proscribed for ${crime} in Sector ${city}. Escrow is locked in Swiss vaults and released instantly upon biometric proof of neutralization.`,
    target_name: name,
    target_city: city,
    bounty_credits: bounty,
    is_active: true,
    issued_by: category === 'EXCOMMUNICADO' ? 'SEDES OBSCURA GRAND CHANCELLERY' : 'SEDES OBSCURA INTELLIGENCE TRIBUNAL',
    created_at: new Date().toISOString()
  };
}

/**
 * Main function: Enforces at most 5 live contracts.
 * 1. Reads current bulletin roster.
 * 2. Checks DB for each target's vitality (alive vs liquidated) and killer info.
 * 3. Counts current live contracts.
 * 4. If live contracts < 5, generates new contracts and spawns the NPCs.
 * 5. If live contracts > 5, trims excess so exactly at most 5 are active.
 * 6. Persists to storage and returns enriched bulletins.
 */
async function syncAndReplenishContracts() {
  try {
    const rawBulletins = loadStoredBulletins();

    // Fetch cities, professions, skills for NPC generation
    const [citiesRes, profsRes, skillsRes] = await Promise.all([
      supabase.from('cities').select('id, name, country, continent'),
      supabase.from('professions').select('id, name, credits_per_week, ap_modifier, schedule_type').order('name'),
      supabase.from('skills').select('id, name, category, range, base_ap_cost, base_credit_cost').order('name')
    ]);

    const cities = citiesRes.data || [];
    if (cities.length === 0) {
      console.warn('[ContractService] No cities found in DB');
      return rawBulletins;
    }

    const preloaded = {
      cities,
      professions: profsRes.data || [],
      skills: skillsRes.data || []
    };

    // Enrich existing bulletins and track vitality
    const enriched = [];
    const usedTargetNames = new Set();

    for (const b of rawBulletins) {
      if (!b.target_name || !b.target_city) {
        enriched.push(b);
        continue;
      }

      usedTargetNames.add(b.target_name.toLowerCase());

      // Search DB for target character
      const cleanKeyword = b.target_name.replace(/^(Operative|Major|Doctor|Dr\.)\s+/i, '').trim();
      // Also check inner codename if present like 'Kestrel'
      const codenameMatch = b.target_name.match(/'([^']+)'/);
      const searchTerms = [cleanKeyword];
      if (codenameMatch && codenameMatch[1]) searchTerms.push(codenameMatch[1]);

      let targetChar = null;
      for (const term of searchTerms) {
        const { data: found } = await supabase
          .from('characters')
          .select('id, name, is_alive, current_city_id, credits, killed_by_account_id, killed_at')
          .ilike('name', `%${term}%`)
          .limit(1);
        if (found && found.length > 0) {
          targetChar = found[0];
          break;
        }
      }

      // If missing and bulletin was marked active, spawn the NPC
      if (!targetChar && b.is_active) {
        const cityMatch = cities.find(c => c.name.toLowerCase() === b.target_city.toLowerCase()) || cities[0];
        const safeHandle = cleanKeyword.replace(/[^a-zA-Z0-9]/g, '');
        const spec = {
          name: b.target_name,
          dark_web_handle: safeHandle.substring(0, 16) || 'Mark',
          email: `${safeHandle.toLowerCase()}.${Date.now().toString().slice(-4)}@shadowgrid.io`,
          city_id: cityMatch.id,
          credits: b.bounty_credits || 50000,
          max_ap: 8,
          current_ap: 8
        };

        try {
          const spawned = await createNpcOperative(spec, preloaded);
          targetChar = {
            id: spawned.id,
            name: spawned.name,
            is_alive: true,
            current_city_id: cityMatch.id,
            credits: spawned.credits
          };
          console.log(`[ContractService] Spawned missing NPC '${b.target_name}' in ${b.target_city}`);
        } catch (err) {
          console.error(`[ContractService] Failed spawning NPC for '${b.target_name}':`, err.message);
        }
      }

      // Vital status & Killer attribution
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
        target_status: isFulfilled ? 'LIQUIDATED' : (targetChar ? 'ACTIVE' : 'ACTIVE'),
        current_city_name: currentCity?.name || b.target_city,
        killer_name: killerHandle,
        is_active: isFulfilled ? false : b.is_active,
        bounty_credits: b.bounty_credits
      });
    }

    // Count currently live contracts (target is alive and contract is active)
    const liveContracts = enriched.filter(
      b => b.target_name && b.target_status === 'ACTIVE' && b.is_active !== false
    );

    console.log(`[ContractService] Current live contracts: ${liveContracts.length} / ${MAX_LIVE_CONTRACTS}`);

    // If live contracts < MAX_LIVE_CONTRACTS, replenish!
    if (liveContracts.length < MAX_LIVE_CONTRACTS) {
      const toGenerate = MAX_LIVE_CONTRACTS - liveContracts.length;
      console.log(`[ContractService] Replenishing ${toGenerate} live contract(s)...`);

      for (let i = 0; i < toGenerate; i++) {
        // Find an unused template or create procedural
        let newContractData = null;
        for (const tmpl of CONTRACT_TEMPLATES) {
          if (!usedTargetNames.has(tmpl.target_name.toLowerCase())) {
            newContractData = {
              id: `b-${Date.now()}-${i}`,
              ...tmpl,
              is_active: true,
              created_at: new Date().toISOString()
            };
            usedTargetNames.add(tmpl.target_name.toLowerCase());
            break;
          }
        }

        // If all templates used, create procedural
        if (!newContractData) {
          newContractData = generateProceduralContract(usedTargetNames, cities);
          usedTargetNames.add(newContractData.target_name.toLowerCase());
        }

        // Spawn the corresponding NPC operative in the DB
        const cityMatch = cities.find(c => c.name.toLowerCase() === newContractData.target_city.toLowerCase()) || cities[0];
        const cleanName = newContractData.target_name.replace(/[^a-zA-Z0-9]/g, '');
        const spec = {
          name: newContractData.target_name,
          dark_web_handle: cleanName.substring(0, 16) || 'Target',
          email: `${cleanName.toLowerCase()}.${Date.now().toString().slice(-4)}@shadowgrid.io`,
          city_id: cityMatch.id,
          credits: newContractData.bounty_credits || 50000,
          max_ap: 8,
          current_ap: 8
        };

        try {
          const spawned = await createNpcOperative(spec, preloaded);
          const fullNewContract = {
            ...newContractData,
            target_character_id: spawned.id,
            target_is_alive: true,
            target_status: 'ACTIVE',
            current_city_name: cityMatch.name,
            killer_name: null,
            is_active: true
          };
          enriched.unshift(fullNewContract);
          console.log(`[ContractService] Generated & spawned new contract target '${fullNewContract.target_name}' in ${cityMatch.name} (Bounty: ${fullNewContract.bounty_credits} CHF)`);
        } catch (err) {
          console.error(`[ContractService] Failed to spawn procedural target:`, err.message);
        }
      }
    }

    // Save updated bulletin state
    saveStoredBulletins(enriched);

    // Return the final list:
    // Limit live contracts to at most MAX_LIVE_CONTRACTS, plus recent completed contracts and general advisories
    const activeContracts = enriched.filter(b => b.target_name && b.target_status === 'ACTIVE').slice(0, MAX_LIVE_CONTRACTS);
    const completedContracts = enriched.filter(b => b.target_name && b.target_status === 'LIQUIDATED').slice(0, 4);
    const advisories = enriched.filter(b => !b.target_name);

    return [...activeContracts, ...completedContracts, ...advisories];
  } catch (err) {
    console.error('[ContractService] Error in syncAndReplenishContracts:', err);
    return loadStoredBulletins();
  }
}

// ── VENDETTA & RETALIATION BOUNTY SYSTEM ──────────────────────
const VENDETTAS_FILE = path.join(__dirname, '..', '..', 'scratch', 'vendettas_store.json');

const RETALIATION_FACTIONS = [
  'The Geneva Diamond Syndicate',
  'The Arbat Bratva',
  'The Antwerp Shadow Cell',
  'The Kowloon Triad Union',
  'Private Swiss Escrow Circle',
  'The Zurich Blind Trust Creditors',
  'A Private High-Value Patron',
  'The Corsican Brotherhood'
];

const ISSUER_ARCHETYPES = [
  {
    name: 'Don Valerio Corvin',
    handle: 'Corvinus',
    faction: 'The Geneva Diamond Syndicate',
    city: 'Geneva',
    dialogue: 'A debt in blood cannot be washed away with excuses. Deliver retribution, or make proper amends.'
  },
  {
    name: 'Boss Viktor Chen',
    handle: 'RedDragon',
    faction: 'The Kowloon Triad Union',
    city: 'Hong Kong',
    dialogue: 'Disrespecting our syndicate carries a severe toll. Neutralize the asset.'
  },
  {
    name: 'Directrice Elena Rostova',
    handle: 'BlackWidow',
    faction: 'The Zurich Blind Trust Creditors',
    city: 'Zurich',
    dialogue: 'Our investment suffered catastrophic loss through this unauthorized violence. The balance will be settled.'
  },
  {
    name: 'Enforcer Raymond Mercer',
    handle: 'IronGrip',
    faction: 'The Arbat Bratva',
    city: 'Moscow',
    dialogue: 'Nobody touches one of our operatives and walks away unbothered. Find them and bury them.'
  },
  {
    name: 'Baron Henri Moreau',
    handle: 'LeSpectre',
    faction: 'The Corsican Brotherhood',
    city: 'Marseille',
    dialogue: 'Honor demands restitution. Either my contractors collect their skull, or their Swiss accounts bleed.'
  },
  {
    name: 'Fixer Julian Cross',
    handle: 'BlindBroker',
    faction: 'Private Swiss Escrow Circle',
    city: 'Bern',
    dialogue: 'This was an unsanctioned transgression against our contracted courier. The bounty stands until settled.'
  }
];

/**
 * Ensure the contract issuing NPC exists in the characters table.
 */
async function ensureIssuerNpc(archetype, preloaded = {}) {
  try {
    const cleanKeyword = archetype.name.replace(/^(Don|Boss|Directrice|Enforcer|Baron|Fixer)\s+/i, '').trim();
    const { data: existing } = await supabase
      .from('characters')
      .select('id, name, is_alive, current_city_id, credits')
      .ilike('name', `%${cleanKeyword}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    // Spawn the issuer NPC in their home sector
    const cities = preloaded.cities || [];
    const targetCity = cities.find(c => c.name.toLowerCase() === archetype.city.toLowerCase()) || cities[0];

    const safeHandle = archetype.handle.replace(/[^a-zA-Z0-9]/g, '');
    const spec = {
      name: archetype.name,
      dark_web_handle: safeHandle,
      email: `${safeHandle.toLowerCase()}.patron@shadowgrid.io`,
      city_id: targetCity ? targetCity.id : undefined,
      credits: 175000,
      max_ap: 10,
      current_ap: 10
    };

    const created = await createNpcOperative(spec, preloaded);
    console.log(`[ContractService] Successfully spawned contract issuer NPC '${archetype.name}' in ${archetype.city} (ID: ${created.id})`);
    return {
      id: created.id,
      name: created.name,
      is_alive: true,
      current_city_id: targetCity ? targetCity.id : created.current_city_id,
      credits: created.credits
    };
  } catch (err) {
    console.error('[ContractService] Failed to ensure issuer NPC:', err.message);
    return null;
  }
}

function loadStoredVendettas() {
  try {
    if (fs.existsSync(VENDETTAS_FILE)) {
      const raw = fs.readFileSync(VENDETTAS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[ContractService] Could not read vendettas store:', err.message);
  }
  return [];
}

function saveStoredVendettas(vendettas) {
  try {
    const dir = path.dirname(VENDETTAS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(VENDETTAS_FILE, JSON.stringify(vendettas, null, 2), 'utf8');
  } catch (err) {
    console.error('[ContractService] Failed to save vendettas:', err.message);
  }
}

/**
 * Check if a given target character is currently one of the 5 official Sedes Obscura contracts
 */
function isOfficialContract(targetId, targetName) {
  try {
    const bulletins = loadStoredBulletins();
    const liveOfficial = bulletins.filter(
      b => b.target_name && b.is_active && (b.category === 'EXCOMMUNICADO' || b.category === 'PROSCRIPTION')
    );
    return liveOfficial.some(b => {
      if (targetId && b.target_character_id === targetId) return true;
      if (targetName && b.target_name && b.target_name.toLowerCase().includes(targetName.toLowerCase())) return true;
      if (targetName && b.target_name && targetName.toLowerCase().includes(b.target_name.toLowerCase())) return true;
      return false;
    });
  } catch {
    return false;
  }
}

/**
 * Trigger or escalate a private Vendetta bounty against a player character who attacked recklessly / without an official contract.
 */
async function triggerVendettaBounty({ attacker, target, attackerCity, targetCity, outcome }) {
  try {
    if (!attacker || !target) return null;

    // 1. If target was an official Sedes Obscura contract, this strike was legitimate contract work!
    if (isOfficialContract(target.id, target.name)) {
      console.log(`[ContractService] Target '${target.name}' is an official contract. No private vendetta triggered.`);
      return null;
    }

    // 2. Otherwise, this was an unsanctioned or reckless assault on an operative.
    // Victim's associates / syndicate crew post or escalate a private vendetta!
    const vendettas = loadStoredVendettas();
    const attackerCityName = attackerCity?.name || 'Sector Unknown';
    const incidentCityName = targetCity?.name || 'Local Sector';

    // Fetch preloaded cities/professions for NPC issuer generation
    const [citiesRes, profsRes, skillsRes] = await Promise.all([
      supabase.from('cities').select('id, name, country, continent'),
      supabase.from('professions').select('id, name, credits_per_week, ap_modifier, schedule_type').order('name'),
      supabase.from('skills').select('id, name, category, range, base_ap_cost, base_credit_cost').order('name')
    ]);
    const preloaded = {
      cities: citiesRes.data || [],
      professions: profsRes.data || [],
      skills: skillsRes.data || []
    };

    // Check if an active vendetta already exists for this attacker
    const existingIndex = vendettas.findIndex(
      v => (v.target_character_id === attacker.id || v.target_name.toLowerCase() === attacker.name.toLowerCase()) && v.is_active
    );

    if (existingIndex !== -1) {
      // Escalate existing vendetta bounty!
      const v = vendettas[existingIndex];
      const escalationBump = 25000;
      v.bounty_credits = (v.bounty_credits || 35000) + escalationBump;
      v.escalation_count = (v.escalation_count || 1) + 1;
      v.settlement_cost = Math.round(v.bounty_credits * 0.65);
      v.priority = 'CRITICAL';
      v.target_city = attackerCityName;
      v.body = `NOTICE OF ESCALATED BLOOD DEBT: ${v.issued_by} has increased the private bounty on operative ${attacker.name} (+${escalationBump} CHF) following repeated reckless violence against ${target.name} in ${incidentCityName}. The Sedes Obscura Grand Chancellery remains neutral, but private escrow has been verified.`;
      v.updated_at = new Date().toISOString();
      saveStoredVendettas(vendettas);
      console.log(`[ContractService] Escalated private vendetta on '${attacker.name}' to ${v.bounty_credits} CHF`);
      return v;
    }

    // Pick an issuer archetype and spawn/ensure the real NPC character in Supabase
    const archetype = ISSUER_ARCHETYPES[Math.floor(Math.random() * ISSUER_ARCHETYPES.length)];
    const issuerNpc = await ensureIssuerNpc(archetype, preloaded);
    const issuerCity = preloaded.cities.find(c => c.id === issuerNpc?.current_city_id)?.name || archetype.city;
    const issuerTitle = `${archetype.name} (${archetype.faction})`;

    // Create a new private vendetta contract
    const baseBounty = 35000 + Math.floor(Math.random() * 15000); // 35,000 - 50,000 CHF
    const settlementCost = Math.round(baseBounty * 0.65); // 65% of bounty to settle via blood-money

    const newVendetta = {
      id: `v-${Date.now()}`,
      category: 'VENDETTA',
      priority: 'ELEVATED',
      title: `PRIVATE VENDETTA // CONTRACT ON ${attacker.name.toUpperCase()}`,
      target_name: attacker.name,
      target_character_id: attacker.id,
      target_city: attackerCityName,
      target_status: 'ACTIVE',
      bounty_credits: baseBounty,
      issued_by: issuerTitle,
      // Real NPC linked to the contract
      issuer_npc_character_id: issuerNpc?.id || null,
      issuer_npc_name: archetype.name,
      issuer_npc_handle: archetype.handle,
      issuer_npc_city_name: issuerCity,
      issuer_npc_city_id: issuerNpc?.current_city_id || null,
      issuer_faction: archetype.faction,
      issuer_npc_is_alive: true,
      issuer_dialogue: archetype.dialogue,
      settlement_cost: settlementCost,
      negotiation_ap_cost: 20,
      cease_reason: null, // 'ISSUER_ELIMINATED' | 'RESTITUTION_PAID' | 'DIPLOMATIC_TRUCE' | 'MARK_LIQUIDATED'
      victim_name: target.name,
      victim_character_id: target.id,
      incident_city: incidentCityName,
      body: `NOTICE OF PRIVATE CONTRACT: ${issuerTitle} has placed an open blood-debt bounty on operative ${attacker.name}. Following an unprovoked strike against ${target.name} in ${incidentCityName}, private escrow has been deposited. To cease this contract, the target must eliminate patron ${archetype.name} in ${issuerCity}, pay ${settlementCost.toLocaleString()} CHF in restitution, or negotiate an underworld truce.`,
      is_active: true,
      created_at: new Date().toISOString(),
      escalation_count: 1
    };

    vendettas.unshift(newVendetta);
    saveStoredVendettas(vendettas);
    console.log(`[ContractService] Placed new private vendetta bounty on '${attacker.name}' for ${baseBounty} CHF by '${issuerTitle}' (NPC ID: ${issuerNpc?.id})`);
    return newVendetta;
  } catch (err) {
    console.error('[ContractService] Error triggering vendetta bounty:', err);
    return null;
  }
}

/**
 * When an operative is killed, check if they were the target of an active Vendetta bounty.
 * If yes, mark it fulfilled/liquidated and award the private escrow bounty to the killer!
 */
async function resolveVendettaKill(targetCharacterId, killerAccountId) {
  try {
    if (!targetCharacterId) return 0;
    const vendettas = loadStoredVendettas();
    const v = vendettas.find(v => v.target_character_id === targetCharacterId && v.is_active);
    if (!v) return 0;

    v.is_active = false;
    v.target_status = 'LIQUIDATED';
    v.cease_reason = 'MARK_LIQUIDATED';
    v.resolved_at = new Date().toISOString();

    let killerHandle = 'CLASSIFIED OPERATIVE';
    if (killerAccountId) {
      try {
        const { data: killerAcc } = await supabase
          .from('accounts')
          .select('dark_web_handle')
          .eq('id', killerAccountId)
          .maybeSingle();
        if (killerAcc?.dark_web_handle) killerHandle = killerAcc.dark_web_handle;
      } catch {}
    }

    v.killer_name = killerHandle;
    saveStoredVendettas(vendettas);
    console.log(`[ContractService] Vendetta on '${v.target_name}' resolved by '${killerHandle}'. Award: ${v.bounty_credits} CHF`);
    return v.bounty_credits || 0;
  } catch (err) {
    console.error('[ContractService] Error resolving vendetta kill:', err);
    return 0;
  }
}

/**
 * When ANY character is assassinated, check if they were the issuing NPC patron for any active contracts.
 * If the contract issuer is killed, the contract ceases immediately!
 */
async function checkAndRevokeVendettasForKilledIssuer(killedCharacterId, killerAccountId) {
  try {
    if (!killedCharacterId) return [];
    const vendettas = loadStoredVendettas();
    const revoked = [];

    let killerHandle = 'Classified Operative';
    if (killerAccountId) {
      try {
        const { data: killerAcc } = await supabase
          .from('accounts')
          .select('dark_web_handle')
          .eq('id', killerAccountId)
          .maybeSingle();
        if (killerAcc?.dark_web_handle) killerHandle = killerAcc.dark_web_handle;
      } catch {}
    }

    for (const v of vendettas) {
      if (v.is_active && v.issuer_npc_character_id === killedCharacterId) {
        v.is_active = false;
        v.target_status = 'VOIDED';
        v.cease_reason = 'ISSUER_ELIMINATED';
        v.issuer_npc_is_alive = false;
        v.killer_name = killerHandle;
        v.resolved_at = new Date().toISOString();
        v.body += ` // CONTRACT CEASED: Contract patron ${v.issuer_npc_name} was eliminated in ${v.issuer_npc_city_name} by ${killerHandle}. Escrow revoked.`;
        revoked.push(v);

        // Best effort: Log news ticker event
        try {
          await supabase.from('ticker_events').insert({
            event_type: 'contract_voided',
            city_id: v.issuer_npc_city_id || null,
            message: `CONTRACT CEASED // PATRON ELIMINATED: Contract issuer ${v.issuer_npc_name} (${v.issuer_faction}) was liquidated. Private vendetta against ${v.target_name} is dissolved.`
          });
        } catch {}
      }
    }

    if (revoked.length > 0) {
      saveStoredVendettas(vendettas);
      console.log(`[ContractService] Revoked ${revoked.length} vendetta(s) due to elimination of issuer ${killedCharacterId}`);
    }

    return revoked;
  } catch (err) {
    console.error('[ContractService] Error checking revoked vendettas for killed issuer:', err);
    return [];
  }
}

/**
 * Periodically or on request: Synchronize vital status of contract issuing NPCs.
 * If an issuer was killed in the world, cease the contract.
 */
async function syncVendettaVitality() {
  try {
    const vendettas = loadStoredVendettas();
    const activeVendettas = vendettas.filter(v => v.is_active && v.issuer_npc_character_id);
    if (activeVendettas.length === 0) return vendettas;

    const issuerIds = [...new Set(activeVendettas.map(v => v.issuer_npc_character_id))];
    const { data: chars } = await supabase
      .from('characters')
      .select('id, name, is_alive, current_city_id, killed_by_account_id')
      .in('id', issuerIds);

    if (!chars || chars.length === 0) return vendettas;

    let modified = false;
    for (const v of activeVendettas) {
      const char = chars.find(c => c.id === v.issuer_npc_character_id);
      if (char) {
        v.issuer_npc_is_alive = char.is_alive;
        if (!char.is_alive) {
          v.is_active = false;
          v.target_status = 'VOIDED';
          v.cease_reason = 'ISSUER_ELIMINATED';
          v.resolved_at = new Date().toISOString();
          v.body += ` // CONTRACT CEASED: Contract patron ${v.issuer_npc_name} was assassinated. Bounties nullified.`;
          modified = true;
        }
      }
    }

    if (modified) {
      saveStoredVendettas(vendettas);
    }
    return vendettas;
  } catch (err) {
    console.error('[ContractService] Error in syncVendettaVitality:', err.message);
    return loadStoredVendettas();
  }
}

/**
 * Path B: Pacify the contract issuer by paying blood-money restitution.
 */
async function pacifyVendettaWithRestitution({ vendettaId, accountId }) {
  const vendettas = loadStoredVendettas();
  const v = vendettas.find(v => v.id === vendettaId);
  if (!v) {
    throw new Error('Vendetta contract not found');
  }
  if (!v.is_active) {
    throw new Error('This contract is already closed or inactive');
  }

  // Get caller's active character
  const { data: character, error: charErr } = await supabase
    .from('characters')
    .select('id, name, credits')
    .eq('account_id', accountId)
    .eq('is_alive', true)
    .single();

  if (charErr || !character) {
    throw new Error('Active player character not found');
  }

  const cost = v.settlement_cost || Math.round((v.bounty_credits || 40000) * 0.65);
  if (character.credits < cost) {
    throw new Error(`Insufficient Swiss Francs. Blood-money settlement requires ${cost.toLocaleString()} CHF (you have ${character.credits.toLocaleString()} CHF).`);
  }

  // Deduct credits from player character
  const newCredits = character.credits - cost;
  await supabase
    .from('characters')
    .update({ credits: newCredits })
    .eq('id', character.id);

  // Record banking ledger
  try {
    await supabase.from('bank_transactions').insert({
      account_id: accountId,
      character_id: character.id,
      transaction_type: 'blood_debt_restitution',
      amount: -cost,
      description: `Restitution paid to ${v.issuer_npc_name || 'Syndicate Patron'} (${v.issuer_faction || 'Underworld'}) to revoke vendetta contract.`,
      balance_after: newCredits
    });
  } catch {}

  // Update vendetta status to PACIFIED
  v.is_active = false;
  v.target_status = 'PACIFIED';
  v.cease_reason = 'RESTITUTION_PAID';
  v.resolved_at = new Date().toISOString();
  v.body += ` // CEASEFIRE CONFIRMED: Operative ${character.name} paid ${cost.toLocaleString()} CHF in blood-money restitution to patron ${v.issuer_npc_name}. All bounties officially revoked.`;
  saveStoredVendettas(vendettas);

  // Broadcast news ticker event
  try {
    await supabase.from('ticker_events').insert({
      event_type: 'ceasefire_signed',
      city_id: v.issuer_npc_city_id || null,
      message: `CEASEFIRE ACCORD: Operative ${character.name} paid ${cost.toLocaleString()} CHF restitution to ${v.issuer_npc_name} (${v.issuer_faction}). Underworld bounty lifted.`
    });
  } catch {}

  return {
    success: true,
    message: `Ceasefire treaty ratified. You transferred ${cost.toLocaleString()} CHF in blood money to ${v.issuer_npc_name}. The contract on your life has been permanently cancelled.`,
    remaining_credits: newCredits,
    vendetta: v
  };
}

/**
 * Path C: Negotiate with the NPC patron using AP and diplomatic tradecraft.
 */
async function negotiateVendettaCeasefire({ vendettaId, accountId }) {
  const vendettas = loadStoredVendettas();
  const v = vendettas.find(v => v.id === vendettaId);
  if (!v) {
    throw new Error('Vendetta contract not found');
  }
  if (!v.is_active) {
    throw new Error('This contract is already closed or inactive');
  }

  // Get caller's active character
  const { data: character, error: charErr } = await supabase
    .from('characters')
    .select('id, name')
    .eq('account_id', accountId)
    .eq('is_alive', true)
    .single();

  if (charErr || !character) {
    throw new Error('Active player character not found');
  }

  // Check AP
  const { data: apRow } = await supabase
    .from('action_points')
    .select('current_ap')
    .eq('character_id', character.id)
    .single();

  const apCost = v.negotiation_ap_cost || 20;
  if (!apRow || apRow.current_ap < apCost) {
    throw new Error(`Insufficient Action Points. Backchannel diplomatic negotiation requires ${apCost} AP (you have ${apRow?.current_ap || 0} AP).`);
  }

  // Deduct AP
  const newAp = apRow.current_ap - apCost;
  await supabase
    .from('action_points')
    .update({ current_ap: newAp, updated_at: new Date().toISOString() })
    .eq('character_id', character.id);

  // Update vendetta status to PACIFIED via diplomacy
  v.is_active = false;
  v.target_status = 'PACIFIED';
  v.cease_reason = 'DIPLOMATIC_TRUCE';
  v.resolved_at = new Date().toISOString();
  v.body += ` // DIPLOMATIC TRUCE: Operative ${character.name} negotiated an underworld truce with patron ${v.issuer_npc_name}. The syndicate has agreed to withdraw all active assassination orders.`;
  saveStoredVendettas(vendettas);

  // Broadcast news ticker event
  try {
    await supabase.from('ticker_events').insert({
      event_type: 'diplomatic_truce',
      city_id: v.issuer_npc_city_id || null,
      message: `DIPLOMATIC TRUCE: Operative ${character.name} reached a mediated underworld accord with patron ${v.issuer_npc_name} (${v.issuer_faction}). Bounty withdrawn.`
    });
  } catch {}

  return {
    success: true,
    message: `Diplomatic accord finalized! Through clandestine leverage and mediation, you convinced patron ${v.issuer_npc_name} to nullify the contract.`,
    remaining_ap: newAp,
    vendetta: v
  };
}

/**
 * Retrieve active and recent resolved vendetta contracts
 */
function getActiveVendettas() {
  const vendettas = loadStoredVendettas();
  
  // Ensure legacy records have issuer details populated
  let updated = false;
  for (const v of vendettas) {
    if (!v.issuer_npc_name) {
      const arch = ISSUER_ARCHETYPES[0];
      v.issuer_npc_name = arch.name;
      v.issuer_npc_handle = arch.handle;
      v.issuer_npc_city_name = arch.city;
      v.issuer_faction = arch.faction;
      v.issuer_npc_is_alive = true;
      v.settlement_cost = Math.round((v.bounty_credits || 40000) * 0.65);
      v.negotiation_ap_cost = 20;
      updated = true;
    }
  }
  if (updated) saveStoredVendettas(vendettas);

  const active = vendettas.filter(v => v.is_active);
  const liquidated = vendettas.filter(v => !v.is_active).slice(0, 5);
  return [...active, ...liquidated];
}

/**
 * Retrieve active vendetta specifically for a given character ID or name
 */
function getVendettaForCharacter(characterId, characterName) {
  const vendettas = loadStoredVendettas();
  return vendettas.find(
    v => v.is_active && (
      (characterId && v.target_character_id === characterId) ||
      (characterName && v.target_name.toLowerCase() === characterName.toLowerCase())
    )
  ) || null;
}

module.exports = {
  MAX_LIVE_CONTRACTS,
  syncAndReplenishContracts,
  loadStoredBulletins,
  isOfficialContract,
  triggerVendettaBounty,
  resolveVendettaKill,
  checkAndRevokeVendettasForKilledIssuer,
  syncVendettaVitality,
  pacifyVendettaWithRestitution,
  negotiateVendettaCeasefire,
  getActiveVendettas,
  getVendettaForCharacter,
  loadStoredVendettas
};
