'use client';
import { useState } from 'react';

const NAVY = '#021048';

const SOURCE_ICONS = {
  manual: 'M',
  email: '@',
  github: 'G',
  document: 'D',
  upload: 'U',
  jira: 'J',
};

export default function WorkspaceView({ items = [], evidenceSteps = {}, evidenceActivityTypes = {} }) {
  const [selectedId, setSelectedId] = useState(null);

  const visibleItems = items;

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 160px)', minHeight: 500 }}>
      {/* Left panel — Evidence list */}
      <div style={{
        flex: 1,
        borderRight: '1px solid #e5e5e5',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e5e5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            Evidence ({visibleItems.length})
          </h2>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {visibleItems.length > 0 ? (
            visibleItems.map((ev) => {
              const currentEvidence = evidenceSteps[ev.id] || {
                step: ev.systematic_step_primary,
                source: ev.systematic_step_source || 'auto',
              };
              const currentActivityType = evidenceActivityTypes[ev.id] || {
                activity_type: ev.activity_type || 'core',
                source: ev.activity_type_source || 'auto',
              };
              const isSelected = selectedId === ev.id;

              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedId(ev.id)}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#f0f4ff' : 'white',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'white'; }}
                >
                  {/* Top row: date + source + step */}
                  <div style={{
                    fontSize: 12,
                    color: '#999',
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'ui-monospace, Monaco, monospace',
                  }}>
                    {/* Source icon */}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 18,
                      height: 18,
                      borderRadius: 3,
                      backgroundColor: '#f3f4f6',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#666',
                      flexShrink: 0,
                    }}>
                      {SOURCE_ICONS[ev.source] || 'M'}
                    </span>
                    <span style={{ color: '#666', fontWeight: 500 }}>
                      {new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {currentEvidence.step && currentEvidence.step !== 'Unknown' && (
                      <>
                        <span>·</span>
                        <span style={{ color: '#1a1a1a', fontWeight: 600, fontSize: 11 }}>
                          {currentEvidence.step}
                        </span>
                      </>
                    )}
                    {currentActivityType.activity_type && (
                      <>
                        <span>·</span>
                        <span style={{
                          padding: '1px 5px',
                          fontSize: 10,
                          fontWeight: 600,
                          borderRadius: 3,
                          backgroundColor: currentActivityType.activity_type === 'core' ? NAVY : '#666',
                          color: 'white',
                        }}>
                          {currentActivityType.activity_type === 'core' ? 'Core' : 'Supp'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Content preview */}
                  {ev.content && (
                    <p style={{
                      fontSize: 13,
                      color: '#1a1a1a',
                      lineHeight: 1.5,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {ev.content}
                    </p>
                  )}

                  {/* Author */}
                  {ev.author_email && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      {ev.author_email}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
              <p style={{ fontSize: 14, margin: '0 0 4px 0' }}>No evidence yet</p>
              <p style={{ fontSize: 13, margin: 0 }}>Add evidence from the Evidence tab to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — Empty for now */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
        backgroundColor: '#fafafa',
      }}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>{ }</div>
          <p style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>Workspace</p>
          <p style={{ fontSize: 13, margin: '4px 0 0', color: '#c0c0c0' }}>Select evidence to get started</p>
        </div>
      </div>
    </div>
  );
}
