'use client';
import { useFinancials } from './FinancialsProvider';
import EditableCell from './EditableCell';
import RDTITooltip from './RDTITooltip';

const NAVY = '#1e3a5f';

const METHOD_OPTIONS = [
  { value: 'prime_cost', label: 'Prime Cost' },
  { value: 'diminishing_value', label: 'Diminishing Value' },
];

export default function DepreciationSection() {
  const { state, derived, api } = useFinancials();
  if (state.loading) return null;

  const section = 'depreciation';
  const items = state.depreciation;
  const total = derived.depreciationTotal;

  const handleAdd = async () => {
    await api.addItem(section, { description: '', purchase_cost: 0, effective_life_years: 5, method: 'prime_cost', rd_use_percent: 0 });
  };

  const fmt = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '$0';
    return '$' + Math.round(n).toLocaleString('en-AU');
  };

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
          <RDTITooltip term="decline_in_value">Decline in Value</RDTITooltip>
          {' '}<span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>({items.length})</span>
        </h2>
        <button onClick={handleAdd} style={{
          padding: '6px 14px', fontSize: 13, fontWeight: 600, color: 'white',
          backgroundColor: NAVY, border: 'none', borderRadius: 6, cursor: 'pointer',
        }}>
          + Add Asset
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Depreciation on R&D assets (s.355-305). Prime cost = cost / life. Diminishing value = cost x (200% / life).
      </p>

      {items.length === 0 ? (
        <div style={{
          padding: 24, textAlign: 'center', backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb', borderRadius: 8, color: '#9ca3af', fontSize: 13,
        }}>
          No R&D assets yet.
        </div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', backgroundColor: 'white' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.5fr 100px 100px 60px 1.2fr 70px 100px 100px 32px',
            padding: '8px 12px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb',
            fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <div>Description</div>
            <div style={{ textAlign: 'right' }}>Purchase Date</div>
            <div style={{ textAlign: 'right' }}>Cost</div>
            <div style={{ textAlign: 'right' }}>Life (yr)</div>
            <div>Method</div>
            <div style={{ textAlign: 'right' }}>R&D %</div>
            <div style={{ textAlign: 'right' }}>Annual Decline</div>
            <div style={{ textAlign: 'right' }}>R&D Portion</div>
            <div></div>
          </div>

          {items.map((item, idx) => {
            const dd = derived.depreciationDerived.get(item.id) || { annualDecline: 0, rdPortion: 0 };

            return (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '1.5fr 100px 100px 60px 1.2fr 70px 100px 100px 32px',
                padding: '6px 12px', borderBottom: idx < items.length - 1 ? '1px solid #f0f0f0' : 'none',
                alignItems: 'center',
              }}>
                <div>
                  <EditableCell value={item.description} onChange={v => api.updateItem(section, item.id, 'description', v)} placeholder="e.g. GPU Server" />
                </div>
                <div>
                  <EditableCell value={item.purchase_date} onChange={v => api.updateItem(section, item.id, 'purchase_date', v)} type="date" style={{ textAlign: 'right', fontSize: 11 }} />
                </div>
                <div>
                  <EditableCell value={item.purchase_cost} onChange={v => api.updateItem(section, item.id, 'purchase_cost', v)} type="money" style={{ textAlign: 'right', fontFamily: 'monospace' }} />
                </div>
                <div>
                  <EditableCell value={item.effective_life_years} onChange={v => api.updateItem(section, item.id, 'effective_life_years', v)} type="number" min={0.5} step={0.5} style={{ textAlign: 'right', fontFamily: 'monospace', width: 45 }} />
                </div>
                <div>
                  <EditableCell
                    value={item.method}
                    onChange={v => api.updateItem(section, item.id, 'method', v)}
                    type="select"
                    options={METHOD_OPTIONS}
                    formatDisplay={v => METHOD_OPTIONS.find(o => o.value === v)?.label || 'Prime Cost'}
                  />
                </div>
                <div>
                  <EditableCell
                    value={item.rd_use_percent}
                    onChange={v => api.updateItem(section, item.id, 'rd_use_percent', v)}
                    type="number" min={0} max={100} step={1}
                    style={{ textAlign: 'right', fontFamily: 'monospace', width: 50 }}
                    formatDisplay={v => `${v || 0}%`}
                  />
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#6b7280', padding: '4px 6px' }}>
                  {fmt(dd.annualDecline)}
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#6b7280', padding: '4px 6px' }}>
                  {fmt(dd.rdPortion)}
                </div>
                <div>
                  <button onClick={() => api.deleteItem(section, item.id)} style={{
                    background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, padding: '2px 4px',
                  }}>x</button>
                </div>
              </div>
            );
          })}

          <div style={{
            display: 'grid', gridTemplateColumns: '1.5fr 100px 100px 60px 1.2fr 70px 100px 100px 32px',
            padding: '10px 12px', borderTop: '2px solid #1a1a1a', fontWeight: 600, fontSize: 13,
          }}>
            <div>Total</div>
            <div></div><div></div><div></div><div></div><div></div><div></div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', color: NAVY }}>{fmt(total)}</div>
            <div></div>
          </div>
        </div>
      )}
    </section>
  );
}
