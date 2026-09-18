const cron = require('node-cron');
const supabase = require('../services/supabase');
const { applyRegenerationForAllLivingCharacters } = require('../services/regenerationService');
const { syncAndReplenishContracts } = require('../services/contractService');

async function runApRegen() {
  try {
    console.log(`[AP & Credits Regen] Running at ${new Date().toISOString()}`);

    // Run unified regeneration for all living characters (AP + Credits)
    await applyRegenerationForAllLivingCharacters();

    // Process arrivals for travel in transit and completed surveillance probes
    await processQueuedActions();

    // Maintain and replenish global proscription contracts (capped at 5 live)
    await syncAndReplenishContracts();

  } catch (err) {
    console.error('[AP Regen] Unexpected error:', err);
  }
}

async function processQueuedActions() {
  try {
    const now = new Date().toISOString();

    // Check for characters in transit who have now arrived
    const { data: arrivals, error } = await supabase
      .from('characters')
      .select('id, name, destination_city_id, arrives_at')
      .eq('travel_status', 'in_transit')
      .eq('is_alive', true)
      .lte('arrives_at', now);

    if (error) {
      console.error('[AP Regen] Transit check error:', error);
    } else if (arrivals && arrivals.length > 0) {
      console.log(`[AP Regen] Processing ${arrivals.length} arrival(s)`);

      for (const character of arrivals) {
        // Move character to destination
        const { error: arrivalError } = await supabase
          .from('characters')
          .update({
            current_city_id: character.destination_city_id,
            travel_status: 'arrived',
            destination_city_id: null,
            transport_mode: null,
            journey_started_at: null,
            arrives_at: null,
            ap_committed: 0
          })
          .eq('id', character.id);

        if (arrivalError) {
          console.error(`[AP Regen] Arrival error for ${character.name}:`, arrivalError);
        } else {
          console.log(`[AP Regen] ${character.name} has arrived at destination`);

          // Expire any tags on this character since they moved
          await supabase
            .from('tags')
            .delete()
            .eq('target_character_id', character.id);
        }
      }
    }

    // Check for characters in surveillance mode whose probe time has arrived
    const { data: completedSurveillance, error: survError } = await supabase
      .from('characters')
      .select('id, name, account_id, destination_city_id, transport_mode, arrives_at')
      .eq('travel_status', 'in_surveillance')
      .eq('is_alive', true)
      .lte('arrives_at', now);

    if (survError) {
      console.error('[AP Regen] Surveillance check error:', survError);
    } else if (completedSurveillance && completedSurveillance.length > 0) {
      console.log(`[AP Regen] Processing ${completedSurveillance.length} completed surveillance probe(s)`);
      const { completeSurveillanceForCharacter } = require('../controllers/intelController');
      for (const char of completedSurveillance) {
        try {
          await completeSurveillanceForCharacter(char);
          console.log(`[AP Regen] Surveillance probe completed for ${char.name}`);
        } catch (charSurvErr) {
          console.error(`[AP Regen] Error completing surveillance for ${char.name}:`, charSurvErr);
        }
      }
    }

  } catch (err) {
    console.error('[AP Regen] Queue processing error:', err);
  }
}

async function expireTags() {
  try {
    const now = new Date().toISOString();

    const { data: expiredTags, error } = await supabase
      .from('tags')
      .delete()
      .lte('expires_at', now)
      .select('id');

    if (error) {
      console.error('[AP Regen] Tag expiry error:', error);
      return;
    }

    if (expiredTags && expiredTags.length > 0) {
      console.log(`[AP Regen] Expired ${expiredTags.length} tag(s)`);
    }

  } catch (err) {
    console.error('[AP Regen] Tag expiry error:', err);
  }
}

function startApRegenJob() {
  // Run immediate catch-up on startup so offline hours are credited right away
  runApRegen().catch(err => console.error('[AP Regen] Startup catch-up error:', err));
  expireTags().catch(err => console.error('[AP Regen] Startup tag expiry error:', err));

  // Run every hour at the top of the hour (:00) for global AP & Credit regeneration
  cron.schedule('0 * * * *', async () => {
    await runApRegen();
    await expireTags();
  });

  // Check and process completed travel and surveillance queues every minute (* * * * *)
  // This ensures that deficit journeys or probes scheduled to end at e.g. 3:30pm
  // are resolved right when their countdown completes, rather than waiting for the top of the hour.
  cron.schedule('* * * * *', async () => {
    await processQueuedActions();
  });

  console.log('[AP Regen] Job scheduled — hourly regen at :00, queue check every minute, startup catch-up enabled');
}

// Export for testing
module.exports = { startApRegenJob, runApRegen, expireTags };