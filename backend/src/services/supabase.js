const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function normalizeSupabaseUrl(url, serviceKey) {
  let cleanUrl = (url || '').trim().replace(/\/$/, '');

  // If URL points to Supabase dashboard e.g. https://supabase.com/dashboard/project/xmzmfdutuaicnqlcikdw
  const dashboardMatch = cleanUrl.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
  if (dashboardMatch) {
    cleanUrl = `https://${dashboardMatch[1]}.supabase.co`;
  } else if (cleanUrl.startsWith('db.')) {
    cleanUrl = `https://${cleanUrl.replace(/^db\./, '')}`;
  } else if (/^[a-zA-Z0-9]{20}$/.test(cleanUrl)) {
    // If just project ref was passed
    cleanUrl = `https://${cleanUrl}.supabase.co`;
  } else if ((!cleanUrl.includes('.supabase.co') || !cleanUrl.startsWith('http')) && serviceKey) {
    // Attempt decoding project ref from Supabase JWT token payload
    try {
      const parts = serviceKey.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload.ref) {
          cleanUrl = `https://${payload.ref}.supabase.co`;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!cleanUrl || !cleanUrl.startsWith('http')) {
    cleanUrl = 'https://xmzmfdutuaicnqlcikdw.supabase.co';
  }

  return cleanUrl;
}

const rawKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();
const cleanUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL, rawKey);

// Update process.env so any other consumers get the clean endpoint
process.env.SUPABASE_URL = cleanUrl;

const supabase = createClient(cleanUrl, rawKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = supabase;

