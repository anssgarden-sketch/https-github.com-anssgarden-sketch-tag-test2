const supabase = require('../services/supabase');
const { applyRegenerationForCharacter, getDeficitCompletionTime } = require('../services/regenerationService');

// Calculate pixel distance between two cities
function pixelDistance(city1, city2) {
  const dx = city2.map_x - city1.map_x;
  const dy = city2.map_y - city1.map_y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Get travel rates from game config
async function getTransportRates() {
  const { data: config } = await supabase
    .from('game_config')
    .select('key, value')
    .in('key', [
      'air_ap_per_100px', 'air_credits_per_100px',
      'rail_ap_per_100px', 'rail_credits_per_100px',
      'water_ap_per_100px', 'water_credits_per_100px',
      'road_ap_per_100px', 'road_credits_per_100px'
    ]);

  const cfg = {};
  (config || []).forEach(row => { cfg[row.key] = parseFloat(row.value); });

  return {
    air:   { ap: cfg['air_ap_per_100px']   || 1, credits: cfg['air_credits_per_100px']   || 50 },
    rail:  { ap: cfg['rail_ap_per_100px']  || 2, credits: cfg['rail_credits_per_100px']  || 30 },
    water: { ap: cfg['water_ap_per_100px'] || 3, credits: cfg['water_credits_per_100px'] || 20 },
    road:  { ap: cfg['road_ap_per_100px']  || 4, credits: cfg['road_credits_per_100px']  || 10 }
  };
}

// Check whether a mode is actually usable between these two cities
async function checkRouteEligibility(mode, originCity, destCity) {
  if (mode === 'road') {
    return { eligible: true };
  }

  if (mode === 'air') {
    if (!originCity.has_airport || !destCity.has_airport) {
      return { eligible: false, reason: 'Both cities need an airport for air travel' };
    }
    return { eligible: true };
  }

  if (mode === 'rail') {
    if (!originCity.has_rail || !destCity.has_rail) {
      return { eligible: false, reason: 'Both cities need rail access' };
    }
    const { data } = await supabase
      .from('rail_connections')
      .select('id')
      .or(`and(city_a_id.eq.${originCity.id},city_b_id.eq.${destCity.id}),and(city_a_id.eq.${destCity.id},city_b_id.eq.${originCity.id})`)
      .maybeSingle();
    if (!data) {
      return { eligible: false, reason: `No direct rail connection between ${originCity.name} and ${destCity.name}` };
    }
    return { eligible: true };
  }

  if (mode === 'water') {
    if (!originCity.has_port || !destCity.has_port) {
      return { eligible: false, reason: 'Both cities need a port for water travel' };
    }
    const { data } = await supabase
      .from('water_routes')
      .select('id')
      .or(`and(city_a_id.eq.${originCity.id},city_b_id.eq.${destCity.id}),and(city_a_id.eq.${destCity.id},city_b_id.eq.${originCity.id})`)
      .maybeSingle();
    if (!data) {
      return { eligible: false, reason: `No direct water route between ${originCity.name} and ${destCity.name}` };
    }
    return { eligible: true };
  }

  return { eligible: false, reason: 'Unknown transport mode' };
}

// POST /api/travel/initiate
async function initiateTravel(req, res) {
  try {
    const account_id = req.account.account_id;
    const { destination_city_id, transport_mode } = req.body;

    if (!destination_city_id || !transport_mode) {
      return res.status(400).json({ error: 'Destination city and transport mode are required' });
    }

    if (!['air', 'rail', 'water', 'road'].includes(transport_mode)) {
      return res.status(400).json({ error: 'Invalid transport mode' });
    }

    const { data: character, error: charError } = await supabase
      .from('characters')
      .select(`
        id, name, credits, travel_status, current_city_id,
        cities!current_city_id(id, name, country, continent, map_x, map_y, has_airport, has_rail, has_port),
        action_points(current_ap, max_ap)
      `)
      .eq('account_id', account_id)
      .eq('is_alive', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (charError || !character) {
      return res.status(404).json({ error: 'No living character found' });
    }

    const regen = await applyRegenerationForCharacter(character.id);
    const apRow = Array.isArray(character.action_points) ? character.action_points[0] : character.action_points;
    if (!apRow) {
      return res.status(500).json({ error: 'Action points record missing for character' });
    }
    if (regen && regen.regenerated) {
      character.credits = regen.newCredits;
      apRow.current_ap = regen.newAp;
    }

    if (character.travel_status === 'in_transit') {
      return res.status(400).json({ error: 'Already in transit' });
    }

    if (character.travel_status === 'in_surveillance') {
      return res.status(400).json({ error: 'Cannot initiate travel while actively locked in surveillance mode' });
    }

    const currentAp = apRow.current_ap;

    const originCity = Array.isArray(character.cities) ? character.cities[0] : character.cities;

    if (destination_city_id === character.current_city_id) {
      return res.status(400).json({ error: 'You are already in that city' });
    }

    const { data: destCity } = await supabase
      .from('cities')
      .select('id, name, country, continent, map_x, map_y, has_airport, has_rail, has_port')
      .eq('id', destination_city_id)
      .single();

    if (!destCity) {
      return res.status(400).json({ error: 'Destination city not found' });
    }

    const routeCheck = await checkRouteEligibility(transport_mode, originCity, destCity);
    if (!routeCheck.eligible) {
      return res.status(400).json({ error: routeCheck.reason });
    }

    const distance = pixelDistance(originCity, destCity);
    const rates = await getTransportRates();
    const rate = rates[transport_mode];
    const apCost = Math.ceil((distance / 100) * rate.ap);
    const creditCost = Math.ceil((distance / 100) * rate.credits);

    if (currentAp < 1) {
      return res.status(400).json({ error: 'You need at least 1 AP to initiate travel' });
    }

    if (character.credits < creditCost) {
      return res.status(400).json({
        error: `Insufficient credits. Need $${creditCost}, have $${character.credits}`
      });
    }

    const newAp = currentAp - apCost;
    const apDeficit = Math.max(0, apCost - currentAp);
    const remainingCredits = character.credits - creditCost;

    const { error: apUpdateError } = await supabase
      .from('action_points')
      .update({ current_ap: newAp, updated_at: new Date().toISOString() })
      .eq('character_id', character.id);

    if (apUpdateError) {
      console.error('AP deduct error:', apUpdateError);
      return res.status(500).json({ error: 'Failed to deduct AP' });
    }

    if (apDeficit === 0) {
      const { error: arriveError } = await supabase
        .from('characters')
        .update({
          credits: remainingCredits,
          current_city_id: destCity.id,
          travel_status: 'arrived',
          destination_city_id: null,
          transport_mode: null,
          journey_started_at: null,
          arrives_at: null,
          ap_committed: 0
        })
        .eq('id', character.id);

      if (arriveError) {
        console.error('Travel update error:', arriveError);
        return res.status(500).json({ error: 'Failed to update character' });
      }

      await supabase.from('tags').delete().eq('target_character_id', character.id);

      return res.json({
        message: `Arrived in ${destCity.name} immediately — AP fully covered the trip`,
        status: 'arrived',
        transport_mode,
        distance_px: Math.round(distance),
        ap_spent: apCost,
        credits_spent: creditCost,
        remaining_ap: newAp,
        remaining_credits: remainingCredits
      });
    }

    const journeyStartedAt = new Date();
    const arrivesAt = new Date(journeyStartedAt.getTime() + apDeficit * 60 * 60 * 1000);

    const { error: travelUpdateError } = await supabase
      .from('characters')
      .update({
        credits: remainingCredits,
        travel_status: 'in_transit',
        destination_city_id: destCity.id,
        transport_mode,
        journey_started_at: journeyStartedAt.toISOString(),
        arrives_at: arrivesAt.toISOString(),
        ap_committed: apCost
      })
      .eq('id', character.id);

    if (travelUpdateError) {
      console.error('Travel update error:', travelUpdateError);
      return res.status(500).json({ error: 'Failed to update character' });
    }

    return res.json({
      message: `Departed for ${destCity.name} — ${apDeficit}h until arrival`,
      status: 'in_transit',
      transport_mode,
      distance_px: Math.round(distance),
      ap_spent: apCost,
      credits_spent: creditCost,
      ap_deficit_hours: apDeficit,
      remaining_ap: newAp,
      remaining_credits: remainingCredits,
      arrives_at: arrivesAt.toISOString()
    });

  } catch (err) {
    console.error('Initiate travel error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/travel/map
async function getTravelMap(req, res) {
  try {
    const [citiesRes, railRes, waterRes, rates] = await Promise.all([
      supabase.from('cities').select('id, name, country, continent, map_x, map_y, has_airport, has_rail, has_port').order('name'),
      supabase.from('rail_connections').select('id, city_a_id, city_b_id'),
      supabase.from('water_routes').select('id, city_a_id, city_b_id'),
      getTransportRates()
    ]);

    if (citiesRes.error) throw citiesRes.error;

    return res.json({
      cities: citiesRes.data || [],
      rail_connections: railRes.data || [],
      water_routes: waterRes.data || [],
      rates
    });
  } catch (err) {
    console.error('Travel map error:', err);
    return res.status(500).json({ error: 'Failed to load travel map' });
  }
}

// POST /api/travel/cancel
async function cancelTravel(req, res) {
  try {
    const account_id = req.account.account_id;

    const { data: character, error } = await supabase
      .from('characters')
      .select('id, name, travel_status, current_city_id, transport_mode, ap_committed, cities!current_city_id(name, country)')
      .eq('account_id', account_id)
      .eq('is_alive', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !character) {
      return res.status(404).json({ error: 'No living character found' });
    }

    if (character.travel_status !== 'in_transit') {
      return res.status(400).json({ error: 'Operative is not currently in transit' });
    }

    // Reset travel fields. All AP and money paid to initiate Travel are lost.
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
      console.error('Cancel travel error:', updateError);
      return res.status(500).json({ error: 'Failed to cancel travel' });
    }

    const cityData = Array.isArray(character.cities) ? character.cities[0] : character.cities;
    const cityName = cityData?.name || 'current station';

    return res.json({
      message: `Travel cancelled. Operative remains in ${cityName}. All AP and funds expended were forfeit.`,
      status: 'arrived'
    });
  } catch (err) {
    console.error('Cancel travel error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { initiateTravel, getTravelMap, cancelTravel };