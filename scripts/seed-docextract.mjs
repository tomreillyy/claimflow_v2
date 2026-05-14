/**
 * Seed script — Smart Document Extraction System demo project.
 * Run: node scripts/seed-docextract.mjs
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = 'https://jjvdvslblcvbxfzeooci.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqdmR2c2xibGN2YnhmemVvb2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc5ODk3MywiZXhwIjoyMDc0Mzc0OTczfQ.t31U-MpJf2gUzMCrQ-PljO98drHIW6NGbRSUoJYlnV8';
const TARGET_USER_ID = 'efe70502-8c4c-47ca-af2d-108fc47d9e99';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Random ISO timestamp within a given FY2025-26 month
// month: 0=Jul2025, 1=Aug2025, ..., 11=Jun2026
function randDate(fyMonth) {
  const months = [
    [2025, 6], [2025, 7], [2025, 8], [2025, 9], [2025, 10], [2025, 11],
    [2026, 0], [2026, 1], [2026, 2], [2026, 3], [2026, 4], [2026, 5],
  ];
  const [y, m] = months[fyMonth];
  const day = Math.floor(Math.random() * 26) + 1;
  const hour = Math.floor(Math.random() * 8) + 9;
  const min = Math.floor(Math.random() * 60);
  return new Date(y, m, day, hour, min).toISOString();
}

async function main() {
  const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) throw userErr;
  const user = users.find(u => u.id === TARGET_USER_ID);
  if (!user) throw new Error(`User ${TARGET_USER_ID} not found`);
  console.log(`Seeding for: ${user.email}`);

  // ── CREATE PROJECT ──
  const token = crypto.randomBytes(24).toString('base64url');
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      name: 'Docuflow – Smart Document Extraction',
      year: 2026,
      project_token: token,
      inbound_email_local: 'p_' + crypto.randomBytes(5).toString('hex'),
      participants: [user.email],
      owner_id: TARGET_USER_ID,
      current_hypothesis: 'We believe we can build a system that reliably extracts structured data from messy real-world documents (PDFs, scanned images, emails) where layout, wording, quality, and completeness vary significantly — but we are not certain whether extraction accuracy can reach the threshold needed for production use without excessive human review.',
      project_overview: 'Docuflow is a B2B SaaS platform that processes incoming business documents — invoices, purchase orders, contracts, compliance certificates — and extracts structured data for downstream systems. Customers upload documents via email, web portal, or API integration. The core technical challenge is that real-world business documents are wildly inconsistent: scanned at various qualities, use different layouts for the same document type, contain handwritten annotations, and frequently have missing or ambiguous fields. The project aimed to build an extraction pipeline that handles this messiness reliably enough to reduce manual data entry by at least 70%.',
      technical_uncertainty: 'Whether a combination of OCR, layout analysis, and ML-based field extraction can achieve ≥85% accuracy on real-world business documents where format, quality, and completeness vary significantly across suppliers and document types.',
      knowledge_gap: 'Existing OCR solutions (Tesseract, AWS Textract, Google Document AI) perform well on clean, structured documents but their accuracy on scanned, rotated, or handwritten-annotated documents was unknown for our specific use case. No published approach addressed the combination of layout-aware parsing with cross-document field validation that our customers require.',
      testing_method: 'Benchmarking extraction accuracy across a curated test set of 500 real customer documents spanning 12 document types, 47 suppliers, and varying quality levels. Measuring field-level precision, recall, and F1 score.',
      success_criteria: 'Field-level extraction accuracy ≥85% across all document types. False positive rate for flagged anomalies <5%. Processing time <30 seconds per document.',
    })
    .select()
    .single();
  if (projErr) throw projErr;
  console.log(`Created project: ${project.id} (token: ${token})`);

  // ── EVIDENCE ITEMS ──
  const evidenceItems = [
    // ── HYPOTHESIS ──
    {
      step: 'Hypothesis',
      source: 'note',
      content: `Product kickoff notes — July 2025\nMet with 3 prospective customers to validate the problem. Key takeaways:\n- Average accounts payable team processes 400-600 invoices/month manually\n- Error rate on manual entry is ~4-7% — causes payment delays and supplier disputes\n- Existing solutions they've tried (ABBYY, Kofax) work on their own templates but break on supplier documents\n- One customer said: "We've tried 4 tools. They all demo well on clean PDFs. In reality, half our invoices are scanned copies someone emailed from their phone."\nThe problem is real and unsolved for the messy middle.`,
      fyMonth: 0,
    },
    {
      step: 'Hypothesis',
      source: 'note',
      content: `From: Alex Rivera (CTO)\nTo: Engineering Team\nSubject: Extraction approach — initial thinking\n\nBased on what we've seen from the customer interviews, I think we need a multi-stage pipeline:\n1. Document intake (PDF/image/email)\n2. OCR + layout detection\n3. Field extraction (the hard part)\n4. Validation + anomaly flagging\n5. Human review queue for low-confidence results\n\nThe key uncertainty is step 3. We know OCR works. We know validation rules can be written. The question is whether we can build field extraction that handles the variety of real documents without per-supplier templating — because that doesn't scale.`,
      fyMonth: 0,
    },
    {
      step: 'Hypothesis',
      source: 'github',
      content: `[PR #12] Add PDF text extraction pipeline for scanned and native PDFs\n\nInitial implementation supporting both native PDF text extraction (via pdf-parse) and scanned document OCR (via Tesseract.js). Handles rotation detection and deskewing for scanned documents. Early testing on 25 sample docs shows native PDFs extract cleanly but scanned copies have significant noise in the OCR output.`,
      fyMonth: 1,
    },
    {
      step: 'Hypothesis',
      source: 'note',
      content: `Design doc: Extraction v2 architecture\n\nProposed pipeline: upload → OCR → layout detection → field extraction → validation rules → confidence scoring → human review queue.\n\nKey design decisions:\n- Layout detection uses a vision model to identify document regions (header, line items, totals, footer) before attempting field extraction\n- Field extraction is ML-based, not template-based — we train on labelled examples rather than hardcoding positions\n- Confidence scoring determines whether a document goes to auto-approve or human review\n- Human corrections feed back into the training set\n\nOpen questions: what confidence threshold balances automation rate vs accuracy? How many labelled examples do we need per document type?`,
      fyMonth: 1,
    },

    // ── EXPERIMENT ──
    {
      step: 'Experiment',
      source: 'jira',
      content: `[DOC-34] Spike: compare OCR output across 25 sample documents\n\nCompared Tesseract, AWS Textract, and Google Document AI on our 25-document sample set.\n\nResults:\n- Tesseract: 71% character accuracy on scanned docs, 96% on native PDFs\n- AWS Textract: 84% on scanned, 98% on native\n- Google Document AI: 87% on scanned, 99% on native\n\nBut these are character-level accuracy — field-level extraction is much harder because you need to know WHAT a number means, not just read it correctly.`,
      fyMonth: 2,
    },
    {
      step: 'Experiment',
      source: 'github',
      content: `[PR #31] Rules-based field extraction — first attempt\n\nImplemented regex + positional rules for extracting: invoice number, date, supplier name, total amount, line items.\n\nApproach: look for known patterns near expected positions (e.g. "Invoice #" followed by alphanumeric, "Total" near bottom-right with dollar amount).\n\nTest results on 50 documents:\n- Invoice number: 72% correct\n- Date: 68% correct\n- Supplier name: 54% correct\n- Total amount: 78% correct\n- Line items: 41% correct\n\nOverall: 58% field-level accuracy. Not good enough.`,
      fyMonth: 2,
    },
    {
      step: 'Experiment',
      source: 'note',
      content: `Failed experiment note — rules-based parsing on varied layouts\n\nRules-based parsing failed badly when supplier names appeared in footer blocks or sidebars instead of the header. Some documents put the invoice number in the subject line of an attached email, not on the PDF itself. One supplier uses a table layout where "Total" appears in 3 different places (subtotal, tax total, grand total) and our regex grabbed the wrong one 40% of the time.\n\nConclusion: rules-based approach can't handle the layout variation. Need to move to something that understands document structure, not just text patterns.`,
      fyMonth: 3,
    },
    {
      step: 'Experiment',
      source: 'github',
      content: `[PR #47] Layout-aware extraction using document segmentation model\n\nTrained a LayoutLM-based model on 200 labelled invoice documents. The model learns to associate text with document regions (header, line items, footer, sidebar) and extract fields based on both text content AND spatial position.\n\nResults on 100-document test set:\n- Invoice number: 89% correct\n- Date: 85% correct\n- Supplier name: 79% correct\n- Total amount: 91% correct\n- Line items: 63% correct\n\nOverall: 82% field-level accuracy. Big improvement over rules-based (58%). Line items still the weakest — complex table layouts are the main failure mode.`,
      fyMonth: 3,
    },
    {
      step: 'Experiment',
      source: 'github',
      content: `[PR #58] Improve parser fallback when supplier name is missing from header\n\nAdded secondary extraction logic that searches email metadata, letterhead, and ABN/ACN lookups when the primary header extraction fails to find a supplier name. Falls back through: header text → logo/letterhead OCR → email sender domain → ABN registry lookup.\n\nImproved supplier name accuracy from 79% to 88% on the test set. The ABN lookup catches cases where the document has no company name but includes an ABN in the footer.`,
      fyMonth: 4,
    },
    {
      step: 'Experiment',
      source: 'note',
      content: `Slack note from Sarah (ML engineer):\n\n"Text extraction works on clean PDFs, but scanned copies are still breaking field mapping. The issue is that OCR introduces character-level errors (O vs 0, l vs 1, $ vs S) which then cascade into field extraction failures. A scanned invoice with 95% OCR accuracy might still have the wrong total because the dollar sign was misread.\n\nI'm going to try adding a post-OCR correction step that uses field-type validation — if a field is expected to be a dollar amount, force-correct characters that don't match the pattern."`,
      fyMonth: 4,
    },
    {
      step: 'Experiment',
      source: 'github',
      content: `[PR #72] Add post-OCR field-type validation and correction\n\nImplemented type-aware correction layer:\n- Currency fields: strip non-numeric chars, validate decimal places, cross-check against line item sum\n- Date fields: parse multiple formats (DD/MM/YYYY, MM-DD-YY, "15 Jan 2026"), validate range\n- ABN/ACN: validate check digit\n- Invoice numbers: preserve alphanumeric pattern, flag if duplicate detected\n\nThis brought overall accuracy from 82% to 89% on the 200-document test set. The cross-validation (total = sum of line items) catches errors that field-level extraction alone misses.`,
      fyMonth: 5,
    },

    // ── OBSERVATION ──
    {
      step: 'Observation',
      source: 'note',
      content: `Test result — full pipeline benchmark\n\nRan the complete pipeline (OCR → layout detection → field extraction → validation) against our 500-document benchmark set spanning 12 document types and 47 suppliers.\n\nResults by document type:\n- Standard invoices (clean PDF): 94% accuracy\n- Scanned invoices (good quality): 87% accuracy\n- Scanned invoices (poor quality/phone photos): 71% accuracy\n- Purchase orders: 91% accuracy\n- Contracts (field extraction): 68% accuracy — too unstructured\n- Compliance certificates: 83% accuracy\n\nOverall weighted average: 85.2% field-level accuracy\n\nInitial extraction accuracy was 58%. After adding layout-aware parsing and validation rules, accuracy improved to 82% on the sample set. Post-OCR correction brought it to 85% on the full benchmark.`,
      fyMonth: 6,
    },
    {
      step: 'Observation',
      source: 'note',
      content: `Anomaly detection observations — Jan 2026\n\nTested the anomaly flagging system on 3 months of real customer data (1,847 documents).\n\nFlags raised:\n- 23 duplicate invoice numbers detected (all confirmed real duplicates)\n- 7 invoices with totals not matching line item sums (5 were genuine errors, 2 were rounding differences)\n- 14 documents with unrecognised supplier names (all were new suppliers not in the system)\n- 3 documents flagged as potentially fraudulent (unusual patterns) — 1 turned out to be a legitimate credit note\n\nFalse positive rate on anomaly flags: 6.4% — slightly above our 5% target. Most false positives come from the "unusual pattern" detector being too aggressive on credit notes and adjustments.`,
      fyMonth: 6,
    },
    {
      step: 'Observation',
      source: 'note',
      content: `Processing time benchmarks — Feb 2026\n\nMeasured end-to-end processing time across document types:\n- Native PDF (text-based): 3-5 seconds\n- Scanned PDF (single page): 8-12 seconds\n- Scanned PDF (multi-page, 5+ pages): 18-35 seconds\n- Email with attachment: 6-8 seconds (plus attachment processing)\n- Phone photo of document: 12-20 seconds (includes deskew + enhancement)\n\nAll within our 30-second target except multi-page scanned documents. For those, we're processing pages in parallel which gets most under 30 seconds but a 10-page scanned contract can take 45 seconds.`,
      fyMonth: 7,
    },
    {
      step: 'Observation',
      source: 'github',
      content: `[PR #98] Customer pilot — extraction accuracy monitoring dashboard\n\nDeployed monitoring for the 3 pilot customers. After 4 weeks:\n- Customer A (construction, mostly clean invoices): 91% accuracy, 82% auto-approved\n- Customer B (retail, mixed quality): 84% accuracy, 67% auto-approved\n- Customer C (logistics, many scanned docs): 79% accuracy, 54% auto-approved\n\nThe gap between clean and messy documents is consistent. Customers with primarily scanned/photographed documents see lower automation rates.`,
      fyMonth: 7,
    },

    // ── EVALUATION ──
    {
      step: 'Evaluation',
      source: 'note',
      content: `Pipeline evaluation — comparing approaches\n\nSummary of extraction accuracy progression:\n1. Rules-based (regex + position): 58% — failed on layout variation\n2. Layout-aware ML (LayoutLM): 82% — big improvement but OCR errors cascade\n3. Layout-aware + post-OCR correction: 85% — meets target on aggregate\n4. With confidence-based routing: 91% on auto-approved docs, 76% on flagged-for-review\n\nThe confidence routing is key. Instead of trying to get 85%+ on everything, we identify which documents we're confident about (auto-approve) and which need human review. This gives customers a better experience than a flat accuracy rate because the documents they DO have to review are the genuinely hard ones.\n\nRemaining weakness: line item extraction on complex tables with merged cells, spanning headers, and variable column layouts. This is where the most human corrections happen.`,
      fyMonth: 8,
    },
    {
      step: 'Evaluation',
      source: 'note',
      content: `From: Alex Rivera (CTO)\nTo: Board\nSubject: Document extraction — technical assessment\n\nSummary of where we've landed after 14 months of R&D:\n\nWhat we proved:\n- ML-based extraction significantly outperforms rules-based approaches on varied documents\n- Post-OCR validation catches errors that extraction alone misses\n- Confidence-based routing is the right architecture — not everything needs to be fully automated\n\nWhat remains genuinely hard:\n- Complex table extraction (merged cells, nested tables)\n- Handwritten annotations overlaying printed text\n- Documents where critical info is in the email body, not the attachment\n\nThese aren't just engineering problems — they represent real technical uncertainty about whether current ML approaches can handle them. We're continuing to investigate.`,
      fyMonth: 8,
    },

    // ── CONCLUSION ──
    {
      step: 'Conclusion',
      source: 'note',
      content: `Project conclusions — what we learned\n\nThe extraction pipeline is in production, processing ~2,000 documents/day across 12 customers.\n\nKey findings:\n- Off-the-shelf OCR is necessary but not sufficient — you need layout understanding AND field validation on top\n- Rules-based extraction (58% accuracy) is fundamentally limited by layout variation. ML-based approaches (85%+) handle variation much better\n- The breakthrough wasn't a single technique but the pipeline: OCR → layout segmentation → field extraction → type-aware validation → confidence routing\n- Confidence-based human review is essential. Trying to fully automate everything leads to worse outcomes than routing uncertain documents to humans\n- Training data from human corrections creates a virtuous cycle — accuracy improves as more documents are processed\n\nAccuracy continues to improve with more training data. We're seeing roughly 1-2% improvement per quarter as the model sees more supplier formats.`,
      fyMonth: 9,
    },
    {
      step: 'Conclusion',
      source: 'note',
      content: `Line item extraction — outcome and next steps\n\nLine item extraction remains the weakest part of the pipeline (63-71% accuracy depending on document complexity). After investigating several approaches:\n- Table detection models (DETR-based): improved detection of table boundaries but didn't help with merged cells\n- LLM-based extraction (GPT-4V): promising at 78% accuracy but too slow and expensive for production use\n- Hybrid approach (vision model for structure + LLM for ambiguous cases): currently testing, early results at 74%\n\nThis is an area of ongoing R&D. The core challenge is that business documents use tables in extremely inconsistent ways — merged cells, spanning headers, footnotes within tables, tables split across pages. No published approach handles all of these reliably.`,
      fyMonth: 10,
    },
    {
      step: 'Conclusion',
      source: 'github',
      content: `[PR #112] Production deployment — extraction pipeline v3\n\nFinal production metrics after 3 months:\n- Overall field-level accuracy: 87% (up from 58% at project start)\n- Auto-approval rate: 72% of documents processed without human review\n- Average processing time: 11 seconds per document\n- Customer satisfaction: NPS +47 across pilot customers\n- Human review queue processing time: reduced from 4 min/doc (manual) to 45 sec/doc (review + correct)\n\nThe system handles 12 document types across 200+ supplier formats without per-supplier configuration. New supplier formats are learned from human corrections within ~20 examples.`,
      fyMonth: 10,
    },
  ];

  // Insert evidence
  // Map source types to valid DB values (note, upload, github, document)
  const sourceMap = { note: 'note', github: 'github', jira: 'note', document: 'document' };
  const evidenceRows = evidenceItems.map(item => ({
    project_id: project.id,
    content: item.content,
    source: sourceMap[item.source] || 'note',
    created_at: randDate(item.fyMonth),
    soft_deleted: false,
    activity_type: 'core',
    activity_type_source: 'auto',
    systematic_step_primary: item.step,
    systematic_step_source: 'auto',
  }));

  const { data: insertedEvidence, error: evErr } = await supabase
    .from('evidence')
    .insert(evidenceRows)
    .select('id');
  if (evErr) throw evErr;
  console.log(`Created ${insertedEvidence.length} evidence items`);

  // ── CREATE CORE ACTIVITIES ──
  const coreActivities = [
    {
      name: 'Document field extraction from varied layouts',
      uncertainty: 'Whether ML-based field extraction can achieve ≥85% accuracy on real-world business documents where layout, wording, quality, and completeness vary significantly across suppliers and document types.',
    },
    {
      name: 'OCR error correction for scanned documents',
      uncertainty: 'Whether post-OCR validation and type-aware correction can reduce field-level errors caused by character misrecognition in scanned and photographed documents to acceptable levels.',
    },
    {
      name: 'Line item extraction from complex tables',
      uncertainty: 'Whether automated extraction can reliably parse line items from business document tables with merged cells, spanning headers, footnotes, and page breaks.',
    },
  ];

  for (const act of coreActivities) {
    const { error: actErr } = await supabase
      .from('core_activities')
      .insert({
        project_id: project.id,
        name: act.name,
        uncertainty: act.uncertainty,
        status: 'draft',
        source: 'ai',
        activity_type: 'core',
      });
    if (actErr) console.error('Activity insert error:', actErr);
    else console.log(`Created activity: ${act.name}`);
  }

  console.log('\n✓ Done!');
  console.log(`Project token: ${token}`);
  console.log(`URL: /p/${token}?view=workspace`);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
