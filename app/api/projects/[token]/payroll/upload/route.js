import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parsePayrollFile, autoDetectPreset, generateSmartMapping, detectDateFormat, validatePayrollData } from '@/lib/payrollParser';
import { validateFileUpload, sanitizeFilename } from '@/lib/serverAuth';

export const config = {
  api: {
    bodyParser: false // We handle file upload via FormData
  }
};

const MAX_PAYROLL_FILE_SIZE_MB = 25; // Larger limit for payroll files
const ALLOWED_PAYROLL_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export async function POST(req, { params }) {
  try {
    const { token } = await params;

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .eq('project_token', token)
      .is('deleted_at', null)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse FormData
    const formData = await req.formData();
    const file = formData.get('file');
    const uploaderEmail = formData.get('uploader_email'); // Optional

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file with size limit and magic byte checking
    const validation = await validateFileUpload(file, {
      maxSizeMB: MAX_PAYROLL_FILE_SIZE_MB,
      allowedMimeTypes: ALLOWED_PAYROLL_TYPES,
      checkMagicBytes: true
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Parse file
    let parsed;
    try {
      parsed = await parsePayrollFile(file);
    } catch (parseError) {
      return NextResponse.json({
        error: `Failed to parse file: ${parseError.message}`
      }, { status: 400 });
    }

    const { headers, rows, preview, mimeType, totalRows } = parsed;

    if (totalRows === 0) {
      return NextResponse.json({
        error: 'File contains no data rows'
      }, { status: 400 });
    }

    // Auto-detect preset
    const detectedPreset = autoDetectPreset(headers);

    // Generate smart mapping
    // Start with preset mapping if detected, then fill gaps with smart matching
    let smartMapping = {};

    if (detectedPreset) {
      // Use preset as base
      smartMapping = { ...detectedPreset.mapping };

      // Fill in any unmapped fields with smart matching
      const smartFallback = generateSmartMapping(headers);
      for (const [field, value] of Object.entries(smartFallback)) {
        if (!smartMapping[field] || !headers.includes(smartMapping[field])) {
          // Preset field is null OR preset column doesn't exist in file
          smartMapping[field] = value;
        }
      }
    } else {
      // No preset detected, use full smart matching
      smartMapping = generateSmartMapping(headers);
    }

    // Validate mapping
    const validation = validatePayrollData(preview, smartMapping);

    // Detect date format for pay_date if mapped
    let dateFormat = null;
    if (smartMapping.pay_date) {
      dateFormat = detectDateFormat(preview, smartMapping.pay_date);
    }

    // Upload file to Supabase Storage (private bucket)
    const timestamp = Date.now();
    const sanitizedFilenameSecure = sanitizeFilename(file.name);
    const storagePath = `${project.id}/${timestamp}_${sanitizedFilenameSecure}`;

    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('payroll')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({
        error: `Failed to store file: ${uploadError.message}`
      }, { status: 500 });
    }

    // Save upload record
    const { data: uploadRecord, error: dbError } = await supabaseAdmin
      .from('payroll_uploads')
      .insert({
        project_id: project.id,
        filename: file.name,
        mime_type: mimeType,
        storage_path: storagePath,
        uploaded_by: uploaderEmail || null,
        header_row_json: headers,
        mapping_json: smartMapping,
        preset_used: detectedPreset ? detectedPreset.preset : 'custom',
        rows_count: totalRows,
        status: 'uploaded'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Clean up uploaded file
      await supabaseAdmin.storage.from('payroll').remove([storagePath]);
      return NextResponse.json({
        error: `Failed to save upload record: ${dbError.message}`
      }, { status: 500 });
    }

    // Return preview data + mapping for UI
    return NextResponse.json({
      uploadId: uploadRecord.id,
      filename: file.name,
      totalRows,
      headers,
      preview: preview.slice(0, 20), // First 20 rows
      detectedPreset: detectedPreset ? {
        key: detectedPreset.preset,
        name: getPresetName(detectedPreset.preset),
        confidence: detectedPreset.confidence
      } : null,
      suggestedMapping: smartMapping,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings
      },
      dateFormat: dateFormat || 'YYYY-MM-DD'
    });

  } catch (error) {
    console.error('Payroll upload error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

function getPresetName(key) {
  const names = {
    xero: 'Xero Payroll',
    myob: 'MYOB',
    qbo: 'QuickBooks Online Payroll',
    employment_hero: 'Employment Hero/KeyPay'
  };
  return names[key] || 'Custom';
}
