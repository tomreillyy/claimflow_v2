'use client';
import { useState, useRef, useEffect } from 'react';
import { calculateFullStaffCost, getPayrollTaxRate } from '@/lib/onCostCalculator';
import { calculateTaxBenefit, calculateCostSummary } from '@/lib/taxBenefitCalculator';

export default function CostInterviewPanel({ projectToken, activities, fyYear, turnoverBand, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState({
    state: null,
    staffCosts: [],
    contractors: [],
    cloudCosts: [],
  });
  const [stage, setStage] = useState('team');
  const [complete, setComplete] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start the conversation on mount
  useEffect(() => {
    sendMessage(null, true);
  }, []);

  const sendMessage = async (userMessage, isInitial = false) => {
    if (loading) return;
    setLoading(true);

    const newMessages = isInitial ? [] : [
      ...messages,
      { role: 'user', content: userMessage }
    ];

    if (!isInitial) {
      setMessages(newMessages);
      setInput('');
    }

    try {
      // Build the messages to send to API (only user and assistant messages)
      const apiMessages = newMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.role === 'assistant' ? JSON.stringify({
          reply: m.content,
          extractedData: m.extractedData || extractedData,
          stage: m.stage || stage,
          complete: false,
        }) : m.content }));

      const res = await fetch(`/api/projects/${projectToken}/costs/ai-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();

      setMessages(prev => [
        ...(isInitial ? [] : prev),
        ...(isInitial ? [] : []),
        {
          role: 'assistant',
          content: data.reply,
          extractedData: data.extractedData,
          stage: data.stage,
        }
      ]);

      // If initial, also add the assistant message
      if (isInitial) {
        setMessages([{
          role: 'assistant',
          content: data.reply,
          extractedData: data.extractedData,
          stage: data.stage,
        }]);
      }

      if (data.extractedData) setExtractedData(data.extractedData);
      if (data.stage) setStage(data.stage);
      if (data.complete) setComplete(true);

    } catch (err) {
      console.error('Interview error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Could you try again?',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/projects/${projectToken}/costs/ai-interview/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData }),
      });

      if (!res.ok) throw new Error('Failed to save costs');

      const data = await res.json();
      setConfirmed(true);

      if (onComplete) onComplete(data);
    } catch (err) {
      alert('Failed to save costs: ' + err.message);
    } finally {
      setConfirming(false);
    }
  };

  // Calculate live preview numbers
  const previewNumbers = calculatePreview(extractedData, fyYear);

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 500 }}>
      {/* Left: Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#021048',
          color: 'white',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>AI Cost Setup</span>
          <span style={{
            fontSize: 11,
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '2px 8px',
            borderRadius: 10,
          }}>
            {stage === 'team' ? 'Team & Salaries' :
             stage === 'external_costs' ? 'External Costs' :
             stage === 'apportionment' ? 'R&D Allocation' :
             stage === 'review' ? 'Review & Confirm' : stage}
          </span>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          backgroundColor: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxHeight: 450,
          borderLeft: '1px solid #e5e5e5',
          borderRight: '1px solid #e5e5e5',
        }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                backgroundColor: msg.role === 'user' ? '#021048' : 'white',
                color: msg.role === 'user' ? 'white' : '#1a1a1a',
                fontSize: 14,
                lineHeight: 1.5,
                boxShadow: msg.role === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                border: msg.role === 'user' ? 'none' : '1px solid #e5e5e5',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px 12px 12px 2px',
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                fontSize: 14,
                color: '#999',
              }}>
                Thinking...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {!confirmed && (
          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            gap: 8,
            padding: 12,
            backgroundColor: 'white',
            border: '1px solid #e5e5e5',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={complete ? 'Interview complete — confirm to save' : 'Type your answer...'}
              disabled={loading || confirmed}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: 14,
                border: '1px solid #d1d5db',
                borderRadius: 6,
                outline: 'none',
                color: '#1a1a1a',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || confirmed}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: 'white',
                backgroundColor: '#021048',
                border: 'none',
                borderRadius: 6,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </form>
        )}
      </div>

      {/* Right: Live Preview */}
      <div style={{ width: 340, flexShrink: 0 }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: 8,
          overflow: 'hidden',
          position: 'sticky',
          top: 20,
        }}>
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e5e5e5',
            fontWeight: 600,
            fontSize: 14,
            color: '#1a1a1a',
          }}>
            Cost Preview
          </div>

          <div style={{ padding: 16 }}>
            {/* Staff */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Staff ({extractedData.staffCosts.length})
              </div>
              {extractedData.staffCosts.length === 0 ? (
                <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>Not yet captured</div>
              ) : (
                extractedData.staffCosts.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    padding: '4px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    <span style={{ color: '#1a1a1a' }}>{s.name}</span>
                    <span style={{ fontFamily: 'monospace', color: '#666' }}>
                      ${(s.annualSalary || 0).toLocaleString()}
                      {s.rdPercent ? ` (${s.rdPercent}%)` : ''}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Contractors */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Contractors ({extractedData.contractors.length})
              </div>
              {extractedData.contractors.length === 0 ? (
                <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>Not yet captured</div>
              ) : (
                extractedData.contractors.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    padding: '4px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    <span style={{ color: '#1a1a1a' }}>{c.vendor}</span>
                    <span style={{ fontFamily: 'monospace', color: '#666' }}>
                      ${(c.amount || 0).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Cloud */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Cloud / Software ({extractedData.cloudCosts.length})
              </div>
              {extractedData.cloudCosts.length === 0 ? (
                <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>Not yet captured</div>
              ) : (
                extractedData.cloudCosts.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    padding: '4px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    <span style={{ color: '#1a1a1a' }}>{c.service}</span>
                    <span style={{ fontFamily: 'monospace', color: '#666' }}>
                      ${(c.monthlyAmount || 0).toLocaleString()}/mo
                      {c.rdPercent && c.rdPercent < 100 ? ` (${c.rdPercent}%)` : ''}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: '2px solid #e5e5e5', margin: '16px 0' }} />

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#666' }}>Staff (incl. super + on-costs)</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  ${previewNumbers.staffTotal.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#666' }}>Contractors</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  ${previewNumbers.contractorTotal.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#666' }}>Cloud / Software (annual)</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  ${previewNumbers.cloudTotal.toLocaleString()}
                </span>
              </div>

              <div style={{ borderTop: '1px solid #e5e5e5', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: '#1a1a1a' }}>Total Eligible R&D</span>
                <span style={{ fontFamily: 'monospace', color: '#16a34a' }}>
                  ${previewNumbers.totalEligible.toLocaleString()}
                </span>
              </div>

              {previewNumbers.totalEligible > 0 && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: '#f0fdf4',
                  borderRadius: 6,
                  border: '1px solid #bbf7d0',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    Estimated Tax Benefit
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>
                    ${previewNumbers.taxBenefit.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
                    {previewNumbers.refundable ? 'Refundable offset' : 'Non-refundable offset'} at {(previewNumbers.offsetRate * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Confirm button */}
          {complete && !confirmed && (
            <div style={{ padding: 16, borderTop: '1px solid #e5e5e5' }}>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: '#16a34a',
                  border: 'none',
                  borderRadius: 6,
                  cursor: confirming ? 'not-allowed' : 'pointer',
                  opacity: confirming ? 0.6 : 1,
                }}
              >
                {confirming ? 'Saving...' : 'Confirm & Save All Costs'}
              </button>
            </div>
          )}

          {confirmed && (
            <div style={{
              padding: 16,
              borderTop: '1px solid #e5e5e5',
              backgroundColor: '#f0fdf4',
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: '#16a34a',
            }}>
              Costs saved successfully
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate live preview numbers from extracted data
 */
function calculatePreview(data, fyYear) {
  const year = fyYear || '2025';

  // Staff: annual salary * R&D% + super + on-costs
  let staffTotal = 0;
  for (const s of data.staffCosts || []) {
    const rdSalary = (s.annualSalary || 0) * ((s.rdPercent || 100) / 100);
    const fullCost = calculateFullStaffCost(rdSalary, year, {
      state: data.state || undefined,
    });
    staffTotal += fullCost.annualTotal;
  }

  // Contractors: amount * R&D%
  const contractorTotal = (data.contractors || []).reduce(
    (sum, c) => sum + ((c.amount || 0) * ((c.rdPercent || 100) / 100)), 0
  );

  // Cloud: monthly * 12 * R&D%
  const cloudTotal = (data.cloudCosts || []).reduce(
    (sum, c) => sum + ((c.monthlyAmount || 0) * 12 * ((c.rdPercent || 100) / 100)), 0
  );

  const totalEligible = Math.round(staffTotal + contractorTotal + cloudTotal);

  // Tax benefit
  const benefit = calculateTaxBenefit(totalEligible, null); // turnoverBand from props would be better

  return {
    staffTotal: Math.round(staffTotal),
    contractorTotal: Math.round(contractorTotal),
    cloudTotal: Math.round(cloudTotal),
    totalEligible,
    taxBenefit: Math.round(benefit.offsetAmount),
    offsetRate: benefit.offsetRate,
    refundable: benefit.refundable,
  };
}
