const supabase = require('./supabase');

/**
 * Truncates a date to the top of its clock hour (:00:00.000).
 * This ensures that all players worldwide regain 1 AP at every top-of-the-hour tick.
 * E.g., if an action occurs at 1:30pm, the baseline hour tick is 1:00pm.
 * At 2:00pm (the first hourly tick), elapsedHours = 1 -> +1 AP.
 * At 3:00pm (the second hourly tick), elapsedHours = 1 -> +1 AP.
 * Meanwhile, countdowns for Travel/Intel start at button-click (1:30pm) and stop at 3:30pm.
 */
function getHourTimestamp(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

/**
 * Calculates the exact completion timestamp for an AP deficit.
 * Since all operatives regain 1 AP at every top-of-the-clock-hour tick (:00),
 * an operative who incurs an N AP deficit will earn the required AP to pay the deficit
 * at the N-th upcoming clock hour tick (:00:00.000).
 *
 * Examples:
 * - 1 AP deficit at 1:19am -> earns 1 AP at 2:00am -> completes at 2:00am.
 * - 2 AP deficit at 1:19am -> earns 1st AP at 2:00am, 2nd AP at 3:00am -> completes at 3:00am.
 *
 * @param {Date|string|number} startDate
 * @param {number} deficitHours
 * @returns {Date}
 */
function getDeficitCompletionTime(startDate, deficitHours) {
  const d = new Date(startDate);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  if (deficitHours > 1) {
    d.setHours(d.getHours() + (deficitHours - 1));
  }
  return d;
}

/**
 * Regenerates AP and Credits for a specific character based on top-of-the-hour clock ticks.
 * Ensures AP (+1 AP/hr up to max_ap, recovering deficits first) and Credits (hourly pro-rated profession salary)
 * are regained whether the player is logged in or logged off.
 *
 * @param {string} characterId
 * @returns {Promise<{ regenerated: boolean, elapsedHours: number, apGained: number, creditsGained: number, newAp: number, newCredits: number } | null>}
 */
async function applyRegenerationForCharacter(characterId) {
  if (!characterId) return null;

  try {
    const { data: character, error } = await supabase
      .from('characters')
      .select(`
        id,
        account_id,
        name,
        is_alive,
        credits,
        created_at,
        travel_status,
        destination_city_id,
        arrives_at,
        professions(id, name, credits_per_week, ap_modifier),
        action_points(id, current_ap, max_ap, last_regen_at)
      `)
      .eq('id', characterId)
      .single();

    if (error || !character || !character.is_alive) {
      return null;
    }

    const apRow = Array.isArray(character.action_points)
      ? character.action_points[0]
      : character.action_points;

    if (!apRow) {
      return null;
    }

    const now = new Date();
    const lastRegenStr = apRow.last_regen_at || character.created_at || now.toISOString();
    const lastRegenTime = new Date(lastRegenStr);

    if (isNaN(lastRegenTime.getTime())) {
      return null;
    }

    // Top-of-the-hour alignment: all players regain 1 AP at every tick of the clock hour (:00)
    const lastRegenHourMs = getHourTimestamp(lastRegenTime);
    const nowHourMs = getHourTimestamp(now);

    const elapsedMs = nowHourMs - lastRegenHourMs;
    if (elapsedMs < 0) {
      // Clock skew guard
      return null;
    }

    const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));
    if (elapsedHours <= 0) {
      return {
        regenerated: false,
        elapsedHours: 0,
        apGained: 0,
        creditsGained: 0,
        newAp: apRow.current_ap,
        newCredits: character.credits,
      };
    }

    // Cap retroactive offline catchup to 168 hours (1 full week) to prevent unbounded accumulation
    const effectiveHours = Math.min(elapsedHours, 168);

    // 1. AP calculation: +1 AP per real hour tick up to character's max_ap.
    // If operative is in deficit (e.g. -2 AP), each hourly tick recovers 1 AP towards 0, then towards max_ap.
    const apRegenPerHour = 1;
    const apGain = effectiveHours * apRegenPerHour;
    const currentAp = apRow.current_ap ?? 0;
    const maxAp = apRow.max_ap ?? 4;
    const newAp = currentAp < maxAp ? Math.min(maxAp, currentAp + apGain) : currentAp;
    const actualApGained = newAp - currentAp;

    // 2. Credits calculation: hourly pro-rated salary from character's profession
    // (7 days * 24 hours = 168 hours in a week)
    const profession = Array.isArray(character.professions)
      ? character.professions[0]
      : character.professions;
    const creditsPerWeek = profession?.credits_per_week || 0;
    const creditsGained = creditsPerWeek > 0
      ? Math.round((effectiveHours * creditsPerWeek) / 168)
      : 0;
    const newCredits = (character.credits || 0) + creditsGained;

    // 3. Advance last_regen_at to the top-of-the-hour boundary of the processed ticks.
    const newLastRegenAt = new Date(lastRegenHourMs + effectiveHours * 60 * 60 * 1000).toISOString();

    // Persist AP updates
    const { error: apErr } = await supabase
      .from('action_points')
      .update({
        current_ap: newAp,
        last_regen_at: newLastRegenAt,
        updated_at: now.toISOString(),
      })
      .eq('id', apRow.id);

    if (apErr) {
      console.error(`[RegenService] Failed to update AP for ${character.name}:`, apErr);
    }

    // Persist Credits & update last_active_at
    const charUpdatePayload = {
      last_active_at: now.toISOString(),
    };
    if (creditsGained > 0) {
      charUpdatePayload.credits = newCredits;
    }

    const { error: charErr } = await supabase
      .from('characters')
      .update(charUpdatePayload)
      .eq('id', character.id);

    if (charErr) {
      console.error(`[RegenService] Failed to update credits for ${character.name}:`, charErr);
    }

    // Record bank transaction for profession salary income
    if (creditsGained > 0 && character.account_id) {
      try {
        await supabase
          .from('bank_transactions')
          .insert({
            to_account_id: character.account_id,
            amount: creditsGained,
            currency: 'credits',
            reason: 'profession_income',
            created_at: now.toISOString(),
          });
      } catch (txErr) {
        console.warn('[RegenService] Bank transaction log failed:', txErr);
      }
    }

    console.log(`[RegenService] Regenerated for ${character.name} (${effectiveHours}h elapsed): +${actualApGained} AP (now ${newAp}/${maxAp}), +$${creditsGained} Credits (now $${newCredits})`);

    return {
      regenerated: true,
      elapsedHours: effectiveHours,
      apGained: actualApGained,
      creditsGained,
      newAp,
      newCredits,
    };
  } catch (err) {
    console.error(`[RegenService] Unexpected error for character ${characterId}:`, err);
    return null;
  }
}

/**
 * Iterates through all living characters and applies retroactive AP and Credit catch-up.
 */
async function applyRegenerationForAllLivingCharacters() {
  try {
    const { data: livingChars, error } = await supabase
      .from('characters')
      .select('id, name')
      .eq('is_alive', true);

    if (error) {
      console.error('[RegenService] Error fetching living characters:', error);
      return;
    }

    if (!livingChars || livingChars.length === 0) {
      return;
    }

    console.log(`[RegenService] Checking regeneration for ${livingChars.length} living character(s)...`);

    for (const char of livingChars) {
      await applyRegenerationForCharacter(char.id);
    }
  } catch (err) {
    console.error('[RegenService] Batch regeneration failed:', err);
  }
}

module.exports = {
  applyRegenerationForCharacter,
  applyRegenerationForAllLivingCharacters,
  getDeficitCompletionTime,
};
