/**
 * Seed script for CareLink demo project.
 *
 * Usage:
 *   node scripts/seed-carelink-demo.mjs          # Create project + seed data
 *   node scripts/seed-carelink-demo.mjs --clean   # Delete seeded project and re-create
 *
 * This creates a realistic aged care R&D project with:
 * - Evidence from GitHub, emails, and manual notes
 * - 3 adopted core activities with linked evidence
 * - Realistic RDTI-appropriate content
 *
 * The Jira CSV at scripts/sample-jira-export.csv can then be uploaded
 * via the "Import from Jira" button to demo that feature separately.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = 'https://jjvdvslblcvbxfzeooci.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqdmR2c2xibGN2YnhmemVvb2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc5ODk3MywiZXhwIjoyMDc0Mzc0OTczfQ.t31U-MpJf2gUzMCrQ-PljO98drHIW6NGbRSUoJYlnV8';
const TARGET_USER_ID = 'efe70502-8c4c-47ca-af2d-108fc47d9e99';
const PROJECT_NAME = 'CareBridge - AI Care Coordination Platform';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// FY 2025-26 date helper
function fyDate(fyMonth, day = null, hour = null) {
  const months = [
    [2025, 6], [2025, 7], [2025, 8], [2025, 9], [2025, 10], [2025, 11],
    [2026, 0], [2026, 1], [2026, 2], [2026, 3], [2026, 4], [2026, 5],
  ];
  const [y, m] = months[fyMonth];
  const d = day || Math.floor(Math.random() * 26) + 1;
  const h = hour || Math.floor(Math.random() * 8) + 9;
  const min = Math.floor(Math.random() * 60);
  return new Date(y, m, d, h, min).toISOString();
}

async function cleanExisting() {
  console.log('Cleaning existing CareLink demo data...');

  // Find existing project(s)
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_token')
    .eq('name', PROJECT_NAME)
    .eq('owner_id', TARGET_USER_ID);

  if (!projects || projects.length === 0) {
    console.log('No existing demo project found.');
    return;
  }

  for (const proj of projects) {
    console.log(`Deleting project ${proj.id} (token: ${proj.project_token})...`);

    // Delete in order to respect FK constraints
    await supabase.from('activity_evidence').delete().in('activity_id',
      (await supabase.from('core_activities').select('id').eq('project_id', proj.id)).data?.map(a => a.id) || []
    );
    await supabase.from('core_activities').delete().eq('project_id', proj.id);
    await supabase.from('evidence').delete().eq('project_id', proj.id);
    await supabase.from('projects').delete().eq('id', proj.id);
    console.log(`  Deleted project ${proj.id}`);
  }
}

async function main() {
  const isClean = process.argv.includes('--clean');

  // Look up user
  const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) throw userErr;
  const user = users.find(u => u.id === TARGET_USER_ID);
  if (!user) throw new Error(`User ${TARGET_USER_ID} not found`);
  console.log(`Seeding for: ${user.email}`);

  if (isClean) {
    await cleanExisting();
  }

  // ── CREATE PROJECT ──────────────────────────────────────────────────
  const token = crypto.randomBytes(24).toString('base64url');
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      name: PROJECT_NAME,
      year: 2026,
      project_token: token,
      inbound_email_local: 'p_' + crypto.randomBytes(5).toString('hex'),
      participants: [user.email],
      owner_id: TARGET_USER_ID,
      current_hypothesis: 'We think we can use AI to pull structured data out of our messy care notes, predict when clients are about to deteriorate, and automate the daily roster scheduling. But none of the existing tools work for aged care specifically. Hospital models assume constant monitoring, scheduling tools assume a single location, and the AI text models have never seen aged care abbreviations. We need to figure out if we can make these work in our context.',
      project_overview: 'CareLink Home Services manages about 340 home care package clients across Melbourne metro and regional Victoria. We built CareBridge to solve three big operational problems: (1) care notes are unstructured free-text that nobody has time to manually extract data from, (2) we have no early warning system when clients start declining, we usually only find out when they end up in hospital, and (3) daily roster scheduling takes our coordinators 3-4 hours because they have to juggle skills, travel, client preferences, and award compliance all at once.',
      technical_uncertainty: 'Can AI actually read our care notes accurately when every carer writes differently and uses different abbreviations? Can we predict health deterioration from 3-4 visits a week when hospital models use hourly monitoring? Can we solve a scheduling problem with this many constraints fast enough to be useful?',
      knowledge_gap: 'The AI text extraction models are all trained on hospital data. Nobody has done this for aged care notes. There is no published approach for predicting deterioration from sparse home care visit data. The scheduling problem combines constraints (continuity of care + travel + skills + award compliance) in a way that doesn\'t match any standard optimisation framework.',
      testing_method: 'Tested multiple model architectures and compared results. Ran the AI extraction pipeline across notes from 8 different providers. Validated the risk model with 3 partner organisations over 6 weeks. Tested the scheduling algorithm against real rosters from partners of different sizes.',
      success_criteria: 'AI text extraction: 85%+ accuracy on extracting meds, care needs, and risk flags. Risk model: AUROC above 0.75 with enough lead time to actually intervene. Scheduling: within 5% of optimal in under 60 seconds for a 200-worker roster.',
    })
    .select()
    .single();
  if (projErr) throw projErr;
  console.log(`Created project: ${project.id} (token: ${token})`);

  // ── EVIDENCE ──────────────────────────────────────────────────────────
  const evidence = [
    // === AI Clinical Notes extraction - mixed sources ===
    {
      step: 'Hypothesis',
      source: 'note',
      content: `Had a look at whether we can pull structured info out of the care notes automatically. The problem is our carers all write differently. Some use proper sentences, others use shorthand like "pt w/ mod cog decline, ADLs req 2:1". There's no standard format.\n\nLooked at what's out there. The AI text models (BioBERT etc) are all trained on hospital data - discharge summaries, radiology reports. Nobody's done this for aged care notes specifically. The abbreviations are completely different.\n\nThinking we try fine-tuning one of those models on our data and see how far we get. If we can hit 85%+ accuracy on pulling out meds, care needs, and risk flags, it'd save the clinical team hours of manual data entry.`,
      fyMonth: 0,
    },
    {
      step: 'Experiment',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/pull/47', pr_number: 47 },
      content: `[PR #47] Test AI text models against our care notes\n\nTried BioBERT, ClinicalBERT, and Med7 on ~12k de-identified notes from the last 2 years.\n\nPretty disappointing tbh:\n- BioBERT: 54% - basically useless\n- ClinicalBERT: 62% - best of the lot but still misses heaps\n- Med7: 48% - only decent on medication names\n\nMain issue is the abbreviations. These models have never seen "ACAT" or "HCP L4" or half the shorthand our carers use. They keep splitting multi-word terms into fragments.\n\nOff-the-shelf isn't going to cut it. Need to fine-tune.`,
      fyMonth: 1,
    },
    {
      step: 'Experiment',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/pull/63', pr_number: 63 },
      content: `[PR #63] Fine-tune ClinicalBERT on our annotated notes\n\nGot the clinical team to label 3,200 notes (took them 3 weeks, they weren't thrilled). Tagged care needs, meds, mobility, cognitive stuff, risk flags.\n\nRan 3 rounds of training:\n- First try: 71% - better but not there yet\n- Second try (lower learning rate, more epochs): 78% - getting closer\n- Third try: 76% - started overfitting\n\n78% is the best we got. The model keeps choking on those abbreviated phrases. Like "pt w/ mod-sev cog decline req 2:1 assist" - it splits that into random fragments instead of treating it as one thing.\n\nStill 7 points off our 85% target. Going to try a different approach.`,
      fyMonth: 2,
    },
    {
      step: 'Experiment',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/pull/78', pr_number: 78 },
      content: `[PR #78] Hybrid approach - expand abbreviations before running through the model\n\nHad an idea: what if we normalize all the shorthand BEFORE feeding it to the model? It already understands standard medical language, it just can't read our abbreviations.\n\nBuilt a pre-processing layer with 400+ abbreviation mappings. "pt" -> "patient", "w/" -> "with", "mod-sev cog decline" -> "moderate to severe cognitive decline", etc. Took a while to compile all of these from our actual notes.\n\nResults are way better:\n- Entity extraction: 87.3% F1 (finally above 85%!)\n- Meds extraction: 92.1%\n- False positives on meds dropped from 12% to 3.1%\n\nThis is the approach. The abbreviation expansion was the missing piece.`,
      fyMonth: 3,
    },
    {
      step: 'Observation',
      source: 'note',
      content: `Tested the AI extraction on notes from 8 other aged care providers to see if it generalises.\n\nMixed results:\n- Providers with structured note templates (5 of them): 88-91% - works great\n- Semi-structured notes: 84%\n- One provider who basically writes in text speak: 79% - our abbreviation mappings don't cover their specific shorthand\n- Mixed clinical/admin notes: 81%\n\nFound 3 abbreviation patterns we'd never seen before, added them to the mapping.\n\nOverall cross-validated at 84.8%. Close enough to 85% target. The main risk is onboarding new providers who use different abbreviations, we'll need to keep adding to the lexicon.`,
      fyMonth: 4,
    },
    {
      step: 'Conclusion',
      source: 'note',
      content: `AI extraction pipeline is in production now, processing about 200 notes a day.\n\nWhat we learned:\n- The off-the-shelf models were nowhere near good enough (62% best case). Hospital data and aged care data are just too different.\n- Fine-tuning got us to 78% but the abbreviation problem was a wall\n- The fix was obvious in hindsight - clean up the abbreviations first, then let the model do what it's good at\n- We ended up building a 400+ term aged care abbreviation lexicon. Couldn't find anything like it published anywhere, it's basically new domain knowledge\n\nThe pipeline works but it needs feeding. Every new provider brings new abbreviations. Built a monitoring dashboard to catch when accuracy drops.`,
      fyMonth: 5,
    },

    // === Deterioration Risk Model ===
    {
      step: 'Hypothesis',
      source: 'note',
      content: `From: Sarah Chen (Data Lead)\nTo: Dev Team\nSubject: Can we predict when a client's going to end up in hospital?\n\nBeen thinking about this since the incident with Mrs Patterson last month. She'd been slowly declining for weeks, missed meds, carers noted she seemed confused, but nobody joined the dots until she fell and got admitted.\n\nThe hospital guys have predictive models but they're based on hourly vitals from monitoring equipment. We don't have any of that. We've got visit notes 3-4 times a week, maybe some obs readings, and whatever the carers notice.\n\nIs that enough data to actually predict anything useful? Everything I've found assumes you have regular, frequent measurements. Our data is sparse and all over the place. Some clients get daily visits, some get 2 a week.\n\nWorth a spike to see if there's anything here?`,
      fyMonth: 0,
    },
    {
      step: 'Experiment',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/pull/52', pr_number: 52 },
      content: `[PR #52] Feature engineering for care visit data\n\nFirst challenge: our visit data doesn't fit into normal ML frameworks. Visits happen at irregular intervals and each visit records different things. Can't just throw it into a standard time series model.\n\nBuilt 47 features from the raw data:\n- How long since the last visit (and is that gap unusual for this client?)\n- Is visit frequency changing? (dropping off could be a red flag)\n- Trend in mobility/cognition scores, but with irregular gaps you can't just use pandas rolling windows. Had to write custom windowing code.\n- How many times has a carer flagged a concern in the last 2 weeks?\n\nDataset: 2,400 clients, 180k visit records, 18 months of history.`,
      fyMonth: 1,
    },
    {
      step: 'Experiment',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/pull/71', pr_number: 71 },
      content: `[PR #71] First round of model testing - predicting hospitalisation\n\nTrying to predict unplanned hospital admission within 14 days.\n\nResults:\n- Logistic regression (baseline): 0.61 AUROC - barely better than a coin flip\n- XGBoost: 0.73 AUROC - decent, best so far\n- LSTM: 0.58 AUROC - actually worse than logistic regression\n\nThe LSTM was a surprise. Turns out it really doesn't like irregular time gaps between visits. It expects evenly spaced sequences and ours are all over the place.\n\nXGBoost's top features: mobility score changes, missed meds, cancelled visits, carer concern flags, weight changes. Makes clinical sense which is reassuring.\n\nBut 0.73 is below our 0.75 target. Need a better approach for the sequential stuff.`,
      fyMonth: 2,
    },
    {
      step: 'Experiment',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/pull/89', pr_number: 89 },
      content: `[PR #89] Custom attention model that handles irregular visit timing\n\nSince LSTM failed because of irregular time gaps, tried a different approach. Built a transformer where we encode the actual time between visits instead of just their position in the sequence.\n\nKey changes from a standard transformer:\n- Position encoding uses actual hours/days between visits, not just 1,2,3,4\n- Attention weights decay with time (recent visits count more)\n- Each visit type gets its own embedding (medication check vs personal care vs nursing)\n\nResults: 0.79 AUROC. Properly better than XGBoost now.\n\nThe model is especially good at catching slow deterioration over 4-6 weeks. That's exactly the pattern that humans tend to miss because no single visit looks alarming, it's the trend that matters.`,
      fyMonth: 3,
    },
    {
      step: 'Evaluation',
      source: 'note',
      content: `From: Sarah Chen\nTo: Clinical Team + Dev\nSubject: Risk model pilot results\n\nRan the model with 3 partner orgs for 6 weeks (~800 clients total).\n\nNumbers:\n- AUROC: 0.77 (slightly below the 0.79 we saw in dev, which is expected with new data)\n- At a threshold of 0.35: picks up 82% of actual hospitalisations\n- False positive rate: 18%, so about 1 in 5 alerts is a false alarm\n- Average lead time: 8 days before the hospitalisation happens\n\nFeedback from the care coordinators was positive. 8 days is enough time to actually do something - schedule an extra visit, call the GP, get the family involved. The 18% false positive rate was described as "manageable". They said they'd rather check on someone unnecessarily than miss a real decline.\n\nThey did ask if we can show WHY the model flagged someone. Adding explainability features is next on the list.`,
      fyMonth: 5,
    },

    // === Scheduling Optimisation ===
    {
      step: 'Hypothesis',
      source: 'note',
      content: `From: Mark Torres (Operations Manager)\nTo: Dev Team\nSubject: Roster scheduling is killing us\n\nWe need to talk about scheduling. Lisa and the coordinators are spending 3-4 hours every day building the next day's roster by hand. There's got to be a better way.\n\nThe problem is the number of things they have to juggle:\n- Which carers have the right skills for each client\n- Client preferences (Mrs Lee only wants female carers, Mr James wants the same person each time)\n- Travel time between visits, and our carers are spread across metro Melbourne AND regional\n- Award compliance - can't schedule someone for more than 10 hours, need breaks between shifts\n- Continuity of care - clients do better when they see the same carer consistently\n\nI looked at a few scheduling tools but they're all designed for shift work in a single location. Our problem is different. It's more like a delivery route but with skills matching and relationship continuity on top.\n\nCan we build something? Even getting it to "good enough" in a couple of minutes instead of perfect in 4 hours would be a win.`,
      fyMonth: 0,
    },
    {
      step: 'Experiment',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/pull/55', pr_number: 55 },
      content: `[PR #55] Testing different scheduling approaches\n\nTried three solvers on our actual roster data (200 workers):\n\n1. OR-Tools (exact solver): finds the perfect answer... in 45 minutes. Obviously way too slow for daily use.\n2. Greedy algorithm: runs in 2 seconds but the schedules are 35% worse than optimal. Coordinators looked at the output and said it was "worse than what I'd do by hand."\n3. Genetic algorithm: 40 seconds, gets within 12% of optimal. Better but still not great.\n\nNone of these hit our targets (under 60 seconds AND within 5% of optimal). The exact solver proves it's theoretically solvable, we just need a smarter way to get close to that answer quickly.\n\nThe problem is genuinely hard. The continuity constraint is the killer. It creates dependencies between days that make the search space explode.`,
      fyMonth: 1,
    },
    {
      step: 'Experiment',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/pull/74', pr_number: 74 },
      content: `[PR #74] Two-phase scheduling: eliminate impossible assignments first, then optimise\n\nNew idea: instead of searching the full space, first throw out everything that can't work (wrong skills, too far away, not available) and then optimise what's left.\n\nPhase 1 (constraint propagation):\n- Rules out infeasible assignments automatically\n- Cuts the search space by about 85%\n- Runs in under a second\n\nPhase 2 (simulated annealing on the smaller problem):\n- Custom swap/insert moves designed for our specific constraints\n- Runs on the reduced search space\n\nResults on the 200-worker test:\n- 28 seconds to solve\n- Within 5% of the optimal solution\n- Continuity of care: 89% (vs 76% when coordinators do it manually)\n- 22% less total travel time\n\nThis is actually usable. The coordinators are excited.`,
      fyMonth: 3,
    },
    {
      step: 'Observation',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/pull/82', pr_number: 82 },
      content: `[PR #82] Google Maps travel times are wrong for us, built our own model\n\nWe were getting bad schedules because the travel time estimates were way off. Google Maps says 20 minutes but the carer takes 30 because it's school zone time and they have to park and walk.\n\nTrained a model on 6 months of actual GPS data from our carers (anonymised). It accounts for:\n- Peak hour patterns specific to residential areas\n- School zones (Google Maps ignores these)\n- Actual parking + walking time at client locations\n- Regional vs metro road conditions\n\nResult: estimation error went from 28% (Google Maps) to 9%. That's a massive difference when you're scheduling 200 workers. The accumulated errors from bad travel estimates were wrecking the schedule quality.`,
      fyMonth: 4,
    },
    {
      step: 'Evaluation',
      source: 'note',
      content: `From: Mark Torres\nTo: Steering Committee\nSubject: Scheduling algorithm pilot results\n\nTrialed the new scheduling system with 3 partner organisations over the last month. Here's how it went:\n\n- CareFirst (150 workers, all metro): 24% less travel, solved in 38 seconds. Coordinators reckon it saves them 2.5 hours a day.\n- Homestead Care (200 workers, mix of metro and regional): 22% less travel, 45 seconds. Similar feedback.\n- Regional Caring (320 workers, mostly regional): 18% less travel, 52 seconds. The improvement is smaller here because regional routes are already pretty fixed.\n\nAll within our 60-second target. The continuity of care numbers are better than manual scheduling across the board, 89% vs 76%.\n\nOne issue: the algorithm doesn't handle really remote clients well. When travel times are 60+ minutes it tends to isolate those visits into awkward standalone trips. We need to work on this before rolling out to fully rural providers.\n\nOverall though, this is ready for production for metro and mixed rosters.`,
      fyMonth: 5,
    },

    // === Unlinked evidence (GitHub extras) - will appear in inbox ===
    {
      step: 'Experiment',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/commit/a3f7b2c' },
      content: `[commit a3f7b2c] Add explainability to risk predictions\n\nCare coordinators wanted to know WHY someone got flagged as high risk, not just that they were. Fair enough.\n\nAdded feature importance breakdown so each alert now shows the top contributing factors:\n\n"Margaret S. flagged as high risk:\n- Mobility score trending down: +0.23\n- Missed 3 medications this week: +0.18\n- Carer flagged concern on Tuesday: +0.15\n- 2 visits cancelled in 7 days: +0.12"\n\nMuch more useful than just "high risk". The coordinators can see at a glance what to focus on when they call the client or their family.`,
      fyMonth: 4,
    },
    {
      step: 'Observation',
      source: 'note',
      meta: { type: 'github', github_url: 'https://github.com/carelink/carebridge/pull/96', pr_number: 96 },
      content: `[PR #96] AI extraction monitoring dashboard - first month in prod\n\nSet up automated monitoring to keep an eye on the AI extraction in production.\n\nFirst month stats:\n- Processing ~200 notes/day\n- Average accuracy: 86.2% (holding steady)\n- Found 12 abbreviations we hadn't seen before, added to the lexicon\n- 2 false positive medication alerts got through to the clinical team, they caught them in review\n\nNo major dramas. The abbreviation list is growing as we see notes from new carers. Might need to make that update process easier. Right now someone has to manually add new abbreviations to the mapping file.`,
      fyMonth: 5,
    },
  ];

  // Insert evidence
  const evidenceRows = evidence.map(item => ({
    project_id: project.id,
    content: item.content,
    source: item.source || 'note',
    created_at: fyDate(item.fyMonth),
    soft_deleted: false,
    activity_type: 'core',
    activity_type_source: 'auto',
    systematic_step_primary: item.step,
    systematic_step_source: 'auto',
    meta: item.meta || null,
  }));

  const { data: insertedEvidence, error: evErr } = await supabase
    .from('evidence')
    .insert(evidenceRows)
    .select('id, systematic_step_primary');
  if (evErr) throw evErr;
  console.log(`Created ${insertedEvidence.length} evidence items`);

  // ── CORE ACTIVITIES ────────────────────────────────────────────────────
  const activityDefs = [
    {
      name: 'AI extraction from aged care clinical notes',
      uncertainty: 'Whether AI models can accurately extract structured information (medications, care needs, risk factors) from our care workers\' free-text clinical notes, given the inconsistent writing styles, non-standard abbreviations, and mix of clinical and colloquial language across 200+ care workers.',
      hypothesis_text: 'We thought that if we cleaned up the abbreviations in our care notes before feeding them through a fine-tuned medical AI model, we could get accurate enough extraction to replace manual data entry. The off-the-shelf models couldn\'t handle our abbreviations, and fine-tuning alone only got us partway there.',
      conclusion_text: 'Off-the-shelf medical AI models scored 62% on our notes, not usable. Fine-tuning got us to 78% but hit a ceiling on abbreviated phrases. The fix was a hybrid approach: expand abbreviations with a custom mapping (400+ terms we had to build from scratch) then run through the fine-tuned model. That got us to 87.3%. The abbreviation lexicon was the key, nothing like it existed anywhere.',
      status: 'adopted',
      source: 'ai',
      meta: { category: 'AI Text Extraction', success_criteria: '85%+ accuracy on extracting meds, care needs, and risk flags' },
      evidenceIndices: [0, 1, 2, 3, 4, 5],
    },
    {
      name: 'Predictive risk model for client deterioration',
      uncertainty: 'Whether we can predict when a home care client is about to deteriorate and end up in hospital, using only the sparse data we get from 3-4 care visits per week. All the existing hospital models assume continuous hourly monitoring.',
      hypothesis_text: 'We thought we could build a risk prediction model from our visit data if we designed features specifically for irregular time-series (visits don\'t happen at regular intervals) and used a model architecture that could handle variable time gaps between observations.',
      conclusion_text: 'Standard time-series models (LSTM) completely failed on our irregular visit data (0.58 AUROC, barely better than random). XGBoost did OK (0.73) but a custom transformer with time-delta encoding hit 0.79. In the real-world pilot it picked up 82% of hospitalisations with an 8-day lead time, enough for coordinators to actually intervene. The 18% false positive rate was acceptable to the clinical team.',
      status: 'adopted',
      source: 'ai',
      meta: { category: 'Risk Prediction', success_criteria: 'AUROC above 0.75 with enough lead time to intervene' },
      evidenceIndices: [6, 7, 8, 9, 10],
    },
    {
      name: 'Automated care worker scheduling optimisation',
      uncertainty: 'Whether we can automate daily roster scheduling for 200+ care workers when the problem involves simultaneously matching skills, optimising travel across metro and regional areas, maintaining continuity of care, and complying with award conditions, and do it fast enough to be practical (under 60 seconds).',
      hypothesis_text: 'We thought that if we split the problem in two, first eliminate all the impossible assignments using constraint rules, then optimise what\'s left, we could get the solve time down without sacrificing schedule quality. Neither exact solvers (too slow) nor simple heuristics (too rough) worked on their own.',
      conclusion_text: 'Exact solver found optimal answers but took 45 minutes. Greedy heuristic ran in 2 seconds but gave 35% worse schedules than optimal. Our two-phase approach (constraint propagation to cut 85% of the search space, then simulated annealing on what\'s left) solved in 28 seconds and got within 5% of optimal. Tested with 3 partner orgs, consistently cut travel time by 20%+ and improved continuity of care from 76% to 89%.',
      status: 'adopted',
      source: 'ai',
      meta: { category: 'Optimisation', success_criteria: 'Within 5% of optimal, under 60 seconds, for 200-worker roster' },
      evidenceIndices: [11, 12, 13, 14, 15],
    },
  ];

  for (const actDef of activityDefs) {
    const { data: activity, error: actErr } = await supabase
      .from('core_activities')
      .insert({
        project_id: project.id,
        name: actDef.name,
        uncertainty: actDef.uncertainty,
        hypothesis_text: actDef.hypothesis_text,
        conclusion_text: actDef.conclusion_text,
        status: actDef.status,
        source: actDef.source,
        meta: actDef.meta,
        adopted_at: actDef.status === 'adopted' ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (actErr) throw actErr;
    console.log(`Created activity: ${activity.name} (${activity.status})`);

    // Link evidence
    const links = [];
    for (const idx of actDef.evidenceIndices) {
      const ev = insertedEvidence[idx];
      if (!ev) continue;
      links.push({
        activity_id: activity.id,
        evidence_id: ev.id,
        systematic_step: ev.systematic_step_primary,
        link_source: 'auto',
        link_reason: 'Seeded demo data',
      });
    }
    if (links.length > 0) {
      const { error: linkErr } = await supabase
        .from('activity_evidence')
        .upsert(links, { onConflict: 'activity_id,evidence_id,systematic_step' });
      if (linkErr) console.error(`  Link error:`, linkErr.message);
      else console.log(`  Linked ${links.length} evidence items`);
    }

    // Also set linked_activity_id on evidence records (legacy field)
    for (const idx of actDef.evidenceIndices) {
      const ev = insertedEvidence[idx];
      if (!ev) continue;
      await supabase.from('evidence')
        .update({ linked_activity_id: activity.id, link_source: 'auto', link_reason: 'Seeded demo' })
        .eq('id', ev.id);
    }
  }

  // The remaining evidence (GitHub extras) stay unlinked - they'll appear in the evidence inbox
  console.log(`\n✓ Done!`);
  console.log(`Project token: ${token}`);
  console.log(`URL: /p/${token}`);
  console.log(`\nTo test Jira CSV import, upload: scripts/sample-jira-export.csv`);
  console.log(`To clean up: node scripts/seed-carelink-demo.mjs --clean`);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
