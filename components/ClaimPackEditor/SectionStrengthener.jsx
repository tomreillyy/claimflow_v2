'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SectionStrengthener({ sectionKey, projectToken, currentContent, onInsertContent, onClose }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null); // null = not loaded yet
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [answers, setAnswers] = useState({}); // { [suggId]: { q0: '', q1: '' } }
  const [draftingId, setDraftingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const analyse = async () => {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${projectToken}/claim-pack/strengthen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ sectionKey, currentContent }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setMessage(data.message || null);
    } catch (e) {
      setError('Could not load suggestions — ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (sugg) => {
    onInsertContent(sugg.draftContent);
    setAddedIds(prev => new Set([...prev, sugg.id]));
  };

  const handleDraftFromAnswers = async (sugg) => {
    setDraftingId(sugg.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${projectToken}/claim-pack/strengthen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: 'draft',
          suggestion: sugg,
          answers: answers[sugg.id] || {},
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.draftContent) {
        // Replace the suggestion's draft with the refined version
        setSuggestions(prev => prev.map(s => s.id === sugg.id
          ? { ...s, draftContent: data.draftContent }
          : s
        ));
      }
    } catch (e) {
      console.error('[SectionStrengthener] draft error:', e);
    } finally {
      setDraftingId(null);
    }
  };

  const setAnswer = (suggId, qIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [suggId]: { ...(prev[suggId] || {}), [`q${qIndex}`]: value },
    }));
  };

  const panelStyle = {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 6,
    margin: '0 14px 8px',
    fontSize: 12,
    overflow: 'hidden',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: suggestions?.length > 0 ? '1px solid #bfdbfe' : 'none',
    backgroundColor: '#dbeafe',
  };

  const btnStyle = (variant = 'primary') => ({
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    border: '1px solid',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: 'system-ui',
    backgroundColor: variant === 'primary' ? '#1d4ed8' : 'transparent',
    color: variant === 'primary' ? 'white' : '#1d4ed8',
    borderColor: variant === 'primary' ? '#1d4ed8' : '#93c5fd',
  });

  const closeBtn = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 1,
    padding: '2px 4px',
    fontFamily: 'system-ui',
  };

  // Initial "not yet run" state — show an Analyse button
  if (suggestions === null && !loading && !error) {
    return (
      <div className="print-hide" style={panelStyle}>
        <div style={headerStyle}>
          <span style={{ color: '#1e40af', fontWeight: 600, fontSize: 12 }}>
            ✦ Strengthen with AI
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button style={btnStyle('primary')} onClick={analyse}>
              Find gaps
            </button>
            <button style={closeBtn} onClick={onClose} title="Dismiss">×</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="print-hide" style={panelStyle}>
        <div style={{ padding: '10px 12px', color: '#1e40af', fontSize: 12 }}>
          Analysing evidence for gaps...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="print-hide" style={{ ...panelStyle, backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
        <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#991b1b', fontSize: 12 }}>{error}</span>
          <button style={closeBtn} onClick={onClose}>×</button>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="print-hide" style={panelStyle}>
        <div style={headerStyle}>
          <span style={{ color: '#1e40af', fontSize: 12 }}>
            ✦ {message || 'No additional gaps detected in the evidence.'}
          </span>
          <button style={closeBtn} onClick={onClose}>×</button>
        </div>
      </div>
    );
  }

  return (
    <div className="print-hide" style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ color: '#1e40af', fontWeight: 600, fontSize: 12 }}>
          ✦ {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
        </span>
        <button style={closeBtn} onClick={onClose} title="Dismiss">×</button>
      </div>

      {suggestions.map((sugg, i) => {
        const isAdded = addedIds.has(sugg.id);
        const isExpanded = expandedId === sugg.id;
        const isDrafting = draftingId === sugg.id;
        const suggAnswers = answers[sugg.id] || {};
        const hasAnswers = Object.values(suggAnswers).some(v => v?.trim());

        return (
          <div key={sugg.id} style={{
            borderBottom: i < suggestions.length - 1 ? '1px solid #bfdbfe' : 'none',
            padding: '10px 12px',
            backgroundColor: isAdded ? '#f0fdf4' : 'transparent',
          }}>
            {/* Suggestion header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: isAdded ? '#166534' : '#1e3a8a', fontSize: 12, marginBottom: 2 }}>
                  {isAdded ? '✓ ' : ''}{sugg.title}
                </div>
                <div style={{ color: '#374151', fontSize: 11, lineHeight: 1.5 }}>
                  {sugg.rationale}
                </div>
              </div>
            </div>

            {/* Draft preview */}
            {!isAdded && (
              <div style={{
                marginTop: 8,
                padding: '6px 8px',
                backgroundColor: 'white',
                border: '1px solid #dbeafe',
                borderRadius: 4,
                fontSize: 11,
                color: '#4b5563',
                lineHeight: 1.6,
                fontStyle: 'italic',
                maxHeight: 80,
                overflow: 'hidden',
              }}>
                {sugg.draftContent.substring(0, 200)}{sugg.draftContent.length > 200 ? '...' : ''}
              </div>
            )}

            {/* Action buttons */}
            {!isAdded && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                <button
                  style={btnStyle('primary')}
                  onClick={() => handleAdd(sugg)}
                >
                  Add to section
                </button>
                {sugg.questions?.length > 0 && (
                  <button
                    style={btnStyle('secondary')}
                    onClick={() => setExpandedId(isExpanded ? null : sugg.id)}
                  >
                    {isExpanded ? 'Hide questions ▲' : 'Tell me more ▾'}
                  </button>
                )}
              </div>
            )}

            {/* Expanded follow-up questions */}
            {isExpanded && !isAdded && (
              <div style={{ marginTop: 10, borderTop: '1px solid #bfdbfe', paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: '#374151', marginBottom: 8, fontWeight: 500 }}>
                  Answer a few questions to get a more specific draft:
                </div>
                {sugg.questions.map((q, qi) => (
                  <div key={qi} style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, color: '#374151', display: 'block', marginBottom: 3 }}>
                      {q}
                    </label>
                    <input
                      type="text"
                      value={suggAnswers[`q${qi}`] || ''}
                      onChange={e => setAnswer(sugg.id, qi, e.target.value)}
                      placeholder="Your answer..."
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: 11,
                        border: '1px solid #bfdbfe',
                        borderRadius: 3,
                        fontFamily: 'system-ui',
                        boxSizing: 'border-box',
                        backgroundColor: 'white',
                      }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    style={{ ...btnStyle('primary'), opacity: isDrafting || !hasAnswers ? 0.6 : 1 }}
                    onClick={() => handleDraftFromAnswers(sugg)}
                    disabled={isDrafting || !hasAnswers}
                  >
                    {isDrafting ? 'Drafting...' : 'Generate refined draft'}
                  </button>
                  <span style={{ fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>
                    then click "Add to section"
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
