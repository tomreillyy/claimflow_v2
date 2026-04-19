'use client';
import { useFinancials } from './FinancialsProvider';
import EditableCell from './EditableCell';
import RDTITooltip from './RDTITooltip';

const NAVY = '#1e3a5f';

const APPORTIONMENT_OPTIONS = [
  { value: 'labour_ratio', label: 'Labour Ratio' },
  { value: 'floor_area', label: 'Floor Area' },
  { value: 'direct_measure', label: 'Direct Measure' },
  { value: 'custom', label: 'Custom' },
];

export default function OverheadsSection() {
  const { state, derived, api } = useFinancials();
  if (state.loading) return null;

  const section = 'overheads';
  const items = state.overheads;
  const total = derived.overheadsTotal;

  const handleAdd = async () => {
    await api.addItem(section, { description: '', annual_cost: 0, rd_percent: 0 });
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
          <RDTITooltip term="apportionment">Overheads</RDTITooltip>
          {' '}<span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>({items.length})</span>
        </h2>
        <button onClick={handleAdd} style={{
          padding: '6px 14px', fontSize: 13, fontWeight: 600, color: 'white',
          backgroundColor: NAVY, border: 'none', borderRadius: 6, cursor: 'pointer',
        }}>
          + Add Overhead
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Apportioned share of rent, utilities, and software. R&D portion is computed from annual cost and R&D %.
      </p>

      {items.length === 0 ? (
        <div style={{
          padding: 24, textAlign: 'center', backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb', borderRadius: 8, color: '#9ca3af', fontSize: 13,
        }}>
          No overhead items yet.
        </div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', backgroundColor: 'white' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 120px 80px 120px 32px',
            padding: '8px 12px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb',
            fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <div>Description</div>
            <div><RDTITooltip term="apportionment">Basis</RDTITooltip></div>
            <div style={{ textAlign: 'right' }}>Annual Cost</div>
            <div style={{ textAlign: 'right' }}>R&D %</div>
            <div style={{ textAlign: 'right' }}>R&D Portion</div>
            <div></div>
          </div>

          {items.map((item, idx) => {
            const rdPortion = parseFloat(item.annual_cost || 0) * parseFloat(item.rd_percent || 0) / 100;
            const highRd = parseFloat(item.rd_percent || 0) > 80;

            return (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.5fr 120px 80px 120px 32px',
                padding: '6px 12px',
                borderBottom: idx < items.length - 1 ? '1px solid #f0f0f0' : 'none',
                alignItems: 'center',
                backgroundColor: highRd ? '#fffbeb' : 'white',
              }}>
                <div>
                  <EditableCell value={item.description} onChange={v => api.updateItem(section, item.id, 'description', v)} placeholder="e.g. Office rent" />
                </div>
                <div>
                  <EditableCell
                    value={item.apportionment_basis}
                    onChange={v => api.updateItem(section, item.id, 'apportionment_basis', v)}
                    type="select"
                    options={APPORTIONMENT_OPTIONS}
                    formatDisplay={v => APPORTIONMENT_OPTIONS.find(o => o.value === v)?.label || 'Select'}
                  />
                </div>
                <div>
                  <EditableCell value={item.annual_cost} onChange={v => api.updateItem(section, item.id, 'annual_cost', v)} type="money" style={{ textAlign: 'right', fontFamily: 'monospace' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <EditableCell
                    value={item.rd_percent}
                    onChange={v => api.updateItem(section, item.id, 'rd_percent', v)}
                    type="number"
                    min={0} max={100} step={1}
                    style={{ textAlign: 'right', fontFamily: 'monospace', width: 50 }}
                    formatDisplay={v => `${v || 0}%`}
                  />
                  {highRd && (
                    <span title="R&D % over 80% may trigger ATO review" style={{
                      fontSize: 12, color: '#d97706', fontWeight: 700,
                    }}>!</span>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#6b7280', padding: '4px 6px' }}>
                  {fmt(rdPortion)}
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
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 120px 80px 120px 32px',
            padding: '10px 12px', borderTop: '2px solid #1a1a1a', fontWeight: 600, fontSize: 13,
          }}>
            <div>Total</div>
            <div></div><div></div><div></div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', color: NAVY }}>{fmt(total)}</div>
            <div></div>
          </div>
        </div>
      )}
    </section>
  );
}
