const jwt = require('jsonwebtoken');
const supabase = require('../services/supabase');

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TagAdmin#2026!';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'tag-admin-jwt-secret-2026-game-master';

// Helper to extract bearer token or custom header
function extractAdminToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return req.headers['x-admin-token'] || req.headers['x-admin-key'] || req.query.admin_token;
}

// Middleware to verify admin token
function verifyAdmin(req, res, next) {
  const token = extractAdminToken(req);
  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized: Admin credentials required. Please sign in with username and password.' 
    });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded && decoded.role === 'admin') {
      req.admin = decoded;
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid admin token role.' });
  } catch (err) {
    return res.status(401).json({ 
      error: 'Unauthorized: Admin session expired or invalid. Please log in again.' 
    });
  }
}

// POST /api/admin/auth/login
// Requires username and password
async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Both username and password are required' });
  }

  const trimmedUser = String(username).trim();
  const trimmedPass = String(password);

  // Validate credentials against configured admin credentials
  const isUsernameMatch = trimmedUser.toLowerCase() === ADMIN_USERNAME.toLowerCase();
  const isPasswordMatch = trimmedPass === ADMIN_PASSWORD;

  if (!isUsernameMatch || !isPasswordMatch) {
    return res.status(401).json({ error: 'Invalid admin username or password' });
  }

  // Generate secure JWT admin session token (valid for 24 hours)
  const token = jwt.sign(
    { role: 'admin', username: ADMIN_USERNAME },
    ADMIN_JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({
    success: true,
    message: 'Admin authenticated successfully',
    token,
    user: {
      username: ADMIN_USERNAME,
      role: 'admin',
    },
  });
}

// POST /api/admin/auth/verify
// Checks if current token or session is valid
async function verifySession(req, res) {
  const token = req.body?.token || extractAdminToken(req);

  if (!token) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded && decoded.role === 'admin') {
      return res.json({
        success: true,
        authenticated: true,
        user: { username: decoded.username, role: 'admin' },
      });
    }
    return res.status(401).json({ error: 'Invalid token payload' });
  } catch (err) {
    return res.status(401).json({ error: 'Admin session expired or invalid' });
  }
}

// GET /api/admin/data
async function getAdminData(req, res) {
  try {
    const [skillsRes, citiesRes, configRes, railRes, waterRes, profsRes] = await Promise.all([
      supabase.from('skills').select('*').order('category').order('name'),
      supabase.from('cities').select('*').order('name'),
      supabase.from('game_config').select('*').order('key'),
      supabase.from('rail_connections').select('*'),
      supabase.from('water_routes').select('*'),
      supabase.from('professions').select('*').order('name'),
    ]);

    if (skillsRes.error) throw skillsRes.error;
    if (citiesRes.error) throw citiesRes.error;
    if (configRes.error) throw configRes.error;

    return res.json({
      skills: skillsRes.data || [],
      cities: citiesRes.data || [],
      game_config: configRes.data || [],
      rail_connections: railRes.data || [],
      water_routes: waterRes.data || [],
      professions: profsRes.data || [],
    });
  } catch (err) {
    console.error('Error fetching admin data:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch admin data' });
  }
}

// ── Skills CRUD ──────────────────────────────────────────────

// POST /api/admin/skills
async function createSkill(req, res) {
  try {
    const { name, description, category, range, base_ap_cost, base_credit_cost, can_execute_in_transit } = req.body;
    if (!name || !category || !range) {
      return res.status(400).json({ error: 'Name, category, and range are required' });
    }

    const { data, error } = await supabase
      .from('skills')
      .insert({
        name,
        description: description || '',
        category,
        range,
        base_ap_cost: parseInt(base_ap_cost, 10) || 1,
        base_credit_cost: parseInt(base_credit_cost, 10) || 0,
        can_execute_in_transit: Boolean(can_execute_in_transit)
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, skill: data });
  } catch (err) {
    console.error('Create skill error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create skill' });
  }
}

// PUT /api/admin/skills/:id
async function updateSkill(req, res) {
  try {
    const { id } = req.params;
    const { name, description, category, range, base_ap_cost, base_credit_cost, can_execute_in_transit } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (range !== undefined) updates.range = range;
    if (base_ap_cost !== undefined) updates.base_ap_cost = parseInt(base_ap_cost, 10);
    if (base_credit_cost !== undefined) updates.base_credit_cost = parseInt(base_credit_cost, 10);
    if (can_execute_in_transit !== undefined) updates.can_execute_in_transit = Boolean(can_execute_in_transit);

    const { data, error } = await supabase
      .from('skills')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, skill: data });
  } catch (err) {
    console.error('Update skill error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update skill' });
  }
}

// DELETE /api/admin/skills/:id
async function deleteSkill(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('skills').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true, message: 'Skill deleted' });
  } catch (err) {
    console.error('Delete skill error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete skill' });
  }
}

// ── Cities CRUD ──────────────────────────────────────────────

// POST /api/admin/cities
async function createCity(req, res) {
  try {
    const { name, country, continent, map_x, map_y, has_airport, has_rail, has_port } = req.body;
    if (!name || !country || !continent) {
      return res.status(400).json({ error: 'Name, country, and continent are required' });
    }

    const { data, error } = await supabase
      .from('cities')
      .insert({
        name,
        country,
        continent,
        map_x: parseInt(map_x, 10) || 100,
        map_y: parseInt(map_y, 10) || 100,
        has_airport: Boolean(has_airport),
        has_rail: Boolean(has_rail),
        has_port: Boolean(has_port)
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, city: data });
  } catch (err) {
    console.error('Create city error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create city' });
  }
}

// PUT /api/admin/cities/:id
async function updateCity(req, res) {
  try {
    const { id } = req.params;
    const { name, country, continent, map_x, map_y, has_airport, has_rail, has_port } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (country !== undefined) updates.country = country;
    if (continent !== undefined) updates.continent = continent;
    if (map_x !== undefined) updates.map_x = parseInt(map_x, 10);
    if (map_y !== undefined) updates.map_y = parseInt(map_y, 10);
    if (has_airport !== undefined) updates.has_airport = Boolean(has_airport);
    if (has_rail !== undefined) updates.has_rail = Boolean(has_rail);
    if (has_port !== undefined) updates.has_port = Boolean(has_port);

    const { data, error } = await supabase
      .from('cities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, city: data });
  } catch (err) {
    console.error('Update city error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update city' });
  }
}

// DELETE /api/admin/cities/:id
async function deleteCity(req, res) {
  try {
    const { id } = req.params;
    // Remove connections first to prevent foreign key errors
    await supabase.from('rail_connections').delete().or(`city_a_id.eq.${id},city_b_id.eq.${id}`);
    await supabase.from('water_routes').delete().or(`city_a_id.eq.${id},city_b_id.eq.${id}`);

    const { error } = await supabase.from('cities').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true, message: 'City deleted' });
  } catch (err) {
    console.error('Delete city error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete city' });
  }
}

// ── Travel Connections CRUD ──────────────────────────────────

// POST /api/admin/connections/rail
async function addRailConnection(req, res) {
  try {
    const { city_a_id, city_b_id } = req.body;
    if (!city_a_id || !city_b_id || city_a_id === city_b_id) {
      return res.status(400).json({ error: 'Two distinct cities are required for a rail connection' });
    }

    const { data, error } = await supabase
      .from('rail_connections')
      .insert({ city_a_id, city_b_id })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, connection: data });
  } catch (err) {
    console.error('Add rail connection error:', err);
    return res.status(500).json({ error: err.message || 'Failed to add rail connection' });
  }
}

// DELETE /api/admin/connections/rail/:id
async function deleteRailConnection(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('rail_connections').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true, message: 'Rail connection removed' });
  } catch (err) {
    console.error('Delete rail connection error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete rail connection' });
  }
}

// POST /api/admin/connections/water
async function addWaterRoute(req, res) {
  try {
    const { city_a_id, city_b_id } = req.body;
    if (!city_a_id || !city_b_id || city_a_id === city_b_id) {
      return res.status(400).json({ error: 'Two distinct cities are required for a water route' });
    }

    const { data, error } = await supabase
      .from('water_routes')
      .insert({ city_a_id, city_b_id })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, connection: data });
  } catch (err) {
    console.error('Add water route error:', err);
    return res.status(500).json({ error: err.message || 'Failed to add water route' });
  }
}

// DELETE /api/admin/connections/water/:id
async function deleteWaterRoute(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('water_routes').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true, message: 'Water route removed' });
  } catch (err) {
    console.error('Delete water route error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete water route' });
  }
}

// ── Game Config & AP/Cost Rates ──────────────────────────────

// PUT /api/admin/config
async function updateConfig(req, res) {
  try {
    const { configs } = req.body;
    if (!configs || !Array.isArray(configs)) {
      return res.status(400).json({ error: 'configs array is required [{ key, value, description }]' });
    }

    const results = [];
    for (const item of configs) {
      if (!item.key) continue;
      const { data, error } = await supabase
        .from('game_config')
        .upsert({
          key: item.key,
          value: String(item.value),
          description: item.description || '',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.warn('Config upsert warning for key', item.key, error);
      } else {
        results.push(data);
      }
    }

    return res.json({ success: true, updated: results });
  } catch (err) {
    console.error('Update config error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update game configuration' });
  }
}

// ── Operatives / Players AP & Credits Management ──────────────

// GET /api/admin/players
async function getPlayers(req, res) {
  try {
    const { data: players, error } = await supabase
      .from('characters')
      .select(`
        id,
        name,
        player_type,
        is_alive,
        credits,
        travel_status,
        destination_city_id,
        transport_mode,
        kill_count,
        intel_sold_count,
        items_sold_count,
        survival_days,
        created_at,
        last_active_at,
        current_city_id,
        profession_id,
        killed_by_account_id,
        killed_with_skill_id,
        killed_in_city_id,
        killed_at,
        cities!current_city_id (id, name, country, continent),
        destination_city:cities!destination_city_id (id, name, country, continent),
        professions (id, name, credits_per_week, ap_modifier, schedule_type, description),
        action_points (id, current_ap, max_ap, last_regen_at, updated_at),
        accounts!characters_account_id_fkey (id, email, dark_web_handle, swiss_bank_number, gold_coins, death_count, created_at, last_login_at),
        character_skills (id, pool, skill_id, skills (id, name, category, range, base_ap_cost, base_credit_cost, description, can_execute_in_transit))
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, players: players || [] });
  } catch (err) {
    console.error('Error fetching players for admin:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch players' });
  }
}

// PUT /api/admin/players/:id/resources
async function updatePlayerResources(req, res) {
  try {
    const { id } = req.params;
    const { current_ap, max_ap, credits, is_alive, city_id, player_type, reason } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'Character ID is required' });
    }

    // Fetch existing character & action points
    const { data: existingChar, error: fetchErr } = await supabase
      .from('characters')
      .select('id, account_id, name, credits, is_alive, current_city_id, player_type, action_points(id, current_ap, max_ap)')
      .eq('id', id)
      .single();

    if (fetchErr || !existingChar) {
      return res.status(404).json({ error: 'Operative character not found' });
    }

    const charUpdates = {
      last_active_at: new Date().toISOString(),
    };

    if (player_type && (player_type === 'PC' || player_type === 'NPC')) {
      charUpdates.player_type = player_type;
    }

    if (credits !== undefined && credits !== null) {
      const parsedCredits = Math.max(0, parseInt(credits, 10));
      if (isNaN(parsedCredits)) {
        return res.status(400).json({ error: 'Credits must be a valid non-negative number' });
      }
      charUpdates.credits = parsedCredits;

      // Log bank transaction if credits changed
      const oldCredits = existingChar.credits || 0;
      const creditDiff = parsedCredits - oldCredits;
      if (creditDiff !== 0) {
        try {
          await supabase.from('bank_transactions').insert({
            to_account_id: existingChar.account_id,
            amount: Math.abs(creditDiff),
            currency: 'credits',
            reason: reason || (creditDiff > 0 ? 'admin_grant' : 'admin_deduction'),
            created_at: new Date().toISOString(),
          });
        } catch (txErr) {
          console.warn('Failed to log admin bank transaction:', txErr);
        }
      }
    }

    if (is_alive !== undefined) {
      charUpdates.is_alive = Boolean(is_alive);
    }

    if (city_id) {
      charUpdates.current_city_id = city_id;
      charUpdates.travel_status = 'arrived';
    }

    const { data: updatedChar, error: updateCharErr } = await supabase
      .from('characters')
      .update(charUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateCharErr) {
      throw updateCharErr;
    }

    // Update Action Points
    let updatedAp = null;
    if (current_ap !== undefined || max_ap !== undefined) {
      const existingApRow = Array.isArray(existingChar.action_points)
        ? existingChar.action_points[0]
        : existingChar.action_points;

      const apUpdates = {
        updated_at: new Date().toISOString(),
        last_regen_at: new Date().toISOString(),
      };

      if (max_ap !== undefined && max_ap !== null) {
        const parsedMaxAp = Math.max(1, parseInt(max_ap, 10));
        if (!isNaN(parsedMaxAp)) {
          apUpdates.max_ap = parsedMaxAp;
        }
      }

      if (current_ap !== undefined && current_ap !== null) {
        const parsedCurrentAp = Math.max(0, parseInt(current_ap, 10));
        if (!isNaN(parsedCurrentAp)) {
          apUpdates.current_ap = parsedCurrentAp;
        }
      }

      if (existingApRow) {
        const { data: apResult, error: apErr } = await supabase
          .from('action_points')
          .update(apUpdates)
          .eq('character_id', id)
          .select('*')
          .single();

        if (apErr) console.error('AP update error:', apErr);
        updatedAp = apResult;
      } else {
        const defaultMax = apUpdates.max_ap || 4;
        const { data: apResult, error: apErr } = await supabase
          .from('action_points')
          .insert({
            character_id: id,
            current_ap: apUpdates.current_ap !== undefined ? apUpdates.current_ap : defaultMax,
            max_ap: defaultMax,
            ...apUpdates,
          })
          .select('*')
          .single();

        if (apErr) console.error('AP insert error:', apErr);
        updatedAp = apResult;
      }
    }

    return res.json({
      success: true,
      message: `Updated resources for operative ${existingChar.name}`,
      character: updatedChar,
      action_points: updatedAp,
    });
  } catch (err) {
    console.error('Update player resources error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update player resources' });
  }
}

// ── NPC Generator ────────────────────────────────────────────

// POST /api/admin/npcs/generate
async function generateNpcs(req, res) {
  try {
    const { count = 1, npcs = [] } = req.body || {};
    const numCount = Math.max(1, Math.min(10, parseInt(count, 10) || 1));

    const { generateBatchNpcs } = require('../services/npcService');
    const createdNpcs = await generateBatchNpcs(numCount, npcs);

    return res.json({
      success: true,
      message: `Successfully generated ${createdNpcs.length} NPC operative(s)`,
      count: createdNpcs.length,
      npcs: createdNpcs,
    });
  } catch (err) {
    console.error('Generate NPCs error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate NPC operatives' });
  }
}

// ── Admin Impersonation / Control ────────────────────────────

// POST /api/admin/impersonate/:characterId
// Allows an authenticated Admin to assume control of an operative (especially password-less NPCs)
async function impersonateOperative(req, res) {
  try {
    const { characterId } = req.params;

    if (!characterId) {
      return res.status(400).json({ error: 'Operative character ID is required' });
    }

    // Fetch character
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, account_id, player_type, is_alive, current_city_id, profession_id')
      .eq('id', characterId)
      .maybeSingle();

    if (charError || !character) {
      return res.status(404).json({ error: 'Operative character not found' });
    }

    if (!character.account_id) {
      return res.status(404).json({ error: 'No user account linked to this operative' });
    }

    // Fetch linked account
    const { data: account, error: accError } = await supabase
      .from('accounts')
      .select('id, email, dark_web_handle, swiss_bank_number, gold_coins, death_count')
      .eq('id', character.account_id)
      .maybeSingle();

    if (accError || !account) {
      return res.status(404).json({ error: 'User account not found for this operative' });
    }

    // Generate authenticated player JWT for this account
    const jwtSecret = process.env.JWT_SECRET || 'tag-game-jwt-secret-2024-change-before-launch';
    const playerToken = jwt.sign(
      {
        account_id: account.id,
        email: account.email,
        dark_web_handle: account.dark_web_handle,
        impersonated_by_admin: req.admin?.username || 'admin',
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: `Admin session generated for operative ${character.name} (${account.dark_web_handle})`,
      token: playerToken,
      account: {
        id: account.id,
        email: account.email,
        dark_web_handle: account.dark_web_handle,
        swiss_bank_number: account.swiss_bank_number,
        gold_coins: account.gold_coins,
        death_count: account.death_count,
      },
      character: {
        id: character.id,
        name: character.name,
        player_type: character.player_type,
        is_alive: character.is_alive,
      },
    });
  } catch (err) {
    console.error('Impersonate operative error:', err);
    return res.status(500).json({ error: err.message || 'Failed to impersonate operative' });
  }
}

module.exports = {
  verifyAdmin,
  login,
  verifySession,
  verifyKey: verifySession,
  getAdminData,
  createSkill,
  updateSkill,
  deleteSkill,
  createCity,
  updateCity,
  deleteCity,
  addRailConnection,
  deleteRailConnection,
  addWaterRoute,
  deleteWaterRoute,
  updateConfig,
  getPlayers,
  updatePlayerResources,
  generateNpcs,
  impersonateOperative,
};
