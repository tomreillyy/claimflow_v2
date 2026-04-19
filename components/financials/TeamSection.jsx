'use client';
import { useState } from 'react';
import { useFinancials } from './FinancialsProvider';
import EditableCell from './EditableCell';
import RDTITooltip from './RDTITooltip';
import ActivitySplitDrawer from './ActivitySplitDrawer';

const NAVY = '#1e3a5f';

export default function TeamSection() {
  const { state, derived, api } = useFinancials();
  const [expandedId, setExpandedId] = useState(null);
  const [adding, setAdding] = useState(false);

  if (state.loading) return <div style={{ padding: 20, color: '#9ca3af' }}>Loading team...</div>;

  const handleAdd = async () => {
    setAdding(true);
    const member = await api.addTeamMember({ person_name: 'New Person' });
    if (member) setExpandedId(member.id);
    setAdding(false);
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const fmt = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '$0';
    return '$' + Math.round(n).toLocaleString('en-AU');
  };

  const pctFmt = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '0%';
    return (n * 100).toFixed(1) + '%';
  };

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
          <RDTITooltip term="on_costs">
            Team
          </RDTITooltip>
          {' '}
          <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>({state.team.length})</span>
        </h2>
        <button
          onClick={handleAdd}
          disabled={adding}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: 'white',
            backgroundColor: NAVY,
            border: 'none',
            borderRadius: 6,
            cursor: adding ? 'not-allowed' : 'pointer',
            opacity: adding ? 0.6 : 1,
          }}
        >
          + Add Person
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Base salary, on-costs, and <RDTITooltip term="fy_hours">R&D hours</RDTITooltip> per activity. Click a row to expand the activity split drawer.
      </p>

      {state.team.length === 0 ? (
        <div style={{
          padding: 32,
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          color: '#9ca3af',
          fontSize: 14,
        }}>
          No team members yet. Click "Add Person" to start building your team roster.
        </div>
      ) : (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: 'white',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 80px 80px 1fr 36px',
            gap: 0,
            padding: '8px 12px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontSize: 11,
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <div>Person</div>
            <div style={{ textAlign: 'right' }}>Base Salary</div>
            <div style={{ textAlign: 'right' }}>
              <RDTITooltip term="on_costs">On-Costs</RDTITooltip>
            </div>
            <div style={{ textAlign: 'right' }}>
              <RDTITooltip term="fy_hours">R&D Hrs</RDTITooltip>
            </div>
            <div style={{ textAlign: 'right' }}>R&D %</div>
            <div style={{ textAlign: 'right' }}>R&D Cost</div>
            <div></div>
          </div>

          {/* Rows */}
          {state.team.map((member, idx) => {
            const d = derived.teamDerived.get(member.id) || { fullyLoaded: 0, rdHours: 0, rdPct: 0, rdCost: 0 };
            const onCosts = d.fullyLoaded - parseFloat(member.base_salary || 0);
            const isExpanded = expandedId === member.id;

            return (
              <div key={member.id}>
                <div
                  onClick={() => toggleExpand(member.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 80px 80px 1fr 36px',
                    gap: 0,
                    padding: '8px 12px',
                    borderBottom: idx < state.team.length - 1 || isExpanded ? '1px solid #f0f0f0' : 'none',
                    cursor: 'pointer',
                    backgroundColor: isExpanded ? '#f8fafc' : 'white',
                    transition: 'background-color 0.1s',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = '#fafbfc'; }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'white'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <EditableCell
                      value={member.person_name}
                      onChange={(v) => api.updateTeamMember(member.id, 'person_name', v)}
                      placeholder="Name"
                      style={{ fontWeight: 500 }}
                    />
                    {member.is_associate && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#dc2626',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fca5a5',
                        borderRadius: 10,
                        padding: '1px 6px',
                        whiteSpace: 'nowrap',
                      }}>
                        Associate
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <EditableCell
                      value={member.base_salary}
                      onChange={(v) => api.updateTeamMember(member.id, 'base_salary', v)}
                      type="money"
                      style={{ textAlign: 'right', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#6b7280', padding: '4px 6px' }}>
                    {fmt(onCosts)}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace', padding: '4px 6px' }}>
                    {d.rdHours > 0 ? d.rdHours.toFixed(0) : '--'}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace', padding: '4px 6px' }}>
                    {d.rdPct > 0 ? pctFmt(d.rdPct) : '--'}
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    color: NAVY,
                    padding: '4px 6px',
                  }}>
                    {fmt(d.rdCost)}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 14, color: '#9ca3af' }}>
                    {isExpanded ? '\u25B2' : '\u25BC'}
                  </div>
                </div>

                {/* Activity split drawer */}
                {isExpanded && (
                  <ActivitySplitDrawer member={member} />
                )}
              </div>
            );
          })}

          {/* Totals row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 80px 80px 1fr 36px',
            gap: 0,
            padding: '10px 12px',
            borderTop: '2px solid #1a1a1a',
            fontWeight: 600,
            fontSize: 13,
          }}>
            <div>Total</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
              {fmt(state.team.reduce((s, m) => s + parseFloat(m.base_salary || 0), 0))}
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', color: '#6b7280' }}>
              {fmt(state.team.reduce((s, m) => {
                const d = derived.teamDerived.get(m.id);
                return s + (d ? d.fullyLoaded - parseFloat(m.base_salary || 0) : 0);
              }, 0))}
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
              {state.team.reduce((s, m) => {
                const d = derived.teamDerived.get(m.id);
                return s + (d ? d.rdHours : 0);
              }, 0).toFixed(0)}
            </div>
            <div></div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', color: NAVY }}>
              {fmt(derived.totalSalaries)}
            </div>
            <div></div>
          </div>
        </div>
      )}
    </section>
  );
}
