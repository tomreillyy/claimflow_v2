'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from './Spinner';

export default function JiraProjectPicker({ token, onConnect, onCancel }) {
  const [jiraProjects, setJiraProjects] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [jqlFilter, setJqlFilter] = useState('');
  const [filterKeywords, setFilterKeywords] = useState('');
  const [filterIssueTypes, setFilterIssueTypes] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const issueTypes = ['Story', 'Task', 'Bug', 'Epic', 'Sub-task'];

  useEffect(() => {
    fetchJiraProjects();
  }, []);

  async function fetchJiraProjects() {
    setLoading(true);
    setError('');
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/jira/projects`, {
        headers: s?.access_token ? { Authorization: `Bearer ${s.access_token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Jira projects');
      setJiraProjects(data.projects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleKey(key) {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  function toggleIssueType(type) {
    setFilterIssueTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  async function handleConnect() {
    if (selectedKeys.length === 0 && !jqlFilter.trim()) {
      setError('Select at least one Jira project or enter a JQL filter');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/jira/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(s?.access_token ? { Authorization: `Bearer ${s.access_token}` } : {})
        },
        body: JSON.stringify({
          jira_project_keys: selectedKeys,
          jql_filter: jqlFilter.trim() || null,
          filter_keywords: filterKeywords.split(',').map(k => k.trim()).filter(Boolean),
          filter_issue_types: filterIssueTypes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');
      onConnect(data.connection);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: 20,
      backgroundColor: '#f9fafb',
      marginBottom: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#021048' }}>
          Connect Jira Projects
        </h3>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: '#666'
          }}
        >
          &times;
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          padding: '8px 12px',
          borderRadius: 6,
          fontSize: 13,
          marginBottom: 12
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spinner size={24} />
          <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>Loading Jira projects...</p>
        </div>
      ) : (
        <>
          {/* Project selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
              Select Jira Projects
            </label>
            <div style={{
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              backgroundColor: '#fff'
            }}>
              {jiraProjects.length === 0 ? (
                <div style={{ padding: 12, fontSize: 13, color: '#666', textAlign: 'center' }}>
                  No Jira projects found
                </div>
              ) : (
                jiraProjects.map(proj => (
                  <label
                    key={proj.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: selectedKeys.includes(proj.key) ? '#eff6ff' : 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.includes(proj.key)}
                      onChange={() => toggleKey(proj.key)}
                      style={{ accentColor: '#021048' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#021048', minWidth: 60 }}>
                      {proj.key}
                    </span>
                    <span style={{ fontSize: 13, color: '#374151' }}>
                      {proj.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
                      {proj.projectTypeKey}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Issue type filter */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
              Issue Types (leave empty for all)
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {issueTypes.map(type => (
                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filterIssueTypes.includes(type)}
                    onChange={() => toggleIssueType(type)}
                    style={{ accentColor: '#021048' }}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          {/* Advanced options */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: '#6b7280',
              padding: 0,
              marginBottom: showAdvanced ? 12 : 0
            }}
          >
            {showAdvanced ? '▾ Hide advanced' : '▸ Advanced options'}
          </button>

          {showAdvanced && (
            <div style={{ marginBottom: 16 }}>
              {/* Keyword filter */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Keyword Filter (comma-separated)
                </label>
                <input
                  type="text"
                  value={filterKeywords}
                  onChange={(e) => setFilterKeywords(e.target.value)}
                  placeholder="e.g. performance, optimize, experiment"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                  Only sync issues containing these keywords. Leave empty to use R&D auto-detection.
                </p>
              </div>

              {/* JQL filter */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Custom JQL (overrides project selection)
                </label>
                <textarea
                  value={jqlFilter}
                  onChange={(e) => setJqlFilter(e.target.value)}
                  placeholder='e.g. project = PROJ AND labels = "r&d" AND updated >= -90d'
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'monospace',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                backgroundColor: '#fff',
                fontSize: 13,
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={saving}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#021048',
                color: '#fff',
                fontSize: 13,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {saving ? <><Spinner size={14} color="#fff" /> Connecting...</> : 'Connect'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
