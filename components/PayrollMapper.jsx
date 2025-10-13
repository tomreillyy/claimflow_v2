'use client';
import { useState, useEffect } from 'react';
import { PAYROLL_PRESETS } from '@/lib/payrollParser';

export default function PayrollMapper({ uploadData, projectToken, onComplete, onCancel }) {
  const [mapping, setMapping] = useState(uploadData.suggestedMapping || {});
  const [dateFormat, setDateFormat] = useState(uploadData.dateFormat || 'YYYY-MM-DD');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  // Required fields
  const requiredFields = {
    employee_email: 'Employee Email',
    employee_id: 'Employee ID',
    employee_name: 'Employee Name',
    pay_date: 'Pay Date',
    gross_wages: 'Gross Wages'
  };

  // Optional fields
  const optionalFields = {
    pay_period_start: 'Pay Period Start',
    pay_period_end: 'Pay Period End',
    superannuation: 'Superannuation',
    on_costs: 'On-Costs'
  };

  // Check if mapping is valid
  const hasEmailOrId = mapping.employee_email || mapping.employee_id;
  const hasName = mapping.employee_name;
  const hasPayDate = mapping.pay_date;
  const hasGrossWages = mapping.gross_wages;

  const isValid = hasEmailOrId && hasName && hasPayDate && hasGrossWages;

  const handlePresetSelect = (presetKey) => {
    const preset = PAYROLL_PRESETS[presetKey];
    if (preset) {
      setMapping({ ...preset.mapping });
    }
  };

  const handleFieldMapping = (systemField, columnName) => {
    setMapping(prev => ({
      ...prev,
      [systemField]: columnName
    }));
  };

  const handleConfirm = async () => {
    if (!isValid) {
      setError('Please map all required fields before confirming');
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectToken}/payroll/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadData.uploadId,
          mapping,
          dateFormat
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Confirmation failed');
      }

      if (onComplete) {
        onComplete(data);
      }
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    }
  };

  return (
    <div style={{
      border: '1px solid #e5e5e5',
      borderRadius: 4,
      padding: 24,
      backgroundColor: 'white',
      marginBottom: 24
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
          Smart Mapper
        </div>
        <div style={{ fontSize: 13, color: '#666' }}>
          File: <strong style={{ color: '#1a1a1a' }}>{uploadData.filename}</strong> ({uploadData.totalRows} rows)
        </div>
      </div>

      {/* Detected Preset Banner */}
      {uploadData.detectedPreset && (
        <div style={{
          padding: 12,
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: 3,
          marginBottom: 20,
          fontSize: 13,
          color: '#1e40af'
        }}>
          Smart match found <strong>{uploadData.detectedPreset.name}</strong>.
          Review & confirm.
        </div>
      )}

      {/* Preset Selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 8 }}>
          Quick Presets
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(PAYROLL_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetSelect(key)}
              style={{
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 500,
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: 3,
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Field Mapping */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 12 }}>
          Required Fields
        </div>

        {/* Email or ID (either one required) */}
        <div style={{ marginBottom: 12, fontSize: 13 }}>
          <div style={{ fontWeight: 500, marginBottom: 4, color: hasEmailOrId ? '#10b981' : '#dc2626' }}>
            Employee Email or ID {hasEmailOrId ? '✓' : '✗'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={mapping.employee_email || ''}
              onChange={(e) => handleFieldMapping('employee_email', e.target.value)}
              style={{
                flex: 1,
                padding: 8,
                fontSize: 13,
                color: '#1a1a1a',
                border: '1px solid #ddd',
                borderRadius: 3
              }}
            >
              <option value="">-- Select Email Column --</option>
              {uploadData.headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span style={{ padding: '8px', fontSize: 13, color: '#999' }}>OR</span>
            <select
              value={mapping.employee_id || ''}
              onChange={(e) => handleFieldMapping('employee_id', e.target.value)}
              style={{
                flex: 1,
                padding: 8,
                fontSize: 13,
                color: '#1a1a1a',
                border: '1px solid #ddd',
                borderRadius: 3
              }}
            >
              <option value="">-- Select ID Column --</option>
              {uploadData.headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Other required fields */}
        {['employee_name', 'pay_date', 'gross_wages'].map(field => {
          const isMapped = mapping[field];
          return (
            <div key={field} style={{ marginBottom: 12, fontSize: 13 }}>
              <div style={{ fontWeight: 500, marginBottom: 4, color: isMapped ? '#10b981' : '#dc2626' }}>
                {requiredFields[field]} {isMapped ? '✓' : '✗'}
              </div>
              <select
                value={mapping[field] || ''}
                onChange={(e) => handleFieldMapping(field, e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  fontSize: 13,
                  color: '#1a1a1a',
                  border: '1px solid #ddd',
                  borderRadius: 3
                }}
              >
                <option value="">-- Select Column --</option>
                {uploadData.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {/* Optional Fields */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: '#666' }}>
          Optional Fields
        </div>

        {Object.entries(optionalFields).map(([field, label]) => (
          <div key={field} style={{ marginBottom: 12, fontSize: 13 }}>
            <div style={{ fontWeight: 500, marginBottom: 4, color: '#666' }}>
              {label} {mapping[field] && '✓'}
            </div>
            <select
              value={mapping[field] || ''}
              onChange={(e) => handleFieldMapping(field, e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                fontSize: 13,
                color: '#1a1a1a',
                border: '1px solid #ddd',
                borderRadius: 3
              }}
            >
              <option value="">-- Not Mapped --</option>
              {uploadData.headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Date Format Helper */}
      {mapping.pay_date && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 8 }}>
            Date Format
          </div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
            Your dates look like {uploadData.dateFormat}. Convert to standard format?
          </div>
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              fontSize: 13,
              color: '#1a1a1a',
              border: '1px solid #ddd',
              borderRadius: 3
            }}
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
          </select>
        </div>
      )}

      {/* Preview */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 12 }}>
          Preview (first 10 rows)
        </div>
        <div style={{
          overflowX: 'auto',
          border: '1px solid #e5e5e5',
          borderRadius: 4,
          fontSize: 12,
          backgroundColor: 'white'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa' }}>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>Email/ID</th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>Name</th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>Pay Date</th>
                <th style={{ padding: 10, textAlign: 'right', borderBottom: '1px solid #e5e5e5', fontWeight: 600, color: '#333' }}>Gross</th>
              </tr>
            </thead>
            <tbody>
              {uploadData.preview.slice(0, 10).map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 10, color: '#1a1a1a' }}>
                    {mapping.employee_email ? row[mapping.employee_email] : row[mapping.employee_id] || '-'}
                  </td>
                  <td style={{ padding: 10, color: '#1a1a1a' }}>
                    {mapping.employee_name ? row[mapping.employee_name] : '-'}
                  </td>
                  <td style={{ padding: 10, color: '#1a1a1a' }}>
                    {mapping.pay_date ? row[mapping.pay_date] : '-'}
                  </td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#1a1a1a' }}>
                    {mapping.gross_wages ? row[mapping.gross_wages] : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Messages */}
      {uploadData.validation && (
        <div style={{ marginBottom: 24 }}>
          {uploadData.validation.errors && uploadData.validation.errors.length > 0 && (
            <div style={{
              padding: 12,
              backgroundColor: '#fff3f3',
              border: '1px solid #ffcccc',
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 12,
              color: '#d32f2f'
            }}>
              <strong>Errors:</strong>
              <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                {uploadData.validation.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {uploadData.validation.warnings && uploadData.validation.warnings.length > 0 && (
            <div style={{
              padding: 12,
              backgroundColor: '#fffbf0',
              border: '1px solid #ffe082',
              borderRadius: 6,
              fontSize: 12,
              color: '#f57c00'
            }}>
              <strong>Warnings:</strong>
              <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                {uploadData.validation.warnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 3,
          fontSize: 13,
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          disabled={confirming}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: 3,
            backgroundColor: 'white',
            cursor: confirming ? 'not-allowed' : 'pointer',
            opacity: confirming ? 0.5 : 1
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isValid || confirming}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            borderRadius: 3,
            backgroundColor: isValid && !confirming ? '#021048' : '#ccc',
            color: 'white',
            cursor: isValid && !confirming ? 'pointer' : 'not-allowed'
          }}
        >
          {confirming ? 'Processing...' : 'Confirm & Generate Ledger'}
        </button>
      </div>
    </div>
  );
}
