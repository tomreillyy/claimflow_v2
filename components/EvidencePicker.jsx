'use client';
import { useState, useMemo } from 'react';
import { formatAuditTimestampShort } from '@/lib/formatAuditTimestamp';

const SOURCE_ICONS = { manual: 'M', note: 'M', email: '@', github: 'G', document: 'D', upload: 'U' };
const SOURCE_COLORS = { github: '#24292f', email: '#0ea5e9', document: '#8b5cf6', manual: '#021048', note: '#021048', upload: '#021048' };

export default function EvidencePicker({ step, allEvidence, linkedEvidenceIds, onLink, onClose }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sourceFilter, setSourceFilter] = useState('all');

  // Filter evidence: exclude already linked, apply search and source filter
  const filteredEvidence = useMemo(() => {
    let items = (allEvidence || []).filter(ev => {
      if (ev.soft_deleted) return false;
      if (linkedEvidenceIds.has(ev.id)) return false;
      return true;
    });

    if (sourceFilter !== 'all') {
      items = items.filter(ev => ev.source === sourceFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(ev =>
        (ev.content || '').toLowerCase().includes(q) ||
        (ev.author_email || '').toLowerCase().includes(q)
      );
    }

    return items;
  }, [allEvidence, linkedEvidenceIds, search, sourceFilter]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLink = () => {
    if (selected.size === 0) return;
    onLink([...selected]);
  };

  // Get unique sources for filter
  const availableSources = useMemo(() => {
    const sources = new Set((allEvidence || []).map(ev => ev.source).filter(Boolean));
    return [...sources];
  }, [allEvidence]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          width: '100%',
          maxWidth: 640,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
              Link Evidence to {step}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
              Select evidence items to assign to this step
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 22, color: '#94a3b8',
              cursor: 'pointer', padding: '0 4px',
            }}
          >
            &times;
          </button>
        </div>

        {/* Search + filter */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search evidence..."
            style={{
              width: '100%',
              padding: '9px 12px',
              fontSize: 14,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              outline: 'none',
              marginBottom: 8,
              boxSizing: 'border-box',
              color: '#1a1a1a',
            }}
            onFocus={e => e.target.style.borderColor = '#021048'}
            onBlur={e => e.target.style.borderColor = '#d1d5db'}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <FilterChip label="All" active={sourceFilter === 'all'} onClick={() => setSourceFilter('all')} />
            {availableSources.map(src => (
              <FilterChip key={src} label={src} active={sourceFilter === src} onClick={() => setSourceFilter(src)} />
            ))}
          </div>
        </div>

        {/* Evidence list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
          {filteredEvidence.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              {search ? 'No matching evidence found.' : 'No unlinked evidence available.'}
            </div>
          ) : (
            filteredEvidence.map(ev => {
              const isSelected = selected.has(ev.id);
              const content = ev.content || '';
              const snippet = content.length > 140 ? content.slice(0, 140) + '...' : content;
              const source = ev.source || 'manual';
              const date = formatAuditTimestampShort(ev.created_at);

              return (
                <div
                  key={ev.id}
                  onClick={() => toggleSelect(ev.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '12px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: `1px solid ${isSelected ? '#021048' : 'transparent'}`,
                    backgroundColor: isSelected ? '#f0f4ff' : 'transparent',
                    marginBottom: 4,
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#fafbfc'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                    border: `2px solid ${isSelected ? '#021048' : '#d1d5db'}`,
                    backgroundColor: isSelected ? '#021048' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Source icon */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: SOURCE_COLORS[source] || '#021048',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 600, marginTop: 2,
                  }}>
                    {SOURCE_ICONS[source] || 'M'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                      {snippet}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                      {date} &middot; {source}
                      {ev.systematic_step_primary && ev.systematic_step_primary !== 'Unknown' && (
                        <> &middot; {ev.systematic_step_primary}</>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {selected.size} selected
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              padding: '8px 20px',
              backgroundColor: 'white',
              color: '#64748b',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={selected.size === 0}
              style={{
                padding: '8px 20px',
                backgroundColor: selected.size > 0 ? '#021048' : '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Link {selected.size > 0 ? `${selected.size} item${selected.size > 1 ? 's' : ''}` : 'Selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 14,
        border: `1px solid ${active ? '#021048' : '#e5e7eb'}`,
        backgroundColor: active ? '#021048' : 'white',
        color: active ? 'white' : '#64748b',
        cursor: 'pointer',
        textTransform: 'capitalize',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}
