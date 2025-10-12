/**
 * Smart Apportionment Algorithm
 * Auto-generates monthly attestations from evidence with weighted scoring
 */

// Weighting constants
const STEP_WEIGHTS = {
  'Conclusion': 2.0,
  'Evaluation': 2.0,
  'Observation': 1.5,
  'Experiment': 1.5,
  'Hypothesis': 1.0,
  'Unknown': 0.8
};

const RECENCY_HALF_LIFE_DAYS = 45; // Evidence loses 50% weight after 45 days
const HAS_ATTACHMENT_MULTIPLIER = 1.2;
const MIN_CONTENT_LENGTH_FOR_FULL_WEIGHT = 200;
const PART_TIME_THRESHOLD = 0.4; // If person has <40% of team avg cost, likely part-time

/**
 * Calculate weighted score for a single evidence item
 * @param {Object} evidence - Evidence object with content, step, created_at, file_url
 * @param {Date} monthDate - Month being calculated (for recency)
 * @returns {number} - Weighted score
 */
function calculateEvidenceWeight(evidence, monthDate) {
  let weight = 1.0;

  // Step importance weight
  const step = evidence.systematic_step_primary || 'Unknown';
  weight *= (STEP_WEIGHTS[step] || 1.0);

  // Content length weight (logarithmic curve)
  const contentLength = evidence.content?.trim().length || 0;
  if (contentLength > 0) {
    const lengthFactor = Math.min(1.0, Math.log10(contentLength + 1) / Math.log10(MIN_CONTENT_LENGTH_FOR_FULL_WEIGHT + 1));
    weight *= lengthFactor;
  } else if (!evidence.file_url) {
    // No content and no file = very low weight
    weight *= 0.3;
  }

  // Attachment boost
  if (evidence.file_url) {
    weight *= HAS_ATTACHMENT_MULTIPLIER;
  }

  // Recency decay (exponential)
  const evidenceDate = new Date(evidence.created_at);
  const daysDiff = (monthDate - evidenceDate) / (1000 * 60 * 60 * 24);
  if (daysDiff > 0) {
    const decayFactor = Math.pow(0.5, daysDiff / RECENCY_HALF_LIFE_DAYS);
    weight *= decayFactor;
  }

  return weight;
}

/**
 * Detect part-time employees based on payroll cost relative to team average
 * @param {Array} ledgerEntries - Raw cost ledger entries
 * @returns {Map} - person_identifier → FTE estimate (0.0-1.0)
 */
function estimateFTEFromPayroll(ledgerEntries) {
  const fteEstimates = new Map();

  // Group by month
  const byMonth = new Map();
  for (const entry of ledgerEntries) {
    if (!byMonth.has(entry.month)) {
      byMonth.set(entry.month, []);
    }
    byMonth.get(entry.month).push(entry);
  }

  // For each month, calculate FTE based on relative cost
  for (const [month, entries] of byMonth.entries()) {
    const totalCosts = entries.map(e => parseFloat(e.total_amount) || 0);
    const avgCost = totalCosts.reduce((sum, c) => sum + c, 0) / totalCosts.length;
    const maxCost = Math.max(...totalCosts);

    for (const entry of entries) {
      const cost = parseFloat(entry.total_amount) || 0;

      // Use max cost as reference for full-time
      let fte = maxCost > 0 ? cost / maxCost : 1.0;

      // Clamp to reasonable range
      fte = Math.max(0.1, Math.min(1.0, fte));

      // Store highest FTE seen for this person across all months
      const currentFTE = fteEstimates.get(entry.person_identifier) || 0;
      if (fte > currentFTE) {
        fteEstimates.set(entry.person_identifier, fte);
      }
    }
  }

  return fteEstimates;
}

/**
 * Generate smart attestations from evidence
 * @param {Array} evidence - All evidence items with author_email, linked_activity_id, created_at, etc.
 * @param {Array} activities - Core activities
 * @param {Array} ledgerEntries - Raw payroll entries (for FTE detection)
 * @returns {Array} - Attestations with person, month, activity, allocation %, confidence score
 */
export function generateSmartAttestations(evidence, activities, ledgerEntries = []) {
  const attestations = [];

  // Build activity lookup
  const activityMap = new Map(activities.map(a => [a.id, a]));

  // Estimate FTEs from payroll data
  const fteEstimates = estimateFTEFromPayroll(ledgerEntries);

  // Group evidence by person + month + activity
  const grouped = new Map();

  for (const item of evidence) {
    if (!item.author_email || !item.linked_activity_id) continue;

    const date = new Date(item.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    const key = `${item.author_email}|${monthKey}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        email: item.author_email,
        month: monthKey,
        monthDate: new Date(monthKey),
        activities: new Map(),
        totalWeight: 0,
        evidenceCount: 0
      });
    }

    const group = grouped.get(key);
    const monthDate = group.monthDate;

    // Calculate weighted score for this evidence
    const weight = calculateEvidenceWeight(item, monthDate);

    const activityData = group.activities.get(item.linked_activity_id) || {
      weight: 0,
      count: 0,
      evidenceIds: []
    };

    activityData.weight += weight;
    activityData.count += 1;
    activityData.evidenceIds.push(item.id);

    group.activities.set(item.linked_activity_id, activityData);
    group.totalWeight += weight;
    group.evidenceCount += 1;
  }

  // Calculate percentages and confidence scores
  for (const [key, group] of grouped.entries()) {
    if (group.totalWeight === 0) continue;

    const fte = fteEstimates.get(group.email) || 1.0;

    for (const [activityId, activityData] of group.activities.entries()) {
      const activity = activityMap.get(activityId);
      if (!activity) continue;

      // Calculate base allocation percentage
      let percent = (activityData.weight / group.totalWeight) * 100;

      // Adjust for part-time (if FTE < 1.0, don't claim full-time allocation)
      // This is a soft adjustment - we still allocate 100% of their evidence time
      // but flag low confidence if FTE mismatch is significant

      // Calculate confidence score
      let confidence = 1.0;

      // Reduce confidence if:
      // - Very few evidence items (< 3)
      if (activityData.count < 3) {
        confidence *= 0.7;
      }

      // - Low total weight (indicates thin/short evidence)
      if (activityData.weight < 2.0) {
        confidence *= 0.8;
      }

      // - Part-time employee with high allocation (might be over-claiming)
      if (fte < 0.6 && percent > 80) {
        confidence *= 0.6;
      }

      // - Single activity for month (no comparison, could be inaccurate)
      if (group.activities.size === 1) {
        confidence *= 0.9;
      }

      // Generate attestation
      attestations.push({
        person_identifier: group.email,
        person_email: group.email,
        month: group.month,
        activity_id: activityId,
        activity: { name: activity.name },
        amount_type: 'percent',
        amount_value: Math.round(percent * 100) / 100, // Round to 2 decimals
        confidence_score: Math.round(confidence * 100) / 100,
        evidence_count: activityData.count,
        total_evidence: group.evidenceCount,
        calculation_basis: {
          total_weight: Math.round(activityData.weight * 100) / 100,
          fte_estimate: fte,
          evidence_ids: activityData.evidenceIds
        },
        created_by: 'auto_smart'
      });
    }
  }

  // Handle normalization: if person's total across activities != 100%, scale to 100%
  const byPersonMonth = new Map();
  for (const att of attestations) {
    const key = `${att.person_identifier}|${att.month}`;
    if (!byPersonMonth.has(key)) {
      byPersonMonth.set(key, []);
    }
    byPersonMonth.get(key).push(att);
  }

  const normalized = [];
  for (const [key, atts] of byPersonMonth.entries()) {
    const totalPercent = atts.reduce((sum, a) => sum + parseFloat(a.amount_value), 0);

    // Only normalize if significantly off from 100% (> 2% diff)
    const needsNormalization = Math.abs(totalPercent - 100) > 2;

    for (const att of atts) {
      const normalizedAtt = { ...att };

      if (needsNormalization && totalPercent > 0) {
        normalizedAtt.amount_value = Math.round((att.amount_value / totalPercent) * 100 * 100) / 100;
        normalizedAtt.calculation_basis.normalized = true;
        normalizedAtt.calculation_basis.original_percent = att.amount_value;
        // Reduce confidence slightly when we had to normalize
        normalizedAtt.confidence_score = Math.round(normalizedAtt.confidence_score * 0.95 * 100) / 100;
      }

      normalized.push(normalizedAtt);
    }
  }

  return normalized;
}

/**
 * Handle edge case: person has payroll but no evidence for a month
 * Creates "unallocated" attestation as fallback
 * @param {Array} attestations - Existing attestations
 * @param {Array} ledgerEntries - Raw payroll entries
 * @param {Array} activities - Core activities
 * @returns {Array} - Attestations with gap-fill entries added
 */
export function fillPayrollGaps(attestations, ledgerEntries, activities) {
  // Build set of covered person+month combinations
  const covered = new Set(
    attestations.map(a => `${a.person_identifier}|${a.month}`)
  );

  const gapFills = [];

  // Check each payroll entry
  for (const entry of ledgerEntries) {
    const key = `${entry.person_identifier}|${entry.month}`;

    if (!covered.has(key)) {
      // This person has payroll but no evidence-based attestation
      // Create low-confidence "Unallocated" entry
      gapFills.push({
        person_identifier: entry.person_identifier,
        person_email: entry.person_email,
        month: entry.month,
        activity_id: null,
        activity: { name: 'Unallocated' },
        amount_type: 'percent',
        amount_value: 100.0,
        confidence_score: 0.3, // Very low confidence - no evidence found
        evidence_count: 0,
        total_evidence: 0,
        calculation_basis: {
          reason: 'no_evidence_found',
          note: 'Person has payroll but no evidence for this month'
        },
        created_by: 'auto_gap_fill'
      });

      covered.add(key); // Prevent duplicates
    }
  }

  return [...attestations, ...gapFills];
}
