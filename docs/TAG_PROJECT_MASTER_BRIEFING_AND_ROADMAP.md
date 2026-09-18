# TAG: ESPIONAGE MMORPG
## Master Project Briefing, Updated Game Rules, & Public Deployment Roadmap

*Document Version: 2.4.0*  
*Classification: TOP SECRET // AGENT OPERATIONAL BRIEFING*  
*Timestamp: September 2026*  

---

## TABLE OF CONTENTS
1. [Executive Summary & System Accomplishments](#1-executive-summary--system-accomplishments)
2. [Updated Official Game Rules & Mechanics](#2-updated-official-game-rules--mechanics)
3. [Full-Scale Strategic Roadmap to Public Deployment & Monetization](#3-full-scale-strategic-roadmap-to-public-deployment--monetization)
4. [Comprehensive Frontend & System Live-Testing Matrix](#4-comprehensive-frontend--system-live-testing-matrix)

---

## 1. EXECUTIVE SUMMARY & SYSTEM ACCOMPLISHMENTS

### 1.1 Architecture & Core Foundation
TAG is an espionage-themed, text-driven turn-based browser MMORPG developed with a modern full-stack architecture:
- **Client Frontend**: React 18 with TypeScript, Tailwind CSS, Lucide iconography, and reactive spatial travel/intel dashboards.
- **Game Engine & Backend**: Node.js and Express RESTful API server with custom rate-limiting, authentication tokens, and game action dispatchers.
- **Database Architecture**: PostgreSQL via Supabase with relational schemas, foreign key constraints, and row-level data structures for players, characters, skills, cities, routes, tags, and assassination attempts.
- **Real-Time Jobs**: Autonomous AP regeneration cron service, travel transit resolution, and surveillance deficit countdown timers.

### 1.2 Accomplished Systems & Milestone Modifications

#### A. Character Creation & Identity Architecture
- Multi-step cryptographic onboarding wizard enforcing dark-web handles, email credentials, character codenames, and starting world cities.
- Strict 4-pool skill draft:
  - **3 Assassination Skills** (Close, Short, Medium, Long, Remote)
  - **10 Defensive Skills** (Anti-assassination counter-measures)
  - **3 Intel Skills** (Local, Regional, Continental, Global surveillance probes)
  - **10 Counter-Intel Skills** (Passive surveillance evasion counter-measures)
- Profession assignment (e.g., Arms Dealer, Diplomat, Freelance Mercenary, Intelligence Analyst) modifying weekly Swiss bank deposits and AP recovery rates.

#### B. Surveillance & Intelligence Gathering Engine
- **Targeted Probes**: Precision surveillance targeting a specific operative codename within valid geographic range tiers.
- **City Sweeps**: Wide-net surveillance scanning all living operatives stationed within a target metropolitan area (5x AP and Credit cost multiplier).
- **Matching Counter-Intel Algorithm**: Targets evade surveillance if and only if they have selected the *exact matching skill* in their 10-skill Counter-Intel pool.
- **Tag Generation & Expiration**: Unprotected targets receive an active surveillance tag lasting exactly 48 real-time hours, giving the attacker real-time position tracking and remote assassination eligibility.
- **Surveillance Queueing & AP Deficits**: Probes that exceed current AP commit available AP, establish an AP deficit, and lock the operative into an `in_surveillance` status until the deficit resolves.
- **Probe Abort & Cancellation**: Operatives can abort ongoing surveillance sweeps with partial resource refunds and real-time state resets.

#### C. Travel & Global Logistics Engine
- 20+ metropolitan cities across 6 continents mapped with geographic coordinates, country identifiers, and economic statuses.
- Four interconnected transport networks: **Commercial Flight**, **High-Speed Train**, **Passenger Ferry**, and **Automobile**.
- Travel durations calculated with AP commitments and transit locks (`in_transit`). Operatives in transit cannot execute local actions and are shielded from close-range strikes.
- Live transit countdowns with arrival auto-refresh and journey cancellation options.

#### D. Combat & Assassination Protocol
- Target eligibility verification: Target must be in the same city or tagged with an active surveillance tag.
- Attack weapon selection matched against defender's 10 Defensive skills.
- True Permadeath: Successful strikes permanently terminate target characters (`is_alive: false`), award bounties and Swiss bank credits, log attempt dossiers, and update the global Dark Web Wire kill feed.

#### E. Game Engine Admin Console & NPC System
- **Operatives Roster**: Live operational table of all characters with search, sort, and vitality filtering.
- **Operative Dossier Inspector**: Classified modal displaying complete intelligence dossiers (Attributes, Combat & Intel skills, AP/Credits, Location, Cover).
- **Player Type Classification (PC vs. NPC)**:
  - Seamless distinction between human operatives (`PC`) and autonomous bots (`NPC`).
  - Strict security stripping: `player_type` is filtered out of all player-facing endpoints, ensuring complete secrecy between human players and NPCs.
  - Interactive admin toggles for vitality, PC/NPC classification, and Swiss bank balances.
- **NPC Generator Suite**:
  - Single-Operative Generator with AI/rule-based randomized archetype assignments (Sniper, Spy, Infiltrator, Enforcer, Hacker).
  - Batch NPC Generator for rapid population of cities across the globe.
- **Dynamic Rules & Config Manager**: In-app management for skill costs, AP caps, regen intervals, and travel speeds.

#### F. Critical System Hardening & Bug Fixes
- **PGRST116 Multi-Character Conflict Resolution**: Replaced strict `.single()` calls with `.order('created_at', { ascending: false }).limit(1).maybeSingle()` across all backend controllers (`intelController.js`, `travelController.js`, `assassinationController.js`), preventing crashes when legacy character records exist.
- **Self-Targeting & Account Filtering**: Reinforced queries to prevent operatives from surveillance-probing or tagging themselves or other characters under the same account.
- **Expired Tag Purging**: Active tag endpoints updated to filter out records where `expires_at < NOW()`, preventing phantom tags.

---

## 2. UPDATED OFFICIAL GAME RULES & MECHANICS

### 2.1 The Iron Law of Permadeath
1. Death is irreversible. When your character is assassinated, your operative is permanently eliminated (`is_alive: false`).
2. Upon death, your Swiss bank account is liquidated or transferred according to syndicate rules, your active tags evaporate, and you must start fresh with a new character codename and build.

### 2.2 Action Points (AP) Economy
1. **Capacity & Pool**: Operatives possess a default pool of **4 to 6 AP** (expandable via professions and specializations).
2. **Regeneration Rate**: Default regeneration is **1 AP per hour** (configurable via Admin Console).
3. **The Deficit & Queue Rule**:
   - Actions (Travel, Probes, Strikes) that cost more AP than currently available are permitted if the player has at least 1 AP.
   - The remaining AP is calculated as a deficit (e.g., spending 5 AP with 4 AP creates a `-1 AP` deficit).
   - The operative is placed in an operational queue (`in_transit` or `in_surveillance`) for a duration equal to the deficit in hours (e.g., 1 hour for a 1 AP deficit).
   - During queue lock, the operative cannot launch secondary probes or travel.

### 2.3 The Four Skill Pools
Every operative must maintain exactly four pools upon character creation:

| Pool Name | Capacity | Purpose & Range Tiers | Resolution Mechanic |
| :--- | :--- | :--- | :--- |
| **Assassination** | **3 Skills** | Close, Short, Medium, Long, Remote | Offensive weapon chosen during a strike. |
| **Defensive** | **10 Skills** | Close, Short, Medium, Long, Remote | **Exact Match Rule**: Defender evades/nullifies strike if they possess the *exact weapon counter* in their pool. |
| **Intel** | **3 Skills** | Same City, City, Country, Continent, Global | Offensive surveillance probes to locate and tag enemies. |
| **Counter-Intel** | **10 Skills** | Same City, City, Country, Continent, Global | **Exact Match Rule**: Target evades surveillance if and only if they possess the *exact matching skill* in their Counter-Intel pool. |

### 2.4 Intel & Surveillance Mechanics
1. **Targeted Probe**:
   - Requires knowing the target's exact Codename.
   - Costs base AP & Credits modulated by distance tier (Same City: 1.0x, Country: 1.5x, Continent: 2.0x, Global: 3.0x).
2. **City Sweep**:
   - Scans every operative residing in the target city.
   - Costs **5x base AP** and **5x base Credits**.
3. **Surveillance Outcomes**:
   - **Protected**: If the target operative has the probe skill in their 10-skill Counter-Intel pool, they are shielded. Attacker receives report: *"Target shielded by active counter-measures."*
   - **Tagged**: If unprotected, an active tag is created for **48 hours**. The attacker can monitor the target's current city and transit movements in real-time.

### 2.5 Combat & Strike Rules
1. **Eligibility**: To strike an operative, the attacker must either:
   - Be in the **same city** as the target, OR
   - Hold an **active tag** on the target and utilize a skill with valid range.
2. **Combat Calculation**:
   - Attacker chooses 1 of their 3 Assassination skills.
   - Server queries target's 10 Defensive skills.
   - If target has the matching defense: Strike is blocked or deflected; target receives a near-miss alert.
   - If target does NOT have the matching defense: Target suffers fatal assassination. Attacker claims bounty and kill points.

---

## 3. FULL-SCALE STRATEGIC ROADMAP TO PUBLIC DEPLOYMENT & MONETIZATION

```
[Phase 1: Engine Hardening] ──► [Phase 2: Live UI Testing Suite] ──► [Phase 3: Social & Multiplayer]
                                                                                │
[Phase 6: Public Launch & Revenue] ◄── [Phase 5: Infrastructure] ◄── [Phase 4: Polish & PWA]
```

---

### PHASE 1: CORE ENGINE HARDENING & INTEGRITY VERIFICATION (Current Phase)
*Objective: Eliminate state inconsistencies, test database schemas, and harden endpoints.*
- [x] Unify single-record database queries to prevent PGRST116 crashes.
- [x] Enforce strict PC vs. NPC data isolation so human players cannot identify bots via network inspection.
- [x] Verify AP deficit queueing and surveillance completion timers.
- [x] Deactivate duplicate characters per account and enforce unique active character constraints.
- [ ] Implement database-level triggers to auto-expire tags older than 48 hours.
- [ ] Add audit logging for all Admin Console balance and status modifications.

---

### PHASE 2: COMPREHENSIVE LIVE FRONTEND TESTING SUITE
*Objective: Rigorously execute and verify every interactive UI component on real devices and screen sizes.*
*(Detailed breakdown provided in Section 4 below).*

---

### PHASE 3: MULTIPLAYER SOCIAL DYNAMICS, WIRE & ALERTS
*Objective: Foster high player retention and strategic paranoia through real-time communication channels.*

1. **Dark Web Wire Real-Time Feed**:
   - Instant publication of verified hits, bounties claimed, and public intelligence leaks.
   - Redacted announcements (e.g., *"Operative in Dubai neutralized via long-range sniper fire"*).
2. **Push & Webhook Notification Engine**:
   - **Telegram / Discord Bot Integration**: Direct encrypted alerts when an operative is tagged, when travel arrives, or when an assassination attempt occurs.
   - Browser Web Push notifications for low-AP warnings or tag alerts.
3. **Syndicates & Black Market Intel Trading**:
   - Form clandestine alliances (Syndicates) with shared bankrolls and territory control.
   - **Intel Marketplace**: Sell active 48-hour target tags to third-party hitmen for Swiss bank credits.
4. **Bounty Placement Board**:
   - Players can place open Swiss bank bounties on any living operative's head.

---

### PHASE 4: POLISH, AUDIO-VISUAL ATMOSPHERE, & MOBILE PWA
*Objective: Elevate UI/UX to a world-class, immersive espionage experience.*

1. **Audio & Ambience Engine**:
   - Sub-bass ambient synth drone for dark-mode command terminal.
   - Tactile mechanical keystroke clicks, radar sweep sonar pulses, and teletype printer SFX.
2. **Interactive Tactical World Map**:
   - Vector-rendered interactive world map with animated flight paths, shipping lanes, and satellite orbit trajectories.
   - City heatmaps reflecting operative density and recent violence levels.
3. **Progressive Web App (PWA) Deployment**:
   - Web App Manifest and Service Worker caching for instant home-screen launch on iOS and Android.
   - Safe offline fallback displaying latest classified briefing.

---

### PHASE 5: PRODUCTION INFRASTRUCTURE & SCALABILITY
*Objective: Guarantee zero downtime, anti-cheat security, and scale to 50,000+ concurrent operatives.*

1. **Database & Connection Pooling**:
   - Transition to Supabase Connection Pooling (PgBouncer) or Google Cloud SQL with automated failover.
   - Redis caching layer for city rosters, skill definitions, and active tag lookups.
2. **Security & Anti-Cheat Hardening**:
   - Strict rate-limiting on probe and attack endpoints (prevent automated script-kiddie brute forcing).
   - Encrypted session tokens with automatic IP-anomaly flags.
   - Server-authoritative time checks to prevent client clock manipulation.
3. **Staged Launch Rollout**:
   - **Stage 5A: Closed Alpha (50 Operatives)** — Private playtest with syndicate leaders; balance combat formulas.
   - **Stage 5B: Open Beta (500 Operatives)** — Stress test cron AP regen and concurrent travel queues.
   - **Stage 5C: Global Public Release (v1.0)** — Official server launch.

---

### PHASE 6: MONETIZATION ARCHITECTURE & REVENUE STREAMS
*Guiding Principle: 100% Zero Pay-To-Win. Game balance, combat accuracy, and survival are strictly skill-based.*

```
                       ┌────────────────────────────────────────┐
                       │       ETHICAL MONETIZATION MODEL       │
                       └───────────────────┬────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│ COSMETIC PASSES  │             │   SYNDICATE HQ   │             │ HIGH-STAKES TOUR │
│                  │             │                  │             │                  │
│ • Terminal skins │             │ • Custom badges  │             │ • Tournament buy-│
│ • Custom avatars │             │ • Shared vaults  │             │   ins with cash  │
│ • Kill cam quote │             │ • Private Wire   │             │   or crypto pool │
│ • Cipher styles  │             │ • Bot alerts     │             │ • Last agent     │
└──────────────────┘             └──────────────────┘             └──────────────────┘
```

1. **The Classified "Ghost Protocol" Season Pass ($4.99 / season)**:
   - Unique retro CRT terminal themes (Amber Phosphor, Cyberpunk Matrix Green, Arctic White, Stealth Obsidian).
   - Custom encrypted avatar borders, custom skull kill-icons, and personalized "Last Words" broadcast on the Dark Web Wire when claiming a kill.
   - Detailed end-of-season tactical dossiers (PDF/PNG export of all movements, close calls, and kills).

2. **Syndicate HQ Subscriptions ($9.99 / month per Syndicate)**:
   - Dedicated private Syndicate encrypted chat channel.
   - Real-time Telegram/Discord webhook bot pushing instant syndicate territory alarms.
   - Custom syndicate logo watermark on the World Travel Map.

3. **High-Stakes Elimination Tournaments ($1.00 – $5.00 Buy-In)**:
   - Timed weekend tournaments (e.g., "The Vienna Gauntlet"): 100 operatives enter a restricted 5-city zone.
   - Last surviving operative takes 80% of the prize pool; 20% platform host fee.

4. **Supporter & Intelligence Merch Store**:
   - Physical high-end merchandise: Embroidered agency patches, RFID-blocking metal agent cards with engraved player handles and QR codes linking to their live Dossier.

---

## 4. COMPREHENSIVE FRONTEND & SYSTEM LIVE-TESTING MATRIX

Every core screen and interactive control must undergo systematic validation in live development before public release.

### 4.1 Authentication & Operative Onboarding
- [ ] **Account Registration**: Create account with valid email and dark-web handle. Ensure case-insensitive uniqueness.
- [ ] **Authentication State**: Log in and verify JWT/token storage in `localStorage`. Ensure page reload retains session.
- [ ] **Logout Flow**: Click exit; verify tokens cleared and state immediately redirects to Auth View.
- [ ] **Character Creation Wizard**:
  - [ ] Step 1: Codename entry and duplicate validation.
  - [ ] Step 2: Profession selection and AP modifier verification.
  - [ ] Step 3: Select exactly 3 Assassination skills (block proceed if <3 or >3).
  - [ ] Step 4: Select exactly 10 Defensive skills (block proceed if <10 or >10).
  - [ ] Step 5: Select exactly 3 Intel skills (block proceed if <3 or >3).
  - [ ] Step 6: Select exactly 10 Counter-Intel skills (block proceed if <10 or >10).
  - [ ] Step 7: Select starting world city.
  - [ ] Finalize operative creation and ensure immediate transition to Command Terminal.

### 4.2 Main Command Terminal (Header & HUD)
- [ ] **Operative Vitality Banner**: Correctly displays Codename, City, Nation, AP (e.g., `4/4`), and Swiss Bank Credits.
- [ ] **Live Action Point Bar**: Visual gauge reflects current AP and displays countdown to next AP regeneration.
- [ ] **In-Transit HUD**: When operative begins travel, header displays transport icon, destination city, and countdown timer.
- [ ] **In-Surveillance HUD**: When operative launches probe with AP deficit, header displays radar sweep icon, target city, and remaining deficit timer.
- [ ] **Auto-Refresh Trigger**: When transit or surveillance countdown reaches `00:00:00`, verify client automatically re-syncs state without requiring manual page reload.
- [ ] **Death Notice Modal**: When an operative is assassinated, verify immediate high-contrast modal with cause of death and "Create New Operative" button.

### 4.3 Intel Terminal & Surveillance Operations (Active Live Focus)
- [ ] **Targeted Probe Selection**: Select valid Intel skill and enter an existing operative codename.
- [ ] **City Sweep Selection**: Toggle City Sweep checkbox; verify AP cost multiplies by 5x and credit cost multiplies by 5x.
- [ ] **Geographic Distance Validation**:
  - Test Same City probe (e.g., Local Bribery in Dubai): Allowed.
  - Test Country probe across different cities in same nation: Allowed.
  - Attempt City-tier probe against another continent: Verify system blocks action with clear range error.
- [ ] **AP Deficit & Queue State**:
  - Launch sweep with insufficient AP (e.g., 5 AP required, 4 AP available).
  - Confirm modal states: *"Deficit of 1 AP — probe will complete in 1 hour."*
  - Confirm operative status transitions to `in_surveillance`.
- [ ] **Surveillance Countdown Timer**: Verify ticking countdown in both HUD and Intel Terminal.
- [ ] **Probe Completion & Intelligence Report**:
  - When timer completes, verify generated report displays:
    - Total tagged operatives.
    - Total blocked operatives (protected by Counter-Intel).
    - Detailed list of uncovered targets with their current station city and transit status.
- [ ] **Active Tags Roster**:
  - Verify all successful tags appear under "Active Surveillance Tags".
  - Verify 48-hour expiration countdown displays accurately.
  - Test "Prepare Strike" shortcut button on tag card; verify navigation to Assassination Dossier with target pre-selected.
- [ ] **Surveillance Abort Flow**: Click "Abort Probe", confirm cancellation modal, verify character status reverts to `arrived` and remaining funds are handled properly.

### 4.4 World Travel Map & Movement
- [ ] **Interactive City Nodes**: Verify all 20+ cities render on map with correct coordinate placement.
- [ ] **Stationed City Indicator**: Current city highlighted with distinct pulsing cyan/amber beacon.
- [ ] **Route Selection**: Clicking destination city opens transit modal showing available routes:
  - Flight (fastest, high credit cost, moderate AP).
  - Train (medium speed, moderate cost).
  - Ferry (coastal connections).
  - Automobile (low cost, higher AP/time).
- [ ] **Departure Execution**: Click "Depart"; verify credits/AP deducted and status transitions to `in_transit`.
- [ ] **Travel Cancellation**: Test canceling journey mid-transit; verify character safely halts at origin or nearest waypoint with appropriate fee.

### 4.5 Assassination Dossier & Combat Resolution
- [ ] **Target Selection**: Select target from active 48-hour tags or living operatives in current city.
- [ ] **Weapon Loadout**: Display player's 3 Assassination skills with range and AP costs.
- [ ] **Range Legality Check**: Verify weapon range satisfies distance to target (e.g., knife requires same city; remote sniper allows tagged cross-city).
- [ ] **Execution & Strike Resolution**:
  - Case A (Defender has matching defense): Strike blocked. Attacker loses AP; target receives near-miss warning.
  - Case B (Defender does not have matching defense): Target killed. Attacker credited with bounty and kill points. Target character set to dead.
- [ ] **Combat Dossier Log**: Verify strike outcome logged permanently in `assassination_attempts`.

### 4.6 Dark Web Wire (Global Ticker)
- [ ] **Feed Publication**: Confirm all assassination kills appear in the feed with proper timestamps.
- [ ] **Feed Filtering**: Test filtering between global events, personal alerts, and system notices.

### 4.7 Test Control Drawer (Development Mode)
- [ ] **Quick AP Boost**: Click `+1 AP` or `Max AP`; verify HUD reflects changes immediately.
- [ ] **Quick Credit Deposit**: Click `+$500` or `+$2000`; verify Swiss Bank balance updates.
- [ ] **Instant Transit Finisher**: Click "Complete Travel Now"; verify arrival triggers immediately.
- [ ] **Instant Probe Finisher**: Click "Complete Surveillance Now"; verify report modal triggers and tags generate.

### 4.8 Admin Console & Game Master Suite
- [ ] **Admin Authentication**: Verify `/admin` route requires separate admin credentials and issues distinct admin token.
- [ ] **Operatives Roster**:
  - Filter by Type: All, PC (Human), NPC (Bot).
  - Filter by Vitality: Alive vs Eliminated.
  - Search by Codename or Email.
- [ ] **Operative Dossier Modal**:
  - Click any operative to view full breakdown of their 4 skill pools, attributes, and current station.
  - Test quick AP and Credit adjusters directly within dossier.
  - Test quick vitality toggle (`Alive` <-> `Dead`).
  - Test quick classification toggle (`PC` <-> `NPC`).
- [ ] **NPC Generator**:
  - Single NPC creation with custom archetype presets.
  - Batch NPC creation (e.g., generate 5 bots distributed across European capitals).
  - Verify all generated bots have full 26-skill loadouts (3-10-3-10) and valid station cities.
- [ ] **Skills & Cities Management**:
  - Inspect and update skill AP/credit costs.
  - Inspect and update city coordinates and transport connections.
  - Inspect AP regeneration formulas.

---

## 5. SUMMARY & NEXT OPERATIONAL DIRECTIVES

The TAG Espionage Game Engine now possesses a fully verified tactical combat and surveillance foundation. The primary priority moving forward is executing the **Live Frontend Testing Suite** across each terminal view, followed by opening the **Telegram/Discord Real-Time Notification Bot** and deploying the **Public Beta**.

*Document generated and certified by TAG High Command.*  
*Transmission terminated.*
