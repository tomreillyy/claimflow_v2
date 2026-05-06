'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const NAVY = '#021048';

/* ── Create activity modal ── */
export function CreateActivityModal({ token, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [uncertainty, setUncertainty] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !uncertainty.trim()) return;
    setSaving(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${token}/core-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: name.trim(), uncertainty: uncertainty.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      onCreated(await res.json());
      onClose();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 12, width: 460, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>New activity</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Activity name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Isolation Forest Thresholding" maxLength={60} autoFocus
            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = NAVY} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>{name.length}/60</div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, marginTop: 12 }}>Technical uncertainty</label>
          <textarea value={uncertainty} onChange={e => setUncertainty(e.target.value)} placeholder="What technical unknown are you investigating?" maxLength={800} rows={3}
            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
            onFocus={e => e.target.style.borderColor = NAVY} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>{uncertainty.length}/800</div>
          {error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#6b7280', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving || !name.trim() || !uncertainty.trim()} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'white', backgroundColor: saving || !name.trim() || !uncertainty.trim() ? '#a5b4fc' : NAVY, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Creating...' : 'Create activity'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Upload File Modal ── */
export function UploadFileModal({ token, onCreated, onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) { setError('File must be under 10MB'); return; }
    if (!ALLOWED_TYPES.includes(f.type)) { setError('Unsupported file type'); return; }
    setFile(f);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) { setError('File must be under 10MB'); return; }
    if (!ALLOWED_TYPES.includes(f.type)) { setError('Unsupported file type'); return; }
    setFile(f);
    setError('');
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/evidence/${token}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Upload failed'); }
      onCreated();
      onClose();
    } catch (err) { setError(err.message); }
    setUploading(false);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 12, width: 440, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Upload file</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{(file.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => setFile(null)} style={{ border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ) : (
            <label
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '32px 16px', border: '2px dashed #d1d5db', borderRadius: 8,
                cursor: 'pointer', color: '#9ca3af', fontSize: 13, textAlign: 'center',
              }}
            >
              <input type="file" onChange={handleFileChange} style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.csv,.txt,.xls,.xlsx" />
              <span style={{ fontSize: 24 }}>📎</span>
              Drop a file or click to upload
            </label>
          )}
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>PNG, JPEG, PDF, CSV, TXT, XLS — max 10MB</div>
          {error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#6b7280', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={uploading || !file} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'white', backgroundColor: uploading || !file ? '#a5b4fc' : NAVY, border: 'none', borderRadius: 8, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Evidence Modal ── */
export function AddEvidenceModal({ token, activities = [], onCreated, onClose }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [linkedActivityId, setLinkedActivityId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!content.trim() && !file) return;
    setSaving(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session.access_token}` };

      if (file) {
        // File upload
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`/api/evidence/${token}/upload`, { method: 'POST', headers, body: formData });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Upload failed'); }
      }

      let createdEvidenceId = null;

      if (content.trim()) {
        // Text note
        const res = await fetch(`/api/evidence/${token}/add`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to add'); }
        const data = await res.json();
        createdEvidenceId = data.id;
        // Trigger AI classification (fire-and-forget)
        fetch(`/api/classify?id=${data.id}`, { method: 'POST', headers }).catch(() => {});
        fetch(`/api/evidence/classify-activity-type?id=${data.id}`, { method: 'POST', headers }).catch(() => {});
      }

      // Link to activity if one was selected
      if (linkedActivityId && createdEvidenceId) {
        await fetch(`/api/evidence/${token}/link`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidence_id: createdEvidenceId, activity_id: linkedActivityId }),
        });
      }

      onCreated();
      onClose();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) { setError('File must be under 10MB'); return; }
    if (!ALLOWED_TYPES.includes(f.type)) { setError('Unsupported file type'); return; }
    setFile(f);
    setError('');
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: 12, width: 480, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Add evidence</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Note</label>
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            placeholder="What did you work on? Describe your experiment, observation, or finding..."
            rows={4} autoFocus
            style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
            onFocus={e => e.target.style.borderColor = NAVY} onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Attach file <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
            </label>
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{(file.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => setFile(null)} style={{ border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ) : (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '16px', border: '1px dashed #d1d5db', borderRadius: 8,
                cursor: 'pointer', color: '#9ca3af', fontSize: 13,
              }}>
                <input type="file" onChange={handleFileChange} style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.csv,.txt,.xls,.xlsx" />
                Drop a file or click to upload
              </label>
            )}
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>PNG, JPEG, PDF, CSV, TXT, XLS — max 10MB</div>
          </div>

          {activities.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Link to activity <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
              </label>
              <select
                value={linkedActivityId}
                onChange={e => setLinkedActivityId(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #e5e7eb',
                  borderRadius: 8, outline: 'none', fontFamily: 'inherit', backgroundColor: 'white',
                  color: linkedActivityId ? '#111827' : '#9ca3af', cursor: 'pointer', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = NAVY}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="">None — AI will suggest</option>
                {activities.map(act => (
                  <option key={act.id} value={act.id}>{act.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{error}</div>}

          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 12, padding: '8px 10px', backgroundColor: '#f9fafb', borderRadius: 6 }}>
            {linkedActivityId
              ? 'Evidence will be linked to the selected activity.'
              : 'AI will automatically classify this evidence into the R&D systematic progression and suggest which activity it belongs to.'}
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#6b7280', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || (!content.trim() && !file)} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'white', backgroundColor: saving || (!content.trim() && !file) ? '#a5b4fc' : NAVY, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Adding...' : 'Add evidence'}
          </button>
        </div>
      </div>
    </div>
  );
}
