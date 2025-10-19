'use client';

import { useState } from 'react';

export default function ActivityNarrative({ activityId, generatedAt, projectToken }) {
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  // Format relative time
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/narratives/${activityId}/refresh?force=true`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.queued) {
        // Reload page after short delay to show updated narrative
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (data.blocked) {
        alert(`Cannot refresh: ${data.blocked}. ${data.hours_remaining ? `Try again in ${data.hours_remaining}h` : ''}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to refresh narrative:', error);
      alert('Failed to refresh. Please try again.');
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="print-hide" style={{
      fontSize: 11,
      color: '#999',
      fontFamily: 'system-ui',
      marginTop: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}>
      <span>Auto-generated · {getRelativeTime(generatedAt)}</span>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: 'none',
          border: 'none',
          color: '#666',
          textDecoration: 'underline',
          cursor: 'pointer',
          padding: 0,
          fontSize: 11
        }}
      >
        Hide
      </button>
      <button
        onClick={handleRefresh}
        disabled={loading}
        style={{
          background: 'none',
          border: 'none',
          color: loading ? '#ccc' : '#666',
          textDecoration: 'underline',
          cursor: loading ? 'not-allowed' : 'pointer',
          padding: 0,
          fontSize: 11
        }}
      >
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}
