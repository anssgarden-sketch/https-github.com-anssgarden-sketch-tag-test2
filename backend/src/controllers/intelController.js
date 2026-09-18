const supabase = require('../services/supabase');
const { applyRegenerationForCharacter, getDeficitCompletionTime } = require('../services/regenerationService');

// Calculate pixel distance between two cities
function pixelDistance(city1, city2) {
  const dx = city2.map_x - city1.map_x;
  const dy = city2.map_y - city1.map_y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Get range tier of a city pair
function getRangeTier(attackerCity, targetCity) {
  if (attackerCity.id === targetCity.id) return 'same_city';
  if (attackerCity.country === targetCity.country) return 'same_country';
  if (attackerCity.continent === targetCity.continent) return 'same_continent';
  return 'cross_continent';
}

// Check if skill range covers the target city
function skillCoversRange(skillRange, rangeTier) {
  const rangeLevels = {
    'city':      1,
    'country':   2,
    'continent': 3,
    'global':    4
  };
  const skillLevel = rangeLevels[skillRange] || 1;
  const requiredLevel = {
    'same_city':       1,
    'same_country':    2,
    'same_continent':  3,
    'cross_continent': 4
  }[rangeTier];
  return skillLevel >= requiredLevel;
}

// Get cost multipliers from game config
async function getCostMultipliers() {
  const { data: config } = await supabase
    .from('game_config')
    .select('key, value')
    .in('key', [
      'intel_range_mod_same_country',
      'intel_range_mod_same_continent',
      'intel_range_mod_cross_continent',
      'intel_sweep_mod'
    ]);

  const cfg = {};
  (config || []).forEach(row => { cfg[row.key] = parseFloat(row.value); });

  return {
    same_city:       1.0,
    same_country:    cfg['intel_range_mod_same_country']    || 2.0,
    same_continent:  cfg['intel_range_mod_same_continent']  || 3.0,
    cross_continent: cfg['intel_range_mod_cross_continent'] || 4.0,
    sweep:           cfg['intel_sweep_mod']                 || 5.0
  };
}

// Helper: Execute a surveillance probe scan against targets in a city
async function executeSurveillanceScan(attackerId, accountId, probeData) {
  const { target_city_id, skill_id, is_sweep, target_name } = probeData;

  // Find targets in the city
  let targetQuery = supabase
    .from('characters')
    .select(`
      id, name, account_id,
      current_city_id,
      travel_status,
      destination_city_id,
      arrives_at,
      cities!current_city_id(id, name, country, continent)
    `)
    .eq('is_alive', true)
    .neq('id', attackerId)
    .eq('current_city_id', target_city_id);

  if (!is_sweep && target_name) {
    targetQuery = targetQuery.ilike('name', target_name.trim());
  }

  const { data: rawTargets, error: targetError } = await targetQuery;

  if (targetError) {
    console.error('Target search error:', targetError);
    return {
      success: false,
      error: 'Search failed',
      tagged: [],
      tagged_count: 0
    };
  }

  // Filter out any character belonging to the attacker's own account
  const potentialTargets = (rawTargets || []).filter(t => !accountId || t.account_id !== accountId);

  // Counter-intel check + tag each unprotected target
  const tagDurationHours = 48;
  const expiresAt = new Date(Date.now() + tagDurationHours * 60 * 60 * 1000).toISOString();
  const taggedTargets = [];
  let blockedCount = 0;

  for (const target of potentialTargets) {
    // Get target's counter-intel skills
    const { data: counterIntelSkills } = await supabase
      .from('character_skills')
      .select('skill_id')
      .eq('character_id', target.id)
      .eq('pool', 'counter_intel');

    const counterSkillIds = (counterIntelSkills || []).map(s => s.skill_id);

    // Exact match required: target must have the SAME skill_id in counter_intel pool
    const isBlocked = counterSkillIds.includes(skill_id);

    if (isBlocked) {
      blockedCount++;
      continue;
    }

    // Check for existing active tag from this attacker on this target
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('attacker_character_id', attackerId)
      .eq('target_character_id', target.id)
      .eq('is_active', true)
      .maybeSingle();

    if (existingTag) {
      await supabase
        .from('tags')
        .update({
          expires_at: expiresAt,
          tagged_in_city_id: target_city_id,
          intel_skill_used_id: skill_id,
          tagged_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', existingTag.id);
    } else {
      await supabase
        .from('tags')
        .insert({
          attacker_character_id: attackerId,
          target_character_id: target.id,
          tagged_in_city_id: target_city_id,
          intel_skill_used_id: skill_id,
          expires_at: expiresAt,
          is_active: true
        });
    }

    const targetCityData = Array.isArray(target.cities) ? target.cities[0] : target.cities;
    taggedTargets.push({
      name: target.name,
      city: targetCityData?.name,
      is_in_transit: target.travel_status === 'in_transit'
    });
  }

  return {
    success: true,
    tagged: taggedTargets,
    tagged_count: taggedTargets.length,
    blocked_count: blockedCount,
    result: taggedTargets.length > 0
      ? `Intelligence confirmed: ${taggedTargets.length} target(s) tagged.`
      : (blockedCount > 0
        ? 'Search complete — target protected by counter-intel'
        : 'No targets found in that city')
  };
}

// Helper: Complete surveillance for a character who reached completion time
async function completeSurveillanceForCharacter(character) {
  let probeData = null;
  try {
    probeData = typeof character.transport_mode === 'string'
      ? JSON.parse(character.transport_mode)
      : character.transport_mode;
  } catch (e) {
    console.error('Failed to parse surveillance payload:', e);
  }

  let scanResult = null;
  if (probeData && (probeData.type === 'surveillance' || probeData.skill_id)) {
    scanResult = await executeSurveillanceScan(character.id, character.account_id, probeData);
  }

  // Reset character status back to arrived
  await supabase
    .from('characters')
    .update({
      travel_status: 'arrived',
      destination_city_id: null,
      transport_mode: null,
      journey_started_at: null,
      arrives_at: null,
      ap_committed: 0
    })
    .eq('id', character.id);

  return scanResult;
}

// POST /api/intel/search
async function searchTarget(req, res) {
  try {
    const account_id = req.account.account_id;
    const { target_name, target_city_id, skill_id, is_sweep } = req.body;

    if (!target_city_id || !skill_id) {
      return res.status(400).json({ error: 'Target city and skill are required' });
    }

    if (!is_sweep && !target_name) {
      return res.status(400).json({ error: 'Target name is required for single target search' });
    }

    // Get attacker's living character
    const { data: attacker, error: attackerError } = await supabase
      .from('characters')
      .select(`
        id, name, credits, travel_status,
        current_city_id,
        cities!current_city_id(id, name, country, continent, map_x, map_y),
        action_points(current_ap, max_ap)
      `)
      .eq('account_id', account_id)
      .eq('is_alive', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attackerError || !attacker) {
      return res.status(404).json({ error: 'No living character found' });
    }

    const regen = await applyRegenerationForCharacter(attacker.id);
    const apRow = Array.isArray(attacker.action_points)
      ? attacker.action_points[0]
      : attacker.action_points;

    if (!apRow) {
      return res.status(500).json({ error: 'Action points record missing for character' });
    }

    if (regen && regen.regenerated) {
      attacker.credits = regen.newCredits;
      apRow.current_ap = regen.newAp;
    }

    // Status checks
    if (attacker.travel_status === 'in_transit') {
      return res.status(400).json({ error: 'Cannot conduct surveillance while in transit' });
    }
    if (attacker.travel_status === 'in_surveillance') {
      return res.status(400).json({ error: 'Already conducting an active surveillance probe' });
    }

    const currentAp = apRow.current_ap;

    // Verify attacker has this intel skill
    const { data: hasSkill } = await supabase
      .from('character_skills')
      .select('id')
      .eq('character_id', attacker.id)
      .eq('skill_id', skill_id)
      .eq('pool', 'intel')
      .single();

    if (!hasSkill) {
      return res.status(400).json({ error: 'You do not have this Intel skill' });
    }

    // Get the skill details
    const { data: skill } = await supabase
      .from('skills')
      .select('*')
      .eq('id', skill_id)
      .single();

    if (!skill) {
      return res.status(400).json({ error: 'Skill not found' });
    }

    // Verify it is actually an intel skill
    if (skill.category !== 'intel') {
      return res.status(400).json({ error: 'That skill is not an Intel skill' });
    }

    // Get target city details
    const { data: targetCity } = await supabase
      .from('cities')
      .select('id, name, country, continent, map_x, map_y')
      .eq('id', target_city_id)
      .single();

    if (!targetCity) {
      return res.status(400).json({ error: 'Target city not found' });
    }

    let attackerCity = Array.isArray(attacker.cities)
      ? attacker.cities[0]
      : attacker.cities;

    if (!attackerCity) {
      const { data: fallbackCity } = await supabase
        .from('cities')
        .select('id, name, country, continent, map_x, map_y')
        .eq('id', attacker.current_city_id)
        .maybeSingle();
      attackerCity = fallbackCity;
    }

    // Check skill range covers target city
    const rangeTier = getRangeTier(attackerCity, targetCity);
    if (!skillCoversRange(skill.range, rangeTier)) {
      const rangeLabels = {
        city: `same city (${attackerCity.name})`,
        country: `same country (${attackerCity.country})`,
        continent: `same continent (${attackerCity.continent})`,
        global: 'worldwide'
      };
      return res.status(400).json({
        error: `Target sector out of range. ${skill.name} has ${String(skill.range).toUpperCase()} range, which requires targets to be in the ${rangeLabels[skill.range] || skill.range}. Target ${targetCity.name} is in ${targetCity.country} (${targetCity.continent}).`
      });
    }

    // Calculate cost
    const multipliers = await getCostMultipliers();
    const rangeMod = multipliers[rangeTier];
    const sweepMod = is_sweep ? multipliers.sweep : 1.0;

    const apCost = Math.ceil(skill.base_ap_cost * rangeMod * sweepMod);
    const creditCost = Math.ceil(skill.base_credit_cost * rangeMod * sweepMod);

    // Rule: Agent must have at least 1 AP available to initiate surveillance probe
    if (currentAp < 1) {
      return res.status(400).json({
        error: 'You need at least 1 AP to launch a surveillance probe'
      });
    }

    // Check credits
    if (attacker.credits < creditCost) {
      return res.status(400).json({
        error: `Insufficient credits. Need ${creditCost}, have ${attacker.credits}`
      });
    }

    const newAp = currentAp - apCost;
    const apDeficit = Math.max(0, apCost - currentAp);
    const remainingCredits = attacker.credits - creditCost;

    // Deduct AP (locking future earnings if deficit)
    const { error: apUpdateError } = await supabase
      .from('action_points')
      .update({ current_ap: newAp, updated_at: new Date().toISOString() })
      .eq('character_id', attacker.id);

    if (apUpdateError) {
      console.error('AP deduct error:', apUpdateError);
      return res.status(500).json({ error: 'Failed to deduct AP' });
    }

    // Deduct credits
    const { error: creditsUpdateError } = await supabase
      .from('characters')
      .update({ credits: remainingCredits })
      .eq('id', attacker.id);

    if (creditsUpdateError) {
      console.error('Credits deduct error:', creditsUpdateError);
      return res.status(500).json({ error: 'Failed to deduct credits' });
    }

    // CASE 1: No deficit — Instant execution
    if (apDeficit === 0) {
      const scanResult = await executeSurveillanceScan(attacker.id, account_id, {
        target_city_id,
        skill_id,
        is_sweep,
        target_name
      });

      const response = {
        message: is_sweep ? 'City sweep complete' : 'Search complete',
        status: 'completed',
        skill_used: skill.name,
        target_city: targetCity.name,
        ap_spent: apCost,
        credits_spent: creditCost,
        remaining_ap: newAp,
        remaining_credits: remainingCredits
      };

      if (scanResult.tagged && scanResult.tagged.length > 0) {
        response.tagged = scanResult.tagged;
        response.tagged_count = scanResult.tagged_count;
      } else {
        response.result = scanResult.result;
      }

      return res.json(response);
    }

    // CASE 2: Deficit — Agent enters "In Surveillance Mode"
    // Mission countdown begins at button-click and runs for the full deficit duration (apDeficit * 1h)
    const probeStartedAt = new Date();
    const completesAt = new Date(probeStartedAt.getTime() + apDeficit * 60 * 60 * 1000);

    const probePayload = JSON.stringify({
      type: 'surveillance',
      is_sweep: !!is_sweep,
      target_name: target_name ? target_name.trim() : null,
      skill_id: skill.id,
      skill_name: skill.name,
      target_city_id: targetCity.id,
      target_city_name: targetCity.name,
      ap_cost: apCost,
      credit_cost: creditCost,
      ap_deficit_hours: apDeficit,
      completes_at: completesAt.toISOString()
    });

    const { error: survUpdateError } = await supabase
      .from('characters')
      .update({
        travel_status: 'in_surveillance',
        destination_city_id: targetCity.id,
        transport_mode: probePayload,
        journey_started_at: probeStartedAt.toISOString(),
        arrives_at: completesAt.toISOString(),
        ap_committed: apCost
      })
      .eq('id', attacker.id);

    if (survUpdateError) {
      console.error('Surveillance mode update error:', survUpdateError);
      return res.status(500).json({ error: 'Failed to enter surveillance mode' });
    }

    return res.json({
      message: `Surveillance probe deployed to ${targetCity.name} — ${apDeficit}h until intelligence gathered`,
      status: 'in_surveillance',
      skill_used: skill.name,
      target_city: targetCity.name,
      is_sweep: !!is_sweep,
      target_name: target_name ? target_name.trim() : null,
      ap_spent: apCost,
      credits_spent: creditCost,
      ap_deficit_hours: apDeficit,
      remaining_ap: newAp,
      remaining_credits: remainingCredits,
      completes_at: completesAt.toISOString()
    });

  } catch (err) {
    console.error('Intel search error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/intel/abort
async function abortSurveillance(req, res) {
  try {
    const account_id = req.account.account_id;

    const { data: character, error } = await supabase
      .from('characters')
      .select('id, name, travel_status, current_city_id, transport_mode')
      .eq('account_id', account_id)
      .eq('is_alive', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !character) {
      return res.status(404).json({ error: 'No living character found' });
    }

    if (character.travel_status !== 'in_surveillance') {
      return res.status(400).json({ error: 'Operative is not currently conducting surveillance' });
    }

    // Reset surveillance fields. All AP and money paid to initiate Surveillance are lost.
    const { error: updateError } = await supabase
      .from('characters')
      .update({
        travel_status: 'arrived',
        destination_city_id: null,
        transport_mode: null,
        journey_started_at: null,
        arrives_at: null,
        ap_committed: 0
      })
      .eq('id', character.id);

    if (updateError) {
      console.error('Abort surveillance error:', updateError);
      return res.status(500).json({ error: 'Failed to abort surveillance' });
    }

    return res.json({
      message: 'Surveillance probe aborted. All AP and funds expended were forfeit.',
      status: 'arrived'
    });
  } catch (err) {
    console.error('Abort surveillance error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/intel/status
async function getSurveillanceStatus(req, res) {
  try {
    const account_id = req.account.account_id;

    const { data: character, error } = await supabase
      .from('characters')
      .select('id, name, account_id, travel_status, current_city_id, destination_city_id, transport_mode, arrives_at, journey_started_at, ap_committed')
      .eq('account_id', account_id)
      .eq('is_alive', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !character) {
      return res.status(404).json({ error: 'No living character found' });
    }

    if (character.travel_status !== 'in_surveillance') {
      return res.json({ status: 'idle' });
    }

    const now = new Date();
    const arrivesAt = character.arrives_at ? new Date(character.arrives_at) : null;

    // If completed
    if (arrivesAt && arrivesAt <= now) {
      const scanResult = await completeSurveillanceForCharacter(character);
      return res.json({
        status: 'completed',
        message: 'Surveillance probe complete — intelligence report generated.',
        report: scanResult
      });
    }

    let probeData = null;
    try {
      probeData = typeof character.transport_mode === 'string'
        ? JSON.parse(character.transport_mode)
        : character.transport_mode;
    } catch (e) {}

    return res.json({
      status: 'in_surveillance',
      probe: probeData,
      completes_at: character.arrives_at,
      started_at: character.journey_started_at,
      seconds_remaining: arrivesAt ? Math.max(0, Math.floor((arrivesAt.getTime() - now.getTime()) / 1000)) : 0
    });
  } catch (err) {
    console.error('Surveillance status error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/intel/tags
async function getMyTags(req, res) {
  try {
    const account_id = req.account.account_id;

    const { data: character } = await supabase
      .from('characters')
      .select('id')
      .eq('account_id', account_id)
      .eq('is_alive', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!character) {
      return res.status(404).json({ error: 'No living character found' });
    }

    const nowIso = new Date().toISOString();
    const { data: tags, error } = await supabase
      .from('tags')
      .select(`
        id,
        tagged_at,
        expires_at,
        tagged_in_city_id,
        cities!tagged_in_city_id(id, name, country, continent),
        characters!target_character_id(
          id, name, travel_status, current_city_id,
          cities!current_city_id(id, name, country, continent)
        ),
        skills!intel_skill_used_id(name)
      `)
      .eq('attacker_character_id', character.id)
      .eq('is_active', true)
      .gt('expires_at', nowIso)
      .order('tagged_at', { ascending: false });

    if (error) {
      console.error('Get tags error:', error);
      return res.status(500).json({ error: 'Failed to retrieve tags' });
    }

    return res.json({
      active_tags: tags || [],
      count: tags?.length || 0
    });

  } catch (err) {
    console.error('Get tags error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  searchTarget,
  getMyTags,
  abortSurveillance,
  getSurveillanceStatus,
  completeSurveillanceForCharacter,
  executeSurveillanceScan
};