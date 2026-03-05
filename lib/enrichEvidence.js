/**
 * Enrich evidence array with activity links from the activity_evidence join table.
 *
 * The new architecture (20260308_activity_first migration) stores evidence-activity
 * relationships in the `activity_evidence` table, not on evidence.linked_activity_id.
 * The claim pack generator and validator still expect linked_activity_id and
 * systematic_step_primary on each evidence item, so we backfill those here.
 *
 * For evidence linked to multiple activities or steps, one copy is created per link.
 * Unlinked evidence is kept as-is.
 */
export function enrichEvidenceWithActivityLinks(evidence, activityEvidenceLinks) {
  if (!activityEvidenceLinks || activityEvidenceLinks.length === 0) {
    return evidence || [];
  }

  // Build map: evidence_id -> [{ activity_id, systematic_step }]
  const linkMap = new Map();
  activityEvidenceLinks.forEach(ae => {
    if (!linkMap.has(ae.evidence_id)) {
      linkMap.set(ae.evidence_id, []);
    }
    linkMap.get(ae.evidence_id).push({
      activity_id: ae.activity_id,
      systematic_step: ae.systematic_step,
    });
  });

  const enriched = [];

  (evidence || []).forEach(ev => {
    const links = linkMap.get(ev.id);
    if (links && links.length > 0) {
      // One copy per activity link — generator filters per-activity so duplicates are safe
      links.forEach(link => {
        enriched.push({
          ...ev,
          linked_activity_id: link.activity_id,
          systematic_step_primary: link.systematic_step,
          evidence_type: 'core',
        });
      });
    } else {
      // Unlinked — keep original fields intact
      enriched.push(ev);
    }
  });

  return enriched;
}
