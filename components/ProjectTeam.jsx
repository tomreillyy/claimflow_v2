'use client';
import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

const SOURCE_LABELS = {
  team: { label: 'Team', color: '#021048', bg: '#e8eaf6' },
  payroll: { label: 'Payroll', color: '#1b5e20', bg: '#e8f5e9' },
  evidence: { label: 'Evidence', color: '#e65100', bg: '#fff3e0' },
};

export default function ProjectTeam({ projectToken }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectToken) return;
    setLoading(true);
    fetch(`/api/projects/${projectToken}/people`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setPeople(data.people || []);
      })
      .catch(err => {
        console.error('Failed to fetch project people:', err);
        setError('Failed to load team members');
      })
      .finally(() => setLoading(false));
  }, [projectToken]);

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#666' }}>
        Loading team members...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#d32f2f' }}>
        {error}
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div style={{
        padding: '60px 24px',
        textAlign: 'center',
        color: '#666',
      }}>
        <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 8px' }}>No team members yet</p>
        <p style={{ fontSize: 14, margin: 0 }}>
          Team members will appear here as they are added to your team roster, payroll, or evidence.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{
        fontSize: 18,
        fontWeight: 600,
        color: '#1a1a1a',
        margin: '0 0 16px',
      }}>
        Project Team ({people.length})
      </h2>

      <div style={{
        border: '1px solid #e5e5e5',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{
                textAlign: 'left',
                padding: '10px 16px',
                fontWeight: 600,
                color: '#374151',
                borderBottom: '1px solid #e5e5e5',
              }}>Name</th>
              <th style={{
                textAlign: 'left',
                padding: '10px 16px',
                fontWeight: 600,
                color: '#374151',
                borderBottom: '1px solid #e5e5e5',
              }}>Email</th>
              <th style={{
                textAlign: 'left',
                padding: '10px 16px',
                fontWeight: 600,
                color: '#374151',
                borderBottom: '1px solid #e5e5e5',
              }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person, i) => {
              const source = SOURCE_LABELS[person.source] || SOURCE_LABELS.evidence;
              return (
                <tr
                  key={person.email || i}
                  style={{
                    borderBottom: i < people.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}
                >
                  <td style={{ padding: '10px 16px', color: '#1a1a1a', fontWeight: 500 }}>
                    {person.name}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#666' }}>
                    {person.email}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: source.color,
                      backgroundColor: source.bg,
                    }}>
                      {source.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
