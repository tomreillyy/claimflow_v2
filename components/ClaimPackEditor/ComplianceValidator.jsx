'use client';

import { useState } from 'react';
import { getRatingColor, getRatingLabel } from '@/lib/claimPackValidator';

export default function ComplianceValidator({ validation }) {
  const [expanded, setExpanded] = useState(false);

  if (!validation) {
    return null;
  }

  const { score, rating, issues, warnings, suggestions, summary } = validation;
  const hasProblems = issues.length > 0 || warnings.length > 0;

  return (
    <div className="print-hide" style={{
      marginBottom: 24,
      padding: 16,
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 8
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: hasProblems && expanded ? 16 : 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Score Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: getRatingColor(rating),
            color: 'white',
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'system-ui'
          }}>
            {score}
          </div>

          {/* Rating Info */}
          <div>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1a1a1a',
              marginBottom: 4
            }}>
              Compliance Score: {getRatingLabel(rating)}
            </div>
            <div style={{
              fontSize: 13,
              color: '#666'
            }}>
              {issues.length > 0 && `${issues.length} critical issue${issues.length !== 1 ? 's' : ''}`}
              {issues.length > 0 && warnings.length > 0 && ' · '}
              {warnings.length > 0 && `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`}
              {issues.length === 0 && warnings.length === 0 && 'No issues found'}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{
          display: 'flex',
          gap: 16,
          fontSize: 12,
          color: '#666'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#333' }}>
              {summary.total_sections}
            </div>
            <div>Sections</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#333' }}>
              {summary.activities_count}
            </div>
            <div>Activities</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#333' }}>
              {summary.core_evidence_count}
            </div>
            <div>Evidence</div>
          </div>
        </div>

        {/* Toggle button */}
        {hasProblems && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'white',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'system-ui'
            }}
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {/* Details (expandable) */}
      {hasProblems && expanded && (
        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid #e2e8f0'
        }}>
          {/* Critical Issues */}
          {issues.length > 0 && (
            <div style={{ marginBottom: warnings.length > 0 ? 16 : 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#ef4444',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                Critical Issues ({issues.length})
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: 20,
                fontSize: 13,
                lineHeight: 1.6,
                color: '#333'
              }}>
                {issues.map((issue, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {issue.message}
                    {issue.section_key && (
                      <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>
                        ({issue.section_key})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#f59e0b',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                Warnings ({warnings.length})
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: 20,
                fontSize: 13,
                lineHeight: 1.6,
                color: '#333'
              }}>
                {warnings.map((warning, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {warning.message}
                    {warning.activity_id && (
                      <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>
                        (activity: {warning.activity_id.substring(0, 8)})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {suggestions && suggestions.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#3b82f6',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{ fontSize: 16 }}>💡</span>
                Suggestions ({suggestions.length})
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: 20,
                fontSize: 13,
                lineHeight: 1.6,
                color: '#666'
              }}>
                {suggestions.map((suggestion, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {suggestion.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
