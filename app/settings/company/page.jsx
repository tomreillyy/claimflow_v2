'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';
import { AlertTriangle, Info, Check } from 'lucide-react';

const ENTITY_TYPES = [
  { value: 'australian_company', label: 'Australian incorporated company' },
  { value: 'foreign_company_au_pe', label: 'Foreign company with Australian permanent establishment' },
  { value: 'not_eligible', label: 'Not eligible / Other' },
];

const TURNOVER_BANDS = [
  { value: 'under_20m', label: 'Under $20m (refundable offset)' },
  { value: 'over_20m', label: '$20m or more (non-refundable offset)' },
  { value: 'not_sure', label: 'Not sure yet' },
];

const INDUSTRIES = [
  { value: 'software', label: 'Software' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'biotech', label: 'Biotech' },
  { value: 'other', label: 'Other' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const emptyForm = {
  company_name: '',
  entity_type: '',
  aggregated_turnover_band: '',
  financial_year_end: '06-30',
  abn: '',
  industry: '',
  overseas_rd: false,
  rd_for_another_entity: false,
  part_of_group: false,
  estimated_rd_spend: '',
  rd_above_150m: false,
  government_grants: false,
  feedstock_involvement: false,
};

export default function CompanySettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchCompany();
  }, [user]);

  const fetchCompany = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/company', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.company) {
          setHasExisting(true);
          setForm({
            company_name: data.company.company_name || '',
            entity_type: data.company.entity_type || '',
            aggregated_turnover_band: data.company.aggregated_turnover_band || '',
            financial_year_end: data.company.financial_year_end || '06-30',
            abn: data.company.abn || '',
            industry: data.company.industry || '',
            overseas_rd: data.company.overseas_rd ?? false,
            rd_for_another_entity: data.company.rd_for_another_entity ?? false,
            part_of_group: data.company.part_of_group ?? false,
            estimated_rd_spend: data.company.estimated_rd_spend ?? '',
            rd_above_150m: data.company.rd_above_150m ?? false,
            government_grants: data.company.government_grants ?? false,
            feedstock_involvement: data.company.feedstock_involvement ?? false,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch company:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be signed in');
        setSaving(false);
        return;
      }

      const body = {
        ...form,
        estimated_rd_spend: form.estimated_rd_spend ? Number(form.estimated_rd_spend) : null,
      };

      const response = await fetch('/api/company', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setHasExisting(true);
      setSuccess('Company settings saved');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Parse financial year end for the month/day selectors
  const [fyMonth, fyDay] = (form.financial_year_end || '06-30').split('-').map(Number);

  const setFyEnd = (month, day) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    update('financial_year_end', `${mm}-${dd}`);
  };

  // Conditional visibility helpers
  const showLargeTurnoverFields = form.aggregated_turnover_band === 'over_20m';
  const showFeedstock = form.industry === 'manufacturing';

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 6,
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1a1a1a',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#333',
    marginBottom: 6,
  };

  const sectionStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e5e5',
    borderRadius: 8,
    padding: 24,
    marginBottom: 20,
  };

  const sectionTitleStyle = {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 4px 0',
  };

  const sectionDescStyle = {
    fontSize: 13,
    color: '#666',
    margin: '0 0 20px 0',
  };

  const recommendedBadge = (
    <span style={{
      fontSize: 11,
      fontWeight: 500,
      color: '#6366f1',
      backgroundColor: '#eef2ff',
      padding: '2px 6px',
      borderRadius: 3,
      marginLeft: 6,
    }}>Recommended</span>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      <Header />

      {(authLoading || loading) ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spinner />
        </div>
      ) : (
        <main style={{ maxWidth: 680, margin: '0 auto', padding: '60px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px 0' }}>
              Company Settings
            </h1>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
              {hasExisting
                ? 'Manage your company profile and RDTI eligibility settings.'
                : 'Set up your company to get started with R&D Tax Incentive claims.'}
            </p>
          </div>

          <form onSubmit={handleSave}>

            {/* ── Section 1: Entity Details ── */}
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Entity Details</h2>
              <p style={sectionDescStyle}>Basic information about your company entity.</p>

              <div style={{ display: 'grid', gap: 16 }}>
                {/* Company Name */}
                <div>
                  <label style={labelStyle}>Company name</label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={e => update('company_name', e.target.value)}
                    placeholder="e.g. Acme Pty Ltd"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#021048'}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  />
                </div>

                {/* Entity Type */}
                <div>
                  <label style={labelStyle}>Entity type</label>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {ENTITY_TYPES.map(opt => (
                      <label key={opt.value} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        border: `1px solid ${form.entity_type === opt.value ? '#021048' : '#ddd'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        backgroundColor: form.entity_type === opt.value ? '#f8f9ff' : 'white',
                        transition: 'all 0.15s',
                      }}>
                        <input
                          type="radio"
                          name="entity_type"
                          value={opt.value}
                          checked={form.entity_type === opt.value}
                          onChange={() => update('entity_type', opt.value)}
                          style={{ accentColor: '#021048' }}
                        />
                        <span style={{ fontSize: 14, color: '#1a1a1a' }}>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {form.entity_type === 'not_eligible' && (
                    <div style={{
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 6,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}>
                      <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                        <strong>Eligibility warning:</strong> Only eligible R&D entities (generally Australian incorporated companies)
                        can claim under Division 355. Claim generation will be restricted for this entity type.
                      </div>
                    </div>
                  )}
                </div>

                {/* ABN */}
                <div>
                  <label style={labelStyle}>
                    ABN {recommendedBadge}
                  </label>
                  <input
                    type="text"
                    value={form.abn}
                    onChange={e => {
                      const v = e.target.value.replace(/[^\d\s]/g, '');
                      update('abn', v);
                    }}
                    placeholder="e.g. 12 345 678 901"
                    maxLength={14}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#021048'}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  />
                  <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0 0' }}>
                    11-digit Australian Business Number
                  </p>
                </div>

                {/* Industry */}
                <div>
                  <label style={labelStyle}>
                    Industry {recommendedBadge}
                  </label>
                  <select
                    value={form.industry}
                    onChange={e => update('industry', e.target.value)}
                    style={{ ...inputStyle, backgroundColor: 'white' }}
                    onFocus={e => e.target.style.borderColor = '#021048'}
                    onBlur={e => e.target.style.borderColor = '#ddd'}
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section 2: Financial Profile ── */}
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>Financial Profile</h2>
              <p style={sectionDescStyle}>Tax and financial year information that determines your offset type.</p>

              <div style={{ display: 'grid', gap: 16 }}>
                {/* Aggregated Turnover Band */}
                <div>
                  <label style={labelStyle}>Aggregated turnover</label>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {TURNOVER_BANDS.map(opt => (
                      <label key={opt.value} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        border: `1px solid ${form.aggregated_turnover_band === opt.value ? '#021048' : '#ddd'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        backgroundColor: form.aggregated_turnover_band === opt.value ? '#f8f9ff' : 'white',
                        transition: 'all 0.15s',
                      }}>
                        <input
                          type="radio"
                          name="turnover_band"
                          value={opt.value}
                          checked={form.aggregated_turnover_band === opt.value}
                          onChange={() => update('aggregated_turnover_band', opt.value)}
                          style={{ accentColor: '#021048' }}
                        />
                        <span style={{ fontSize: 14, color: '#1a1a1a' }}>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {form.aggregated_turnover_band === 'not_sure' && (
                    <div style={{
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}>
                      <Info size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
                        You&apos;ll need to confirm your turnover band before generating a claim. This determines whether your offset is refundable or non-refundable.
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Year End */}
                <div>
                  <label style={labelStyle}>Financial year end</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <select
                        value={fyMonth}
                        onChange={e => setFyEnd(Number(e.target.value), fyDay)}
                        style={{ ...inputStyle, backgroundColor: 'white' }}
                        onFocus={e => e.target.style.borderColor = '#021048'}
                        onBlur={e => e.target.style.borderColor = '#ddd'}
                      >
                        {MONTHS.map((m, i) => (
                          <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={fyDay}
                        onChange={e => setFyEnd(fyMonth, Number(e.target.value))}
                        style={{ ...inputStyle, backgroundColor: 'white' }}
                        onFocus={e => e.target.style.borderColor = '#021048'}
                        onBlur={e => e.target.style.borderColor = '#ddd'}
                      >
                        {Array.from({ length: 31 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0 0' }}>
                    Most Australian companies use 30 June
                  </p>
                </div>
              </div>
            </div>

            {/* ── Section 3: R&D Profile ── */}
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>R&D Profile</h2>
              <p style={sectionDescStyle}>Additional details about your R&D activities for compliance checks.</p>

              <div style={{ display: 'grid', gap: 16 }}>
                {/* Overseas R&D */}
                <ToggleField
                  label="Overseas R&D conducted"
                  description="Does the company conduct any R&D activities outside Australia?"
                  checked={form.overseas_rd}
                  onChange={v => update('overseas_rd', v)}
                  badge={recommendedBadge}
                />
                {form.overseas_rd && (
                  <WarningBanner>
                    Overseas R&D activities require an <strong>Advance Overseas Finding</strong> from the
                    Board of Innovation Australia before expenses can be claimed.
                  </WarningBanner>
                )}

                {/* R&D for another entity */}
                <ToggleField
                  label="R&D conducted for another entity"
                  description="Is R&D being performed on behalf of or under contract for another company?"
                  checked={form.rd_for_another_entity}
                  onChange={v => update('rd_for_another_entity', v)}
                  badge={recommendedBadge}
                />
                {form.rd_for_another_entity && (
                  <WarningBanner>
                    The claimant must bear both <strong>financial risk</strong> and <strong>technical risk</strong> for the R&D activities.
                    Additional documentation may be required before a claim can be generated.
                  </WarningBanner>
                )}

                {/* Part of a group */}
                <ToggleField
                  label="Part of a connected group"
                  description="Is this company connected to other entities (aggregated group)?"
                  checked={form.part_of_group}
                  onChange={v => update('part_of_group', v)}
                  badge={recommendedBadge}
                />
              </div>
            </div>

            {/* ── Section 4: Advanced (Conditional) ── */}
            {(showLargeTurnoverFields || showFeedstock || form.government_grants) && (
              <div style={sectionStyle}>
                <h2 style={sectionTitleStyle}>Advanced</h2>
                <p style={sectionDescStyle}>Additional fields based on your company profile.</p>

                <div style={{ display: 'grid', gap: 16 }}>
                  {showLargeTurnoverFields && (
                    <>
                      <div>
                        <label style={labelStyle}>Estimated total R&D spend (annual)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#999',
                            fontSize: 14,
                          }}>$</span>
                          <input
                            type="number"
                            value={form.estimated_rd_spend}
                            onChange={e => update('estimated_rd_spend', e.target.value)}
                            placeholder="e.g. 5000000"
                            style={{ ...inputStyle, paddingLeft: 24 }}
                            onFocus={e => e.target.style.borderColor = '#021048'}
                            onBlur={e => e.target.style.borderColor = '#ddd'}
                          />
                        </div>
                        <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0 0' }}>
                          Needed for R&D intensity tier calculation
                        </p>
                      </div>

                      <ToggleField
                        label="R&D expenditure above $150m"
                        description="Will total R&D expenditure exceed $150 million? A cap applies above this amount."
                        checked={form.rd_above_150m}
                        onChange={v => update('rd_above_150m', v)}
                      />
                    </>
                  )}

                  <ToggleField
                    label="Government grants or recoupments"
                    description="Has the company received government grants that relate to R&D activities?"
                    checked={form.government_grants}
                    onChange={v => update('government_grants', v)}
                  />

                  {showFeedstock && (
                    <ToggleField
                      label="Feedstock involvement"
                      description="Does R&D involve manufacturing feedstock that requires adjustment?"
                      checked={form.feedstock_involvement}
                      onChange={v => update('feedstock_involvement', v)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Always show government grants toggle if advanced section isn't visible */}
            {!showLargeTurnoverFields && !showFeedstock && !form.government_grants && (
              <div style={sectionStyle}>
                <h2 style={sectionTitleStyle}>Additional</h2>
                <p style={sectionDescStyle}>Other settings that may affect your claim.</p>
                <ToggleField
                  label="Government grants or recoupments"
                  description="Has the company received government grants that relate to R&D activities?"
                  checked={form.government_grants}
                  onChange={v => update('government_grants', v)}
                />
              </div>
            )}

            {/* Messages */}
            {error && (
              <div style={{
                padding: 12,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 6,
                fontSize: 14,
                color: '#dc2626',
                marginBottom: 16,
              }}>{error}</div>
            )}

            {success && (
              <div style={{
                padding: 12,
                backgroundColor: '#f0fdf4',
                border: '1px solid #a7f3d0',
                borderRadius: 6,
                fontSize: 14,
                color: '#059669',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Check size={16} />
                {success}
              </div>
            )}

            {/* Save button */}
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 500,
                color: 'white',
                backgroundColor: saving ? '#ccc' : '#021048',
                border: 'none',
                borderRadius: 6,
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={e => { if (!saving) e.currentTarget.style.backgroundColor = '#010a2e'; }}
              onMouseOut={e => { if (!saving) e.currentTarget.style.backgroundColor = '#021048'; }}
            >
              {saving ? 'Saving...' : (hasExisting ? 'Save changes' : 'Save company settings')}
            </button>
          </form>
        </main>
      )}

      <style jsx>{`
        input::placeholder, textarea::placeholder {
          color: #999 !important;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

/* ── Toggle Field sub-component ── */
function ToggleField({ label, description, checked, onChange, badge }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
          {label}
          {badge}
        </div>
        {description && (
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          backgroundColor: checked ? '#021048' : '#ddd',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <span style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: 'white',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

/* ── Warning Banner sub-component ── */
function WarningBanner({ children }) {
  return (
    <div style={{
      padding: 12,
      backgroundColor: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: 6,
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
    }}>
      <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}
