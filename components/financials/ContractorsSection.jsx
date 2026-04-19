'use client';
import { useFinancials } from './FinancialsProvider';
import EditableCell from './EditableCell';
import RDTITooltip from './RDTITooltip';

const NAVY = '#1e3a5f';

export default function ContractorsSection() {
  const { state, derived, api } = useFinancials();
  if (state.loading) return null;

  const section = 'contractors';
  const items = state.contractors;
  const total = derived.contractorsTotal;

  const activityOptions = (state.activities || []).map(a => ({ value: a.id, label: a.name }));

  const handleAdd = async () => {
    await api.addItem(section, { description: '', invoice_amount: 0 });
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
          Contractors <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>({items.length})</span>
        </h2>
        <button onClick={handleAdd} style={{
          padding: '6px 14px', fontSize: 13, fontWeight: 600, color: 'white',
          backgroundColor: NAVY, border: 'none', borderRadius: 6, cursor: 'pointer',
        }}>
          + Add Invoice
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Third-party contractor invoices for R&D services.
      </p>

      {items.length === 0 ? (
        <div style={{
          padding: 24, textAlign: 'center', backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb', borderRadius: 8, color: '#9ca3af', fontSize: 13,
        }}>
          No contractor invoices yet.
        </div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', backgroundColor: 'white' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 110px 110px 110px 32px',
            padding: '8px 12px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb',
            fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <div>Description</div>
            <div>Activity</div>
            <div style={{ textAlign: 'right' }}>Date</div>
            <div style={{ textAlign: 'right' }}>Invoice Amt</div>
            <div style={{ textAlign: 'right' }}>R&D Portion</div>
            <div></div>
          </div>

          {items.map((item, idx) => (
            <div key={item.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 110px 110px 110px 32px',
              padding: '6px 12px', borderBottom: idx < items.length - 1 ? '1px solid #f0f0f0' : 'none',
              alignItems: 'center',
            }}>
              <div>
                <EditableCell value={item.description} onChange={v => api.updateItem(section, item.id, 'description', v)} placeholder="Description" />
              </div>
              <div>
                <EditableCell
                  value={item.activity_id}
                  onChange={v => api.updateItem(section, item.id, 'activity_id', v)}
                  type="select"
                  options={activityOptions}
                  formatDisplay={v => {
                    const act = state.activities.find(a => a.id === v);
                    return act ? act.name : 'Select';
                  }}
                />
              </div>
              <div>
                <EditableCell value={item.invoice_date} onChange={v => api.updateItem(section, item.id, 'invoice_date', v)} type="date" style={{ textAlign: 'right', fontSize: 12 }} />
              </div>
              <div>
                <EditableCell value={item.invoice_amount} onChange={v => api.updateItem(section, item.id, 'invoice_amount', v)} type="money" style={{ textAlign: 'right', fontFamily: 'monospace' }} />
              </div>
              <div>
                <EditableCell value={item.rd_portion} onChange={v => api.updateItem(section, item.id, 'rd_portion', v)} type="money" style={{ textAlign: 'right', fontFamily: 'monospace' }} />
              </div>
              <div>
                <button onClick={() => api.deleteItem(section, item.id)} style={{
                  background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, padding: '2px 4px',
                }}>x</button>
              </div>
            </div>
          ))}

          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 110px 110px 110px 32px',
            padding: '10px 12px', borderTop: '2px solid #1a1a1a', fontWeight: 600, fontSize: 13,
          }}>
            <div>Total</div>
            <div></div>
            <div></div>
            <div></div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', color: NAVY }}>{fmt(total)}</div>
            <div></div>
          </div>
        </div>
      )}
    </section>
  );
}
