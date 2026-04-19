'use client';
import { useState } from 'react';
import { useFinancials } from './FinancialsProvider';
import EditableCell from './EditableCell';
import RDTITooltip from './RDTITooltip';

const NAVY = '#1e3a5f';
const FY_HOURS = 1720;

export default function ActivitySplitDrawer({ member }) {
  const { state, derived, api } = useFinancials();
  const [deleting, setDeleting] = useState(false);

  const d = derived.teamDerived.get(member.id) || { fullyLoaded: 0, rdHours: 0, rdPct: 0, rdCost: 0 };
  const splits = member.splits || [];
  const totalHours = splits.reduce((sum, s) => sum + parseFloat(s.hours || 0), 0);
  const hoursExceeded = totalHours > FY_HOURS;

  const activityOptions = (state.activities || []).map(a => ({
    value: a.id,
    label: a.name,
  }));

  const handleAddSplit = async () => {
    // Find first activity not already used
    const usedIds = new Set(splits.map(s => s.activity_id));
    const available = state.activities.find(a => !usedIds.has(a.id));
    if (!available && state.activities.length > 0) {
      // Allow duplicate if needed
      const newSplits = [...splits, { activity_id: state.activities[0].id, hours: 0 }];
      await api.saveSplits(member.id, newSplits);
    } else if (available) {
      const newSplits = [...splits, { activity_id: available.id, hours: 0 }];
      await api.saveSplits(member.id, newSplits);
    }
  };

  const handleUpdateSplit = async (index, field, value) => {
    const newSplits = splits.map((s, i) => {
      if (i !== index) return s;
      return { ...s, [field]: value };
    });
    await api.saveSplits(member.id, newSplits);
  };

  const handleDeleteSplit = async (index) => {
    const newSplits = splits.filter((_, i) => i !== index);
    await api.saveSplits(member.id, newSplits);
  };

  const handleDeleteMember = async () => {
    if (!confirm(`Delete ${member.person_name} from the team?`)) return;
    setDeleting(true);
    await api.deleteTeamMember(member.id);
  };

  const fmt = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '$0';
    return '$' + Math.round(n).toLocaleString('en-AU');
  };

  return (
    <div style={{
      padding: '16px 20px',
      backgroundColor: '#f8fafc',
      borderBottom: '1px solid #e5e7eb',
    }}>
      {/* Hours exceeded warning */}
      {hoursExceeded && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: 6,
          fontSize: 13,
          color: '#92400e',
          marginBottom: 12,
          fontWeight: 500,
        }}>
          Total hours ({totalHours}) exceeds {FY_HOURS} FY standard hours
        </div>
      )}

      {/* Activity splits table */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          <RDTITooltip term="apportionment">Activity Split</RDTITooltip>
        </div>

        {splits.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
            No activity hours allocated yet.
          </div>
        ) : (
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            overflow: 'hidden',
            backgroundColor: 'white',
          }}>
            {/* Split header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 80px 80px 1fr 32px',
              padding: '6px 10px',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              fontSize: 10,
              fontWeight: 600,
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <div>Activity</div>
              <div style={{ textAlign: 'right' }}>Hours</div>
              <div style={{ textAlign: 'right' }}>% of FY</div>
              <div style={{ textAlign: 'right' }}>Cost Allocation</div>
              <div></div>
            </div>

            {/* Split rows */}
            {splits.map((split, idx) => {
              const hours = parseFloat(split.hours || 0);
              const pct = FY_HOURS > 0 ? hours / FY_HOURS : 0;
              const cost = pct * d.fullyLoaded;

              return (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 80px 80px 1fr 32px',
                  padding: '6px 10px',
                  borderBottom: idx < splits.length - 1 ? '1px solid #f0f0f0' : 'none',
                  alignItems: 'center',
                  fontSize: 13,
                }}>
                  <div>
                    <EditableCell
                      value={split.activity_id}
                      onChange={(v) => handleUpdateSplit(idx, 'activity_id', v)}
                      type="select"
                      options={activityOptions}
                      formatDisplay={(v) => {
                        const act = state.activities.find(a => a.id === v);
                        return act ? act.name : 'Select activity';
                      }}
                    />
                  </div>
                  <div>
                    <EditableCell
                      value={split.hours}
                      onChange={(v) => handleUpdateSplit(idx, 'hours', v)}
                      type="number"
                      min={0}
                      max={FY_HOURS}
                      style={{ textAlign: 'right', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', color: '#6b7280', padding: '4px 6px' }}>
                    {(pct * 100).toFixed(1)}%
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, padding: '4px 6px' }}>
                    {fmt(cost)}
                  </div>
                  <div>
                    <button
                      onClick={() => handleDeleteSplit(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: '2px 4px',
                        borderRadius: 4,
                      }}
                      title="Remove"
                    >
                      x
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Total row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 80px 80px 1fr 32px',
              padding: '6px 10px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              fontWeight: 600,
              fontSize: 12,
            }}>
              <div>Total</div>
              <div style={{ textAlign: 'right', fontFamily: 'monospace', color: hoursExceeded ? '#dc2626' : '#1a1a1a' }}>
                {totalHours.toFixed(0)}
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'monospace', color: '#6b7280' }}>
                {((totalHours / FY_HOURS) * 100).toFixed(1)}%
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'monospace', color: NAVY }}>
                {fmt(d.rdCost)}
              </div>
              <div></div>
            </div>
          </div>
        )}

        <button
          onClick={handleAddSplit}
          disabled={!state.activities || state.activities.length === 0}
          style={{
            marginTop: 8,
            padding: '4px 12px',
            fontSize: 12,
            color: NAVY,
            backgroundColor: 'transparent',
            border: `1px solid ${NAVY}`,
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          + Add Activity Line
        </button>
        {(!state.activities || state.activities.length === 0) && (
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>
            Create activities first
          </span>
        )}
      </div>

      {/* Compensation breakdown + Associate toggle */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Compensation breakdown */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Compensation Breakdown
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 16px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: '10px 12px',
          }}>
            {[
              { label: 'Base Salary', field: 'base_salary' },
              { label: 'Super', field: 'super_amount' },
              { label: 'Payroll Tax', field: 'payroll_tax_amount' },
              { label: 'Workers Comp', field: 'workers_comp_amount' },
              { label: 'Leave Accrual', field: 'leave_accrual_amount' },
            ].map(({ label, field }) => (
              <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
                <EditableCell
                  value={member[field]}
                  onChange={(v) => api.updateTeamMember(member.id, field, v)}
                  type="money"
                  style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, width: 100 }}
                />
              </div>
            ))}
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid #e5e7eb',
              paddingTop: 4,
              marginTop: 4,
              fontWeight: 600,
              fontSize: 12,
            }}>
              <span>Fully Loaded</span>
              <span style={{ fontFamily: 'monospace', color: NAVY }}>{fmt(d.fullyLoaded)}</span>
            </div>
          </div>
        </div>

        {/* Associate toggle + delete */}
        <div style={{ minWidth: 200 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Classification
          </div>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: '10px 12px',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: 8,
            }}>
              <input
                type="checkbox"
                checked={member.is_associate || false}
                onChange={(e) => api.updateTeamMember(member.id, 'is_associate', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: NAVY }}
              />
              <RDTITooltip term="associate">
                <span style={{ fontWeight: 500 }}>Mark as Associate</span>
              </RDTITooltip>
            </label>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, lineHeight: 1.4 }}>
              Directors, founders, majority shareholders (s.318 ITAA 1936)
            </p>
          </div>

          <button
            onClick={handleDeleteMember}
            disabled={deleting}
            style={{
              marginTop: 12,
              padding: '6px 12px',
              fontSize: 12,
              color: '#dc2626',
              backgroundColor: 'transparent',
              border: '1px solid #fca5a5',
              borderRadius: 4,
              cursor: deleting ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            Delete Team Member
          </button>
        </div>
      </div>
    </div>
  );
}
