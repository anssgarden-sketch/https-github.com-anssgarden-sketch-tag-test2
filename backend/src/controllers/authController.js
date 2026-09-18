const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../services/supabase');

// Generate Swiss bank account number: SB-NNNN-XXXX
function generateSwissBankNumber(handle) {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const letters = handle.substring(0, 4).toUpperCase().padEnd(4, 'X');
  return `SB-${digits}-${letters}`;
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { email, password, dark_web_handle } = req.body;

    // Validate inputs
    if (!email || !password || !dark_web_handle) {
      return res.status(400).json({ 
        error: 'Email, password and dark web handle are required' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }

    if (dark_web_handle.length < 3 || dark_web_handle.length > 20) {
      return res.status(400).json({ 
        error: 'Dark web handle must be 3-20 characters' 
      });
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('accounts')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if handle already exists
    const { data: existingHandle } = await supabase
      .from('accounts')
      .select('id')
      .eq('dark_web_handle', dark_web_handle)
      .maybeSingle();

    if (existingHandle) {
      return res.status(400).json({ 
        error: 'Dark web handle already taken' 
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Generate Swiss bank number
    const swiss_bank_number = generateSwissBankNumber(dark_web_handle);

    // Create account
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        email,
        password_hash,
        dark_web_handle,
        swiss_bank_number,
        gold_coins: 0,
        death_count: 0
      })
      .select('id, email, dark_web_handle, swiss_bank_number, gold_coins')
      .single();

    if (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: error.message || 'Failed to create account' });
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'tag-game-jwt-secret-2024-change-before-launch';
    const token = jwt.sign(
      { 
        account_id: account.id, 
        email: account.email,
        dark_web_handle: account.dark_web_handle
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      account: {
        id: account.id,
        email: account.email,
        dark_web_handle: account.dark_web_handle,
        swiss_bank_number: account.swiss_bank_number,
        gold_coins: account.gold_coins
      }
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find account
    const { data: account, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !account) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Hard block NPC accounts: locked password hash or NPC character check
    if (!account.password_hash || account.password_hash.startsWith('!LOCKED_NPC')) {
      return res.status(403).json({ 
        error: 'Access Denied: Autonomous operative account. Direct terminal login is disabled.' 
      });
    }

    // Double-check if linked character is marked as NPC
    const { data: npcCheck } = await supabase
      .from('characters')
      .select('id, player_type')
      .eq('account_id', account.id)
      .eq('player_type', 'NPC')
      .maybeSingle();

    if (npcCheck) {
      return res.status(403).json({ 
        error: 'Access Denied: Autonomous operative account. Direct terminal login is disabled.' 
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, account.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await supabase
      .from('accounts')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', account.id);

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'tag-game-jwt-secret-2024-change-before-launch';
    const token = jwt.sign(
      { 
        account_id: account.id,
        email: account.email,
        dark_web_handle: account.dark_web_handle
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      account: {
        id: account.id,
        email: account.email,
        dark_web_handle: account.dark_web_handle,
        swiss_bank_number: account.swiss_bank_number,
        gold_coins: account.gold_coins,
        death_count: account.death_count
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/auth/me  (protected route)
async function me(req, res) {
  try {
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, email, dark_web_handle, swiss_bank_number, gold_coins, death_count, created_at')
      .eq('id', req.account.account_id)
      .single();

    if (error || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    return res.json({ account });

  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { register, login, me };