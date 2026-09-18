const bcrypt = require('bcryptjs');
const supabase = require('./supabase');

const FIRST_NAMES = [
  'Alexander', 'Elena', 'Viktor', 'Natasha', 'Dmitri', 'Maya', 'Sebastian', 'Cassian',
  'Leila', 'Darius', 'Kira', 'Leon', 'Astrid', 'Julian', 'Rowan', 'Valeria',
  'Gideon', 'Sora', 'Corin', 'Talia', 'Zane', 'Vesper', 'Nikolai', 'Roxanne',
  'Damian', 'Seraphina', 'Kaelen', 'Morrigan', 'Ronan', 'Camilla', 'Malik', 'Freya'
];

const LAST_NAMES = [
  'Vance', 'Cross', 'Rostova', 'Mercer', 'Blackwood', 'Chen', 'Sterling', 'Kovacs',
  'Sinclair', 'Voss', 'Holloway', 'Moreau', 'Novak', 'Drake', 'Steele', 'Hawthorne',
  'Winters', 'Monroe', 'Frost', 'Graves', 'Bishop', 'Carver', 'Strand', 'Ashford',
  'Petrov', 'Lindqvist', 'Nakamura', 'Volkov', 'Sloane', 'Sinclair', 'Castillo'
];

const CODENAMES = [
  'Viper', 'Cipher', 'Specter', 'Revenant', 'Wraith', 'Onyx', 'Apex', 'Zero',
  'Echo', 'Falcon', 'Kestrel', 'Nemesis', 'Mirage', 'Blackbird', 'Scythe', 'Hydra',
  'Valkyrie', 'Phantom', 'Gargoyle', 'Ronin', 'Eclipse', 'Havoc', 'Tempest', 'Obsidian',
  'Archon', 'Rook', 'Banshee', 'Ghost', 'Sentinel', 'Vanguard', 'Specter', 'Razor'
];

const DOMAINS = [
  'shadowgrid.io', 'darknet-node.org', 'tag-ops.net', 'ciphermail.ch', 'ghostlink.net', 'apex-syndicate.org'
];

function getRandomItem(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSample(arr, count) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function generateSwissBankNumber(handle) {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const letters = (handle || 'NPCX')
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
  return `SB-${digits}-${letters}`;
}

/**
 * Generate a randomized NPC specification, respecting any user-provided overrides.
 */
function generateRandomNpcSpec(options = {}, preloaded = {}) {
  const { cities = [], professions = [], skills = [] } = preloaded;

  const firstName = getRandomItem(FIRST_NAMES) || 'Operative';
  const lastName = getRandomItem(LAST_NAMES) || 'Agent';
  const rawHandle = getRandomItem(CODENAMES) || 'Shadow';
  const handleSuffix = Math.floor(10 + Math.random() * 90);
  const codename = options.dark_web_handle && options.dark_web_handle.trim() !== ''
    ? options.dark_web_handle.trim()
    : `${rawHandle}-${handleSuffix}`;

  const defaultName = `${firstName} ${lastName}`;
  const name = options.name && options.name.trim() !== '' ? options.name.trim() : defaultName;

  const domain = getRandomItem(DOMAINS) || 'tag-ops.net';
  const cleanHandle = codename.toLowerCase().replace(/[^a-z0-9]/g, '');
  const defaultEmail = `${cleanHandle}.${Math.floor(100 + Math.random() * 900)}@${domain}`;
  const email = options.email && options.email.trim() !== '' ? options.email.trim() : defaultEmail;

  // City selection
  const selectedCity = options.city_id
    ? cities.find(c => c.id === options.city_id) || getRandomItem(cities)
    : getRandomItem(cities);
  const city_id = selectedCity?.id;

  // Profession selection
  const selectedProfession = options.profession_id
    ? professions.find(p => p.id === options.profession_id) || getRandomItem(professions)
    : getRandomItem(professions);
  const profession_id = selectedProfession?.id;

  // AP Calculation (base_ap 4 + profession modifier)
  const apModifier = selectedProfession?.ap_modifier || 0;
  const maxAp = Math.max(1, 4 + apModifier);
  const currentAp = options.current_ap !== undefined && options.current_ap !== null
    ? Math.max(0, parseInt(options.current_ap, 10))
    : maxAp;

  // Credits calculation
  const credits = options.credits !== undefined && options.credits !== null
    ? Math.max(0, parseInt(options.credits, 10))
    : 500;

  // Skills pools
  const assSkillsPool = skills.filter(s => s.category === 'assassination');
  const intelSkillsPool = skills.filter(s => s.category === 'intel');

  const assassination_skills = options.assassination_skills && Array.isArray(options.assassination_skills) && options.assassination_skills.length === 3
    ? options.assassination_skills
    : getRandomSample(assSkillsPool, 3).map(s => s.id);

  const defensive_skills = options.defensive_skills && Array.isArray(options.defensive_skills) && options.defensive_skills.length === 10
    ? options.defensive_skills
    : getRandomSample(assSkillsPool, 10).map(s => s.id);

  const intel_skills = options.intel_skills && Array.isArray(options.intel_skills) && options.intel_skills.length === 3
    ? options.intel_skills
    : getRandomSample(intelSkillsPool, 3).map(s => s.id);

  const counter_intel_skills = options.counter_intel_skills && Array.isArray(options.counter_intel_skills) && options.counter_intel_skills.length === 10
    ? options.counter_intel_skills
    : getRandomSample(intelSkillsPool, 10).map(s => s.id);

  return {
    name,
    dark_web_handle: codename,
    email,
    city_id,
    profession_id,
    current_ap: currentAp,
    max_ap: options.max_ap ? parseInt(options.max_ap, 10) : maxAp,
    credits,
    assassination_skills,
    defensive_skills,
    intel_skills,
    counter_intel_skills,
  };
}

/**
 * Persist a single NPC operative into the database (Account, Character, AP, and Character Skills).
 */
async function createNpcOperative(spec, preloaded = {}) {
  const { cities = [], professions = [], skills = [] } = preloaded;

  // 1. Ensure unique email and handle
  let finalEmail = spec.email;
  let finalHandle = spec.dark_web_handle;

  const { data: existingEmail } = await supabase
    .from('accounts')
    .select('id')
    .eq('email', finalEmail)
    .maybeSingle();

  if (existingEmail) {
    const salt = Math.floor(1000 + Math.random() * 9000);
    const parts = finalEmail.split('@');
    finalEmail = `${parts[0]}_${salt}@${parts[1] || 'tag-ops.net'}`;
  }

  const { data: existingHandle } = await supabase
    .from('accounts')
    .select('id')
    .eq('dark_web_handle', finalHandle)
    .maybeSingle();

  if (existingHandle) {
    finalHandle = `${finalHandle}_${Math.floor(100 + Math.random() * 900)}`;
  }

  // 2. Cryptographic lock: NPCs do not have credentials and cannot be logged into directly.
  // Storing a non-bcrypt prefix ensures bcrypt.compare will never validate for any password.
  const password_hash = '!LOCKED_NPC_AUTONOMOUS_OPERATIVE';
  const swiss_bank_number = generateSwissBankNumber(finalHandle);

  // 3. Create Account
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .insert({
      email: finalEmail,
      password_hash,
      dark_web_handle: finalHandle,
      swiss_bank_number,
      gold_coins: 0,
      death_count: 0,
      created_at: new Date().toISOString(),
    })
    .select('id, email, dark_web_handle, swiss_bank_number, gold_coins, death_count, created_at')
    .single();

  if (accError || !account) {
    throw new Error(`Failed to create NPC account: ${accError?.message || 'Unknown error'}`);
  }

  // 4. Validate city and profession
  let cityId = spec.city_id;
  if (!cityId && cities.length > 0) {
    cityId = cities[0].id;
  }

  let professionId = spec.profession_id;
  if (!professionId && professions.length > 0) {
    professionId = professions[0].id;
  }

  const professionObj = professions.find(p => p.id === professionId);
  const apMod = professionObj?.ap_modifier || 0;
  const calculatedMaxAp = Math.max(1, 4 + apMod);
  const maxAp = spec.max_ap !== undefined ? parseInt(spec.max_ap, 10) : calculatedMaxAp;
  const currentAp = spec.current_ap !== undefined ? parseInt(spec.current_ap, 10) : maxAp;
  const credits = spec.credits !== undefined ? parseInt(spec.credits, 10) : 500;

  // 5. Create Character
  const { data: character, error: charError } = await supabase
    .from('characters')
    .insert({
      account_id: account.id,
      name: spec.name,
      player_type: 'NPC',
      is_alive: true,
      credits,
      current_city_id: cityId,
      profession_id: professionId,
      travel_status: 'arrived',
      kill_count: 0,
      intel_sold_count: 0,
      items_sold_count: 0,
      survival_days: 0,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (charError || !character) {
    // Attempt account cleanup if character fails
    await supabase.from('accounts').delete().eq('id', account.id);
    throw new Error(`Failed to create NPC character: ${charError?.message || 'Unknown error'}`);
  }

  // 6. Create Action Points
  const { data: apRow, error: apError } = await supabase
    .from('action_points')
    .insert({
      character_id: character.id,
      current_ap: currentAp,
      max_ap: maxAp,
      last_regen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (apError) {
    console.error('NPC action_points insert error:', apError);
  }

  // 7. Create Character Skills (exact human player slots: 3 ass, 10 def, 3 intel, 10 counter)
  const assSkillsPool = skills.filter(s => s.category === 'assassination');
  const intelSkillsPool = skills.filter(s => s.category === 'intel');

  let assIds = spec.assassination_skills;
  if (!assIds || assIds.length !== 3) {
    assIds = getRandomSample(assSkillsPool, 3).map(s => s.id);
  }

  let defIds = spec.defensive_skills;
  if (!defIds || defIds.length !== 10) {
    defIds = getRandomSample(assSkillsPool, 10).map(s => s.id);
  }

  let intelIds = spec.intel_skills;
  if (!intelIds || intelIds.length !== 3) {
    intelIds = getRandomSample(intelSkillsPool, 3).map(s => s.id);
  }

  let counterIds = spec.counter_intel_skills;
  if (!counterIds || counterIds.length !== 10) {
    counterIds = getRandomSample(intelSkillsPool, 10).map(s => s.id);
  }

  const skillInserts = [
    ...assIds.map(skill_id => ({ character_id: character.id, skill_id, pool: 'assassination' })),
    ...defIds.map(skill_id => ({ character_id: character.id, skill_id, pool: 'defensive' })),
    ...intelIds.map(skill_id => ({ character_id: character.id, skill_id, pool: 'intel' })),
    ...counterIds.map(skill_id => ({ character_id: character.id, skill_id, pool: 'counter_intel' })),
  ];

  const { error: skillsError } = await supabase
    .from('character_skills')
    .insert(skillInserts);

  if (skillsError) {
    console.error('NPC character_skills insert error:', skillsError);
  }

  // 8. Log initial swiss bank transaction
  if (credits > 0) {
    try {
      await supabase
        .from('bank_transactions')
        .insert({
          to_account_id: account.id,
          amount: credits,
          currency: 'credits',
          reason: 'initial_deposit',
          created_at: new Date().toISOString(),
        });
    } catch (txErr) {
      console.warn('NPC bank transaction log skipped:', txErr);
    }
  }

  return {
    id: character.id,
    name: character.name,
    credits: character.credits,
    is_alive: character.is_alive,
    travel_status: character.travel_status,
    kill_count: character.kill_count,
    created_at: character.created_at,
    current_city_id: character.current_city_id,
    profession_id: character.profession_id,
    cities: cities.find(c => c.id === character.current_city_id) || null,
    professions: professionObj || null,
    action_points: apRow || { current_ap: currentAp, max_ap: maxAp },
    accounts: account,
    skills_count: skillInserts.length,
  };
}

/**
 * Generate 1 to 10 NPC operatives in batch.
 */
async function generateBatchNpcs(count = 1, customSpecs = []) {
  const boundedCount = Math.max(1, Math.min(10, parseInt(count, 10) || 1));

  // Preload cities, professions, and skills for efficiency
  const [citiesRes, profsRes, skillsRes] = await Promise.all([
    supabase.from('cities').select('id, name, country, continent').order('name'),
    supabase.from('professions').select('id, name, credits_per_week, ap_modifier, schedule_type').order('name'),
    supabase.from('skills').select('id, name, category, range, base_ap_cost, base_credit_cost').order('name'),
  ]);

  const preloaded = {
    cities: citiesRes.data || [],
    professions: profsRes.data || [],
    skills: skillsRes.data || [],
  };

  const createdNpcs = [];

  for (let i = 0; i < boundedCount; i++) {
    const userSpec = customSpecs[i] || {};
    const fullSpec = generateRandomNpcSpec(userSpec, preloaded);
    const npc = await createNpcOperative(fullSpec, preloaded);
    createdNpcs.push(npc);
  }

  return createdNpcs;
}

module.exports = {
  FIRST_NAMES,
  LAST_NAMES,
  CODENAMES,
  generateRandomNpcSpec,
  createNpcOperative,
  generateBatchNpcs,
};
