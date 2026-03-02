'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(dateStr, dayOffset) {
  const d = addDays(dateStr, dayOffset);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function shiftWeek(weekStart, direction) {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + direction * 7);
  return d.toISOString().split('T')[0];
}

export default function TimesheetsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timesheetLoading, setTimesheetLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Fetch projects and team members
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const headers = { 'Authorization': `Bearer ${session.access_token}` };

        const [projRes, teamRes] = await Promise.all([
          fetch('/api/projects', { headers }),
          fetch('/api/team', { headers }),
        ]);

        if (projRes.ok) {
          const data = await projRes.json();
          setProjects(data.projects || []);
          if (data.projects?.length > 0 && !selectedToken) {
            setSelectedToken(data.projects[0].project_token);
          }
        }

        if (teamRes.ok) {
          const data = await teamRes.json();
          setMembers(data.members || []);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Fetch timesheets when project or week changes
  const fetchTimesheets = useCallback(async () => {
    if (!selectedToken || !weekStart) return;

    setTimesheetLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `/api/timesheets?project_token=${selectedToken}&week_start=${weekStart}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        // Convert entries array to map keyed by person_email
        const map = {};
        for (const entry of (data.entries || [])) {
          map[entry.person_email] = {
            mon: Number(entry.mon) || 0,
            tue: Number(entry.tue) || 0,
            wed: Number(entry.wed) || 0,
            thu: Number(entry.thu) || 0,
            fri: Number(entry.fri) || 0,
            sat: Number(entry.sat) || 0,
            sun: Number(entry.sun) || 0,
            note: entry.note || '',
          };
        }
        setEntries(map);
      }
    } catch (err) {
      console.error('Failed to fetch timesheets:', err);
    } finally {
      setTimesheetLoading(false);
    }
  }, [selectedToken, weekStart]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  const updateEntry = (email, day, value) => {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num) || num < 0 || num > 24) return;

    setEntries(prev => ({
      ...prev,
      [email]: {
        ...prev[email] || { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, note: '' },
        [day]: num,
      }
    }));
  };

  const getTotal = (email) => {
    const e = entries[email];
    if (!e) return 0;
    return DAYS.reduce((sum, d) => sum + (Number(e[d]) || 0), 0);
  };

  const getColumnTotal = (day) => {
    return Object.values(entries).reduce((sum, e) => sum + (Number(e[day]) || 0), 0);
  };

  const getGrandTotal = () => {
    return Object.keys(entries).reduce((sum, email) => sum + getTotal(email), 0);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Build entries array from current state
      const entryList = Object.entries(entries)
        .filter(([, data]) => DAYS.some(d => Number(data[d]) > 0))
        .map(([email, data]) => ({
          person_email: email,
          week_start: weekStart,
          mon: data.mon || 0,
          tue: data.tue || 0,
          wed: data.wed || 0,
          thu: data.thu || 0,
          fri: data.fri || 0,
          sat: data.sat || 0,
          sun: data.sun || 0,
          note: data.note || null,
        }));

      if (entryList.length === 0) {
        setMessage('No hours to save.');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_token: selectedToken,
          entries: entryList,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setMessage(`Saved ${data.saved} timesheet entries.`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Which members to show rows for
  const visibleMembers = members.length > 0 ? members : [];
  // Also include any emails from entries that aren't in the members list
  const memberEmails = new Set(visibleMembers.map(m => m.email));
  const extraEmails = Object.keys(entries).filter(e => !memberEmails.has(e));

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${addDays(weekStart, 0).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const cellStyle = {
    padding: '6px 4px',
    textAlign: 'center',
    borderBottom: '1px solid #f0f0f0',
  };

  const inputStyle = {
    width: 52,
    padding: '6px 4px',
    fontSize: 14,
    textAlign: 'center',
    border: '1px solid #e5e5e5',
    borderRadius: 3,
    outline: 'none',
    color: '#1a1a1a',
    backgroundColor: '#fff',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    }}>
      <Header />

      {(authLoading || loading) ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spinner />
        </div>
      ) : (
      <main style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '60px 24px'
      }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>Timesheets</h1>
          <p style={{
            fontSize: 14,
            color: '#666',
            margin: 0
          }}>
            Enter weekly hours for your team members per project.
          </p>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap'
        }}>
          {/* Project selector */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 4 }}>
              Project
            </label>
            <select
              value={selectedToken}
              onChange={e => setSelectedToken(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: 14,
                border: '1px solid #ddd',
                borderRadius: 4,
                outline: 'none',
                color: '#1a1a1a',
                backgroundColor: 'white',
                minWidth: 200,
              }}
            >
              {projects.length === 0 && <option value="">No projects</option>}
              {projects.map(p => (
                <option key={p.project_token} value={p.project_token}>
                  {p.name} ({p.year_end && p.year_end !== p.year ? `${p.year}–${p.year_end}` : p.year})
                </option>
              ))}
            </select>
          </div>

          {/* Week selector */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 4 }}>
              Week
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
                style={{
                  padding: '8px 12px',
                  fontSize: 16,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  color: '#333',
                  lineHeight: 1,
                }}
              >
                ‹
              </button>
              <span style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#1a1a1a',
                minWidth: 180,
                textAlign: 'center'
              }}>
                {weekLabel}
              </span>
              <button
                onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
                style={{
                  padding: '8px 12px',
                  fontSize: 16,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  color: '#333',
                  lineHeight: 1,
                }}
              >
                ›
              </button>
              <button
                onClick={() => setWeekStart(getMonday(new Date()))}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* No projects */}
        {projects.length === 0 && (
          <div style={{
            padding: 40,
            textAlign: 'center',
            border: '1px solid #e5e5e5',
            borderRadius: 4,
            color: '#999',
            fontSize: 14,
          }}>
            No projects found. Create a project first to start entering timesheets.
          </div>
        )}

        {/* No team members */}
        {projects.length > 0 && visibleMembers.length === 0 && extraEmails.length === 0 && (
          <div style={{
            padding: 40,
            textAlign: 'center',
            border: '1px solid #e5e5e5',
            borderRadius: 4,
            color: '#999',
            fontSize: 14,
          }}>
            No team members yet. Add team members on the{' '}
            <a href="/settings/team" style={{ color: '#021048' }}>Team page</a>{' '}
            to start entering timesheets.
          </div>
        )}

        {/* Timesheet grid */}
        {projects.length > 0 && (visibleMembers.length > 0 || extraEmails.length > 0) && (
          <>
            {timesheetLoading && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spinner />
              </div>
            )}

            {!timesheetLoading && (
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: 4,
                overflow: 'auto',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#333', minWidth: 160 }}>
                        Team Member
                      </th>
                      {DAYS.map((day, i) => (
                        <th key={day} style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 600, color: '#333', minWidth: 60 }}>
                          <div>{DAY_LABELS[i]}</div>
                          <div style={{ fontSize: 11, fontWeight: 400, color: '#999' }}>{formatDate(weekStart, i)}</div>
                        </th>
                      ))}
                      <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#333', minWidth: 60 }}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMembers.map(member => {
                      const total = getTotal(member.email);
                      return (
                        <tr key={member.email}>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ fontWeight: 500, color: '#1a1a1a' }}>{member.full_name}</div>
                            {member.role && (
                              <div style={{ fontSize: 12, color: '#999' }}>{member.role}</div>
                            )}
                          </td>
                          {DAYS.map(day => (
                            <td key={day} style={cellStyle}>
                              <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={entries[member.email]?.[day] || ''}
                                onChange={e => updateEntry(member.email, day, e.target.value)}
                                onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                                onBlur={e => { if (e.target.value === '') updateEntry(member.email, day, '0'); }}
                                style={inputStyle}
                              />
                            </td>
                          ))}
                          <td style={{
                            ...cellStyle,
                            fontWeight: 600,
                            color: total > 0 ? '#1a1a1a' : '#ccc',
                            fontSize: 14,
                          }}>
                            {total > 0 ? total : '-'}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Extra entries not in team roster */}
                    {extraEmails.map(email => {
                      const total = getTotal(email);
                      return (
                        <tr key={email}>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ fontWeight: 500, color: '#1a1a1a' }}>{email}</div>
                          </td>
                          {DAYS.map(day => (
                            <td key={day} style={cellStyle}>
                              <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={entries[email]?.[day] || ''}
                                onChange={e => updateEntry(email, day, e.target.value)}
                                onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                                onBlur={e => { if (e.target.value === '') updateEntry(email, day, '0'); }}
                                style={inputStyle}
                              />
                            </td>
                          ))}
                          <td style={{
                            ...cellStyle,
                            fontWeight: 600,
                            color: total > 0 ? '#1a1a1a' : '#ccc',
                          }}>
                            {total > 0 ? total : '-'}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Totals row */}
                    <tr style={{ backgroundColor: '#fafafa', borderTop: '2px solid #e5e5e5' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#333' }}>Total</td>
                      {DAYS.map(day => {
                        const colTotal = getColumnTotal(day);
                        return (
                          <td key={day} style={{
                            padding: '10px 4px',
                            textAlign: 'center',
                            fontWeight: 600,
                            color: colTotal > 0 ? '#1a1a1a' : '#ccc',
                          }}>
                            {colTotal > 0 ? colTotal : '-'}
                          </td>
                        );
                      })}
                      <td style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#021048',
                        fontSize: 15,
                      }}>
                        {getGrandTotal() > 0 ? getGrandTotal() : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Save button and message */}
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleSave}
                disabled={saving || timesheetLoading}
                style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: saving ? '#ccc' : '#021048',
                  border: 'none',
                  borderRadius: 4,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save timesheets'}
              </button>
              {message && (
                <span style={{
                  fontSize: 13,
                  color: message.startsWith('Error') ? '#dc2626' : '#059669',
                }}>
                  {message}
                </span>
              )}
            </div>
          </>
        )}
      </main>
      )}
    </div>
  );
}
