'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const NAVY = '#021048';

const TURNOVER_OPTIONS = [
  { value: 'under_20m', label: 'Under $20M (refundable offset at 43.5%)' },
  { value: 'over_20m', label: '$20M or above (non-refundable offset)' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: 'australian_company', label: 'Australian company' },
  { value: 'foreign_company_au_pe', label: 'Foreign company with AU permanent establishment' },
  { value: 'not_eligible', label: 'Not eligible' },
];

const INDUSTRY_OPTIONS = [
  { value: 'software', label: 'Software / SaaS' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'biotech', label: 'Biotech / Life Sciences' },
  { value: 'other', label: 'Other' },
];

export default function ProjectSettings({ project, token }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    company_name: '',
    abn: '',
    entity_type: '',
    aggregated_turnover: '',
    aggregated_turnover_band: '',
    industry: '',
    financial_year_end: '06-30',
    overseas_rd: false,
    government_grants: false,
    feedstock_involvement: false,
  });

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/company', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.company) {
          setCompany(data.company);
          setForm({
            company_name: data.company.company_name || '',
            abn: data.company.abn || '',
            entity_type: data.company.entity_type || '',
            aggregated_turnover: data.company.aggregated_turnover || '',
            aggregated_turnover_band: data.company.aggregated_turnover_band || '',
            industry: data.company.industry || '',
            financial_year_end: data.company.financial_year_end || '06-30',
            overseas_rd: data.company.overseas_rd || false,
            government_grants: data.company.government_grants || false,
            feedstock_involvement: data.company.feedstock_involvement || false,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch company:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Auto-derive turnover band from numeric value
      let band = form.aggregated_turnover_band;
      const turnoverNum = parseFloat(form.aggregated_turnover);
      if (!isNaN(turnoverNum) && turnoverNum > 0) {
        band = turnoverNum < 20000000 ? 'under_20m' : 'over_20m';
      }

      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          aggregated_turnover_band: band,
          aggregated_turnover: turnoverNum || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const data = await res.json();
      setCompany(data.company);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading settings...</div>;
  }

  const turnoverNum = parseFloat(form.aggregated_turnover);
  const isRefundable = !isNaN(turnoverNum) && turnoverNum > 0 && turnoverNum < 20000000;
  const hasNumericTurnover = !isNaN(turnoverNum) && turnoverNum > 0;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 0' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
        Claim Settings
      </h2>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
        Entity details and R&D Tax Incentive parameters for this claim. Aggregated turnover determines the offset type.
      </p>

      {/* Turnover — hero field */}
      <div style={{
        backgroundColor: '#f0f4ff',
        border: '2px solid ' + NAVY,
        borderRadius: 10,
        padding: '20px 24px',
        marginBottom: 28,
      }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
          Aggregated Turnover (AUD) *
        </label>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, lineHeight: 1.4 }}>
          Annual turnover of this company plus all connected and affiliated entities (s.328-125 ITAA 1997).
          This determines whether the offset is refundable (under $20M) or non-refundable ($20M+).
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 16, color: '#6b7280', fontWeight: 500,
            }}>$</span>
            <input
              type="number"
              value={form.aggregated_turnover}
              onChange={e => updateField('aggregated_turnover', e.target.value)}
              placeholder="e.g. 14200000"
              style={{
                width: '100%',
                padding: '12px 12px 12px 28px',
                fontSize: 18,
                fontFamily: 'monospace',
                fontWeight: 600,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                color: '#1a1a1a',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = NAVY}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
          {hasNumericTurnover && (
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'white',
              backgroundColor: isRefundable ? '#16a34a' : '#2563eb',
              padding: '6px 14px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
            }}>
              {isRefundable ? 'Refundable (43.5%)' : 'Non-refundable (38.5%)'}
            </span>
          )}
        </div>
        {!hasNumericTurnover && form.aggregated_turnover_band && (
          <div style={{ marginTop: 8 }}>
            <select
              value={form.aggregated_turnover_band}
              onChange={e => updateField('aggregated_turnover_band', e.target.value)}
              style={selectStyle}
            >
              <option value="">Select band...</option>
              {TURNOVER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Entity details */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        backgroundColor: 'white',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: 14,
          fontWeight: 600,
          color: '#374151',
        }}>
          Entity Details
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Company Name" required>
            <input
              type="text"
              value={form.company_name}
              onChange={e => updateField('company_name', e.target.value)}
              placeholder="e.g. CareBridge Health Pty Ltd"
              style={inputStyle}
            />
          </Field>

          <Field label="ABN" hint="11-digit Australian Business Number">
            <input
              type="text"
              value={form.abn}
              onChange={e => updateField('abn', e.target.value)}
              placeholder="e.g. 12 345 678 901"
              maxLength={14}
              style={inputStyle}
            />
          </Field>

          <Field label="Entity Type">
            <select value={form.entity_type} onChange={e => updateField('entity_type', e.target.value)} style={selectStyle}>
              <option value="">Select...</option>
              {ENTITY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Industry">
            <select value={form.industry} onChange={e => updateField('industry', e.target.value)} style={selectStyle}>
              <option value="">Select...</option>
              {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Financial Year End">
            <input
              type="text"
              value={form.financial_year_end}
              onChange={e => updateField('financial_year_end', e.target.value)}
              placeholder="MM-DD (e.g. 06-30)"
              style={inputStyle}
            />
          </Field>
        </div>
      </div>

      {/* RDTI flags */}
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        backgroundColor: 'white',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: 14,
          fontWeight: 600,
          color: '#374151',
        }}>
          R&D Claim Flags
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Checkbox
            label="Overseas R&D activities"
            checked={form.overseas_rd}
            onChange={v => updateField('overseas_rd', v)}
          />
          <Checkbox
            label="Government grants fund part of the R&D"
            checked={form.government_grants}
            onChange={v => updateField('government_grants', v)}
          />
          <Checkbox
            label="Feedstock involvement (R&D outputs used commercially)"
            checked={form.feedstock_involvement}
            onChange={v => updateField('feedstock_involvement', v)}
          />
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            color: 'white',
            backgroundColor: NAVY,
            border: 'none',
            borderRadius: 8,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 500 }}>
            Saved
          </span>
        )}
        {error && (
          <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {hint && <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px' }}>{hint}</p>}
      {children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#374151' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: '#021048' }}
      />
      {label}
    </label>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  color: '#1a1a1a',
  outline: 'none',
};

const selectStyle = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  color: '#1a1a1a',
  backgroundColor: 'white',
  outline: 'none',
};
