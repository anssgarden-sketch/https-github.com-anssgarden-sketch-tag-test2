const supabase = require('../services/supabase');
const { applyRegenerationForCharacter } = require('../services/regenerationService');
const { 
  triggerVendettaBounty, 
  resolveVendettaKill,
  checkAndRevokeVendettasForKilledIssuer
} = require('../services/contractService');

// Can this assassination skill reach the target given city relationship?
// Close/Short/Medium/Long = same city only (hard cap per design doc)
// Remote = any city (global reach)
function skillCanExecute(skillRange, attackerCityId, targetCityId) {
  if (String(skillRange).toLowerCase() === 'remote') return true;
  return attackerCityId === targetCityId;
}

// Range ordering for counter-attack eligibility (Remote is handled separately —
// remote attacks can never be countered, per design doc).
const RANGE_ORDER = { close: 0, short: 1, medium: 2, long: 3 };

// Pick which of the target's Attack-pool skills fires as the counter-attack.
// Eligibility: range >= the incoming attack's range, AND target can afford this
// specific skill's own AP + credit cost. (Same-city and isBlocked are already
// checked by the caller before this runs.)
// Tie-break order: lowest ap_cost -> lowest credit_cost -> closest range match.
// Fully deterministic — no randomness, consistent with "no dice rolls" elsewhere.
function selectCounterSkill(attackSkillRange, targetAttackSkills, targetAp, targetCredits) {
  const attackRangeValue = RANGE_ORDER[attackSkillRange];

  const eligible = targetAttackSkills.filter(s => {
    const sRange = RANGE_ORDER[s.range];
    return (
      sRange !== undefined &&
      sRange >= attackRangeValue &&
      targetAp >= s.base_ap_cost &&
      targetCredits >= s.base_credit_cost
    );
  });

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    if (a.base_ap_cost !== b.base_ap_cost) return a.base_ap_cost - b.base_ap_cost;
    if (a.base_credit_cost !== b.base_credit_cost) return a.base_credit_cost - b.base_credit_cost;
    return (RANGE_ORDER[a.range] - attackRangeValue) - (RANGE_ORDER[b.range] - attackRangeValue);
  });

  return eligible[0];
}

// POST /api/assassination/execute
async function execute(req, res) {
  try {
    const account_id = req.account.account_id;
    const { target_character_id, skill_id } = req.body;

    if (!target_character_id || !skill_id) {
      return res.status(400).json({ error: 'target_character_id and skill_id are required' });
    }

    // ── 1. Load attacker ──────────────────────────────────────────
    const { data: attacker, error: attackerError } = await supabase
      .from('characters')
      .select(`
        id, name, credits, current_city_id, account_id, kill_count,
        cities!current_city_id(id, name, country),
        action_points(current_ap, max_ap),
        character_skills(skill_id, pool)
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
      return res.status(500).json({ error: 'Action points record missing' });
    }

    if (regen && regen.regenerated) {
      attacker.credits = regen.newCredits;
      apRow.current_ap = regen.newAp;
    }

    const attackerCity = Array.isArray(attacker.cities)
      ? attacker.cities[0]
      : attacker.cities;

    // ── 2. Cannot target yourself ─────────────────────────────────
    if (attacker.id === target_character_id) {
      return res.status(400).json({ error: 'You cannot target yourself' });
    }

    // ── 3. Verify assassination skill ─────────────────────────────
    const { data: hasSkill } = await supabase
      .from('character_skills')
      .select('id')
      .eq('character_id', attacker.id)
      .eq('skill_id', skill_id)
      .eq('pool', 'assassination')
      .single();

    if (!hasSkill) {
      return res.status(400).json({ error: 'You do not have this Assassination skill' });
    }

    const { data: skill } = await supabase
      .from('skills')
      .select('*')
      .eq('id', skill_id)
      .single();

    if (!skill || skill.category !== 'assassination') {
      return res.status(400).json({ error: 'Invalid assassination skill' });
    }

    // ── 4. Load target ────────────────────────────────────────────
    const { data: target, error: targetError } = await supabase
      .from('characters')
      .select(`
        id, name, credits, current_city_id, account_id, is_alive,
        cities!current_city_id(id, name, country),
        action_points(current_ap, max_ap),
        character_skills(
          skill_id, pool,
          skills(id, name, range, base_ap_cost, base_credit_cost)
        )
      `)
      .eq('id', target_character_id)
      .eq('is_alive', true)
      .single();

    if (targetError || !target) {
      return res.status(404).json({ error: 'Target not found or already dead' });
    }

    const targetCity = Array.isArray(target.cities)
      ? target.cities[0]
      : target.cities;

    // ── 5. Check active tag exists ────────────────────────────────
    const { data: tag } = await supabase
      .from('tags')
      .select('id, expires_at')
      .eq('attacker_character_id', attacker.id)
      .eq('target_character_id', target.id)
      .maybeSingle();

    if (!tag) {
      return res.status(400).json({
        error: 'No active tag on this target — run Intel search first'
      });
    }

    // Check tag hasn't expired
    if (new Date(tag.expires_at) < new Date()) {
      await supabase
        .from('tags')
        .delete()
        .eq('id', tag.id);

      return res.status(400).json({
        error: 'Your tag on this target has expired — run Intel search again'
      });
    }

    // ── 6. Check skill range vs city positions ────────────────────
    if (!skillCanExecute(skill.range, attacker.current_city_id, target.current_city_id)) {
      return res.status(400).json({
        error: `Target out of range. ${skill.name} has ${String(skill.range).toUpperCase()} range, which requires operative and target to be in the same city. Operative is in ${attackerCity?.name || 'current sector'}, target is in ${targetCity?.name || 'remote sector'}. Relocate to target sector or utilize a Remote Assassination skill (Car Bomb, IED, Drone Strike, Poison Gas, Cyber Kill).`
      });
    }

    // ── 7. Check AP and credits ───────────────────────────────────
    const currentAp = apRow.current_ap;
    if (currentAp < skill.base_ap_cost) {
      return res.status(400).json({
        error: `Insufficient AP. Need ${skill.base_ap_cost}, have ${currentAp}`
      });
    }

    if (attacker.credits < skill.base_credit_cost) {
      return res.status(400).json({
        error: `Insufficient credits. Need $${skill.base_credit_cost}, have $${attacker.credits}`
      });
    }

    // ── 8. Resolve outcome — PURE COMPUTATION, NO WRITES YET ───────
    // Everything from here to the log insert is decided in memory first.
    // Nothing is written to the DB until we know exactly what happened,
    // so a crash before the log insert means NOTHING changed — safe to retry.
    const isRemote = skill.range === 'remote';
    const sameCityKill = attacker.current_city_id === target.current_city_id;

    const targetDefensiveSkills = (target.character_skills || [])
      .filter(s => s.pool === 'defensive')
      .map(s => s.skill_id);

    const isBlocked = targetDefensiveSkills.includes(skill_id);

    // Full skill details (range, costs) for everything in the target's
    // Attack pool — counter-attacks are selected from here, never from
    // Defense. NOTE: using 'assassination' here to match the pool value
    // this file already uses elsewhere (line ~94, ~191). The design doc
    // now calls this pool "Attack" — confirm the actual DB enum/string
    // value in the `character_skills.pool` column before relying on this;
    // if the column really does store 'attack', change this line to match.
    const targetAttackSkills = (target.character_skills || [])
      .filter(s => s.pool === 'assassination')
      .map(s => s.skills)
      .filter(Boolean);

    const targetApRow = Array.isArray(target.action_points)
      ? target.action_points[0]
      : target.action_points;

    // Attacker's own Defense pool — a counter-attack is not automatically
    // lethal. If the counter skill the target selected also matches one of
    // the ORIGINAL ATTACKER's defensive skills (same exact-match rule as
    // isBlocked above, just run in reverse), both characters survive.
    const attackerDefensiveSkills = (attacker.character_skills || [])
      .filter(s => s.pool === 'defensive')
      .map(s => s.skill_id);

    let outcome;
    let counterSkill = null;
    let attackerDefended = false;

    if (isBlocked && !isRemote && sameCityKill) {
      const targetAp = targetApRow ? targetApRow.current_ap : 0;

      counterSkill = selectCounterSkill(skill.range, targetAttackSkills, targetAp, target.credits);

      if (counterSkill) {
        attackerDefended = attackerDefensiveSkills.includes(counterSkill.id);
        outcome = attackerDefended ? 'mutual_survival' : 'counter_attacked';
      } else {
        outcome = 'survived';
      }
    } else {
      // Remote kills cannot be countered even if defense matches.
      // No counter possible cross-city either.
      outcome = 'killed';
    }

    // ── 9. WRITE PHASE 1: deduct attacker AP/credits + log attempt ─
    // This is the durable record of "this action happened with this outcome."
    // If anything below this point fails, we at least know what should
    // have occurred and can reconcile manually or via a recovery job.
    const { error: apDeductError } = await supabase
      .from('action_points')
      .update({
        current_ap: currentAp - skill.base_ap_cost,
        updated_at: new Date().toISOString()
      })
      .eq('character_id', attacker.id);

    if (apDeductError) {
      console.error('AP deduct error:', apDeductError);
      return res.status(500).json({ error: 'Failed to deduct AP' });
    }

    const { error: creditDeductError } = await supabase
      .from('characters')
      .update({ credits: attacker.credits - skill.base_credit_cost })
      .eq('id', attacker.id);

    if (creditDeductError) {
      console.error('Credit deduct error:', creditDeductError);
      return res.status(500).json({ error: 'Failed to deduct credits' });
    }

    // Log the attempt first — this is the source of truth going forward.
    // Must happen while the tag row still exists: tag_id is a FK, so
    // deleting the tag before this insert makes the FK reference a row
    // that's already gone and the insert fails.
    const { data: loggedAttempt, error: logError } = await supabase
      .from('assassination_attempts')
      .insert({
        attacker_character_id: attacker.id,
        target_character_id: target.id,
        skill_id,
        city_id: attacker.current_city_id,
        tag_id: tag.id,
        outcome,
        ap_spent: skill.base_ap_cost,
        credits_spent: skill.base_credit_cost,
        was_queued: false
      })
      .select('id')
      .single();
    if (logError) {
      console.error('Attempt log error:', logError);
      return res.status(500).json({
        error: 'Attempt could not be logged. AP and credits were spent but the kill was not applied. Contact support with this attacker ID: ' + attacker.id
      });
    }

    // Consume the tag now — it's used up regardless of outcome.
    // Safe after the attempt row exists: ON DELETE SET NULL on
    // assassination_attempts.tag_id means the log survives this.
    await supabase
      .from('tags')
      .delete()
      .eq('id', tag.id);

    // ── 10. WRITE PHASE 2: apply consequences to characters ────────
    // Outcome is fixed and logged. From here we just apply it.
    let counterAttackResult = null;
    let revokedVendettas = [];

    if (outcome === 'killed') {
      await supabase
        .from('characters')
        .update({
          is_alive: false,
          killed_by_account_id: account_id,
          killed_with_skill_id: skill_id
        })
        .eq('id', target.id);

      // Sedes Obscura Bounty & Escrow Settlement: transfer target's liquid credits as bounty to killer
      const bountyAward = Math.max(0, parseInt(target.credits, 10) || 0);

      // Check if target had a private Vendetta bounty placed on them
      let vendettaBountySettlement = 0;
      try {
        vendettaBountySettlement = await resolveVendettaKill(target.id, account_id);
      } catch (vErr) {
        console.warn('Vendetta resolution error:', vErr);
      }

      const totalCreditsAward = bountyAward + vendettaBountySettlement;

      await supabase
        .from('characters')
        .update({ 
          kill_count: (attacker.kill_count || 0) + 1,
          credits: (attacker.credits || 0) + totalCreditsAward
        })
        .eq('id', attacker.id);

      if (bountyAward > 0) {
        try {
          await supabase.from('bank_transactions').insert({
            to_account_id: account_id,
            amount: bountyAward,
            currency: 'credits',
            reason: `bounty_settlement_kill_${target.name || 'target'}`,
            created_at: new Date().toISOString()
          });
        } catch (bErr) {
          console.warn('Bank transaction logging skipped:', bErr);
        }
      }

      if (vendettaBountySettlement > 0) {
        try {
          await supabase.from('bank_transactions').insert({
            to_account_id: account_id,
            amount: vendettaBountySettlement,
            currency: 'credits',
            reason: `private_vendetta_escrow_claim_${target.name || 'target'}`,
            created_at: new Date().toISOString()
          });
        } catch (bErr) {
          console.warn('Vendetta bank transaction logging skipped:', bErr);
        }
      }

      // Check if the eliminated target was an issuing patron for any active blood-debt contracts
      try {
        revokedVendettas = await checkAndRevokeVendettasForKilledIssuer(target.id, account_id);
      } catch (revErr) {
        console.warn('Error revoking vendettas for killed patron:', revErr);
      }

    } else if (outcome === 'counter_attacked' || outcome === 'mutual_survival') {
      // Target pays the counter skill's OWN cost — same rule as an attacker
      // paying for their skill. Not the incoming attack's cost. This holds
      // even in the mutual_survival case: the target still spent the AP/
      // credits attempting the counter, same principle as the attacker
      // always paying even when their attack ends up blocked.
      await supabase
        .from('action_points')
        .update({
          current_ap: targetApRow.current_ap - counterSkill.base_ap_cost,
          updated_at: new Date().toISOString()
        })
        .eq('character_id', target.id);

      await supabase
        .from('characters')
        .update({ credits: target.credits - counterSkill.base_credit_cost })
        .eq('id', target.id);

      if (outcome === 'counter_attacked') {
        await supabase
          .from('characters')
          .update({
            is_alive: false,
            killed_by_account_id: target.account_id,
            // Pulled from the TARGET's Attack pool — never the attacker's skill_id.
            killed_with_skill_id: counterSkill.id
          })
          .eq('id', attacker.id);
      }
      // mutual_survival: attacker's Defense pool blocked the counter, same
      // as isBlocked does for the original attack. Neither character's
      // is_alive or killed_with_skill_id changes.

      counterAttackResult = {
        counter_attacker: target.name,
        counter_skill: counterSkill.name,
        counter_ap_spent: counterSkill.base_ap_cost,
        counter_credits_spent: counterSkill.base_credit_cost,
        attacker_killed: outcome === 'counter_attacked',
        blocked_by_attacker_defense: outcome === 'mutual_survival'
      };
    }
    // 'survived' outcome requires no further character mutation

    // ── 11. Ticker event (best-effort, non-critical) ────────────────
    if (outcome === 'killed' || outcome === 'counter_attacked') {
      const deadCity = outcome === 'killed' ? targetCity.name : attackerCity.name;
      const deadCityId = outcome === 'killed' ? target.current_city_id : attacker.current_city_id;

      try {
        await supabase
          .from('ticker_events')
          .insert({
            event_type: 'body_found',
            city_id: deadCityId,
            message: `An unidentified body was found in ${deadCity}.`
          });
      } catch (tickerErr) {
        console.error('Ticker event error (non-critical):', tickerErr);
      }
    }

    // ── 11b. Reckless / Unsanctioned Assault: Vendetta Retaliation ──
    let vendettaBountyPlaced = null;
    if (outcome !== 'counter_attacked') {
      try {
        vendettaBountyPlaced = await triggerVendettaBounty({
          attacker,
          target,
          attackerCity,
          targetCity,
          outcome
        });

        if (vendettaBountyPlaced) {
          try {
            await supabase
              .from('ticker_events')
              .insert({
                event_type: 'bounty_posted',
                city_id: attacker.current_city_id,
                message: `Private Blood-Debt Declared: ${vendettaBountyPlaced.issued_by} posted ${vendettaBountyPlaced.bounty_credits} CHF bounty on operative ${attacker.name}.`
              });
          } catch {}
        }
      } catch (vErr) {
        console.error('Error triggering vendetta retaliation:', vErr);
      }
    }

    // ── 12. Build response ────────────────────────────────────────
    const response = {
      outcome,
      attempt_id: loggedAttempt.id,
      skill_used: skill.name,
      ap_spent: skill.base_ap_cost,
      credits_spent: skill.base_credit_cost,
      remaining_ap: currentAp - skill.base_ap_cost,
      remaining_credits: attacker.credits - skill.base_credit_cost,
      tag_consumed: true,
      vendetta_bounty: vendettaBountyPlaced
    };

    if (vendettaBountyPlaced) {
      response.vendetta_warning = `⚠️ PRIVATE RETALIATION: Associates of ${target.name} have declared a blood debt! A ${vendettaBountyPlaced.bounty_credits} CHF private bounty has been placed on your head for an unsanctioned strike in ${targetCity.name}.`;
    }

    if (revokedVendettas && revokedVendettas.length > 0) {
      response.revoked_vendettas = revokedVendettas;
      response.patron_eliminated_notice = `🎯 CONTRACT PATRON ELIMINATED: You assassinated ${target.name}! The private blood-debt contract issued by them has ceased immediately. All bounties on their targets are nullified.`;
    }

    // Identity disclosure (locked rule, see DESIGN.md):
    // - failed, no counter: target informed an attempt occurred, NOT who did it
    // - failed, counter SUCCEEDS (assassin dies): assassin's identity IS revealed
    // - mutual survival: treated same as plain failed attempt, identity NOT revealed
    if (outcome === 'killed') {
      response.message = isRemote
        ? `${target.name} has been eliminated. Your identity remains unknown.`
        : `${target.name} has been eliminated in ${targetCity.name}.`;
      response.target_alive = false;
    } else if (outcome === 'counter_attacked') {
      response.message = `${target.name} detected the attempt and counter-attacked. You are dead.`;
      response.target_alive = true;
      response.attacker_alive = false;
      response.counter_attack = counterAttackResult;
      response.attacker_identity_revealed = true;
    } else if (outcome === 'mutual_survival') {
      response.message = `${target.name} tried to counter-attack, but your own defenses protected you. Both of you survive.`;
      response.target_alive = true;
      response.attacker_alive = true;
      response.counter_attack = counterAttackResult;
      response.attacker_identity_revealed = false;
    } else if (outcome === 'survived') {
      response.message = `${target.name} survived — their defenses blocked your attempt.`;
      response.target_alive = true;
      response.attacker_alive = true;
      response.attacker_identity_revealed = false;
    }

    return res.json(response);

  } catch (err) {
    console.error('Assassination execute error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/assassination/attempts
// View your assassination attempt history
async function getAttempts(req, res) {
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

    const { data: attempts, error } = await supabase
      .from('assassination_attempts')
      .select(`
        id, outcome, ap_spent, credits_spent, was_queued, attempted_at,
        skills!skill_id(name, range),
        cities!city_id(name, country),
        characters!target_character_id(name, is_alive)
      `)
      .eq('attacker_character_id', character.id)
      .order('attempted_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Get attempts error:', error);
      return res.status(500).json({ error: 'Failed to retrieve attempts' });
    }

    return res.json({
      attempts: attempts || [],
      count: attempts?.length || 0
    });

  } catch (err) {
    console.error('Get attempts error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { execute, getAttempts };
