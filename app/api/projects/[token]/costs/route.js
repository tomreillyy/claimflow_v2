import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateSmartAttestations, fillPayrollGaps } from '@/lib/smartApportionment';

// GET - Fetch cost ledger with apportionment
export async function GET(req, { params }) {
  try {
    const { token } = await params;

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch raw ledger entries (unapportioned)
    const { data: rawLedger, error: ledgerError } = await supabaseAdmin
      .from('cost_ledger')
      .select(`
        *,
        upload:payroll_uploads(id, filename, uploaded_at)
      `)
      .eq('project_id', project.id)
      .order('month', { ascending: false })
      .order('person_identifier', { ascending: true });

    if (ledgerError) {
      console.error('Cost ledger fetch error:', ledgerError);
      return NextResponse.json({
        error: 'Failed to fetch cost ledger'
      }, { status: 500 });
    }

    // Fetch activities for display
    const { data: activities } = await supabaseAdmin
      .from('core_activities')
      .select('id, name')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    // AUTO-GENERATE attestations from evidence using smart weighting
    const { data: evidence } = await supabaseAdmin
      .from('evidence')
      .select('id, author_email, created_at, linked_activity_id, systematic_step_primary, content, file_url')
      .eq('project_id', project.id)
      .not('author_email', 'is', null)
      .not('linked_activity_id', 'is', null)
      .or('soft_deleted.is.null,soft_deleted.eq.false');

    let attestations = generateSmartAttestations(evidence || [], activities || [], rawLedger || []);

    // Don't auto-fill gaps - users will manually allocate as needed

    // Apply apportionment logic
    const apportionedLedger = applyApportionment(rawLedger || [], attestations);

    return NextResponse.json({
      ledger: apportionedLedger,
      activities: activities || [],
      attestations: attestations,
      hasAttestations: attestations.length > 0
    });

  } catch (error) {
    console.error('Costs GET error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Apply attestations to raw ledger entries
 * If attestations exist for a person/month, split their costs across activities
 * Otherwise, return raw totals
 */
function applyApportionment(rawLedger, attestations) {
  const result = [];

  // Group raw ledger by person+month
  const ledgerByPersonMonth = new Map();

  for (const entry of rawLedger) {
    const key = `${entry.person_identifier}|${entry.month}`;
    if (!ledgerByPersonMonth.has(key)) {
      ledgerByPersonMonth.set(key, []);
    }
    ledgerByPersonMonth.get(key).push(entry);
  }

  // Group attestations by person+month
  const attestationsByPersonMonth = new Map();

  for (const att of attestations) {
    const key = `${att.person_identifier}|${att.month}`;
    if (!attestationsByPersonMonth.has(key)) {
      attestationsByPersonMonth.set(key, []);
    }
    attestationsByPersonMonth.get(key).push(att);
  }

  // Process each person/month
  for (const [key, entries] of ledgerByPersonMonth.entries()) {
    const atts = attestationsByPersonMonth.get(key);

    if (!atts || atts.length === 0) {
      // No attestations → return unapportioned total
      const totalEntry = {
        ...entries[0], // Use first entry as base
        activity_id: null,
        activity_name: null,
        apportionment_percent: null,
        apportionment_hours: null,
        basis_text: entries[0].basis_text,
        gross_wages: entries.reduce((sum, e) => sum + (parseFloat(e.gross_wages) || 0), 0),
        superannuation: entries.reduce((sum, e) => sum + (parseFloat(e.superannuation) || 0), 0),
        on_costs: entries.reduce((sum, e) => sum + (parseFloat(e.on_costs) || 0), 0),
        total_amount: entries.reduce((sum, e) => sum + (parseFloat(e.total_amount) || 0), 0)
      };

      result.push(totalEntry);
      continue;
    }

    // Has attestations → apportion
    const baseEntry = entries[0];
    const totalGross = entries.reduce((sum, e) => sum + (parseFloat(e.gross_wages) || 0), 0);
    const totalSuper = entries.reduce((sum, e) => sum + (parseFloat(e.superannuation) || 0), 0);
    const totalOnCosts = entries.reduce((sum, e) => sum + (parseFloat(e.on_costs) || 0), 0);
    const totalAmount = totalGross + totalSuper + totalOnCosts;

    // Calculate total allocation (percent or hours)
    const amountType = atts[0].amount_type; // Assume all same type
    const totalAllocated = atts.reduce((sum, a) => sum + parseFloat(a.amount_value), 0);

    const needsScaling = amountType === 'percent' && Math.abs(totalAllocated - 100) > 0.01;

    for (const att of atts) {
      let percent = 0;

      if (amountType === 'percent') {
        percent = parseFloat(att.amount_value);
        if (needsScaling && totalAllocated > 0) {
          percent = (percent / totalAllocated) * 100; // Scale to 100%
        }
      } else if (amountType === 'hours') {
        // Convert hours to percent
        percent = totalAllocated > 0 ? (parseFloat(att.amount_value) / totalAllocated) * 100 : 0;
      }

      const fraction = percent / 100;

      let basisText = baseEntry.basis_text;
      if (needsScaling) {
        basisText += ` [apportionment scaled to 100%]`;
      }

      result.push({
        ...baseEntry,
        id: `${baseEntry.id}_${att.activity_id || 'unallocated'}`, // Generate unique ID
        activity_id: att.activity_id,
        activity_name: att.activity?.name || 'Unallocated',
        apportionment_percent: percent.toFixed(2),
        apportionment_hours: amountType === 'hours' ? parseFloat(att.amount_value) : null,
        basis_text: basisText,
        gross_wages: (totalGross * fraction).toFixed(2),
        superannuation: (totalSuper * fraction).toFixed(2),
        on_costs: (totalOnCosts * fraction).toFixed(2),
        total_amount: (totalAmount * fraction).toFixed(2)
      });
    }
  }

  return result;
}
