'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

const FILE_TYPE_ICONS = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'image/png': 'IMG',
  'image/jpeg': 'IMG',
  'image/gif': 'IMG',
  'image/webp': 'IMG'
};

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const styles = {
    completed: { bg: '#f0fdf4', color: '#15803d', label: 'Searchable' },
    skipped: { bg: '#f5f5f5', color: '#737373', label: 'No text' },
    failed: { bg: '#fef2f2', color: '#dc2626', label: 'Extraction failed' },
    pending: { bg: '#fffbeb', color: '#d97706', label: 'Processing...' }
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 10,
      backgroundColor: s.bg,
      color: s.color,
      fontWeight: 500,
      whiteSpace: 'nowrap'
    }}>
      {s.label}
    </span>
  );
}

export default function KnowledgeBase({ projectToken, projectId }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [signedUrls, setSignedUrls] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Fetch documents on mount
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectToken}/knowledge`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, [projectToken]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/projects/${projectToken}/knowledge/search?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, projectToken]);

  // Get signed URL for download
  const handleDownload = async (docId) => {
    if (signedUrls[docId]) {
      window.open(signedUrls[docId], '_blank');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectToken}/knowledge/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_ids: [docId] })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.signedUrls && data.signedUrls[docId]) {
          setSignedUrls(prev => ({ ...prev, [docId]: data.signedUrls[docId] }));
          window.open(data.signedUrls[docId], '_blank');
        }
      }
    } catch (err) {
      console.error('Failed to get download URL:', err);
    }
  };

  // Delete document
  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return;
    setDeletingId(docId);

    try {
      const res = await fetch(`/api/projects/${projectToken}/knowledge/${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleFiles = async (files) => {
    setUploadError(null);
    setUploading(true);

    try {
      // Get auth header so the server can attribute the upload to the user
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`/api/projects/${projectToken}/knowledge/upload`, {
          method: 'POST',
          headers: authHeaders,
          body: formData
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        // Add to list immediately
        setDocuments(prev => [data.document, ...prev]);
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Render document row
  const renderDocRow = (doc) => {
    const typeLabel = FILE_TYPE_ICONS[doc.file_type] || 'FILE';
    const isDeleting = deletingId === doc.id;

    return (
      <div
        key={doc.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          opacity: isDeleting ? 0.5 : 1,
          transition: 'opacity 0.15s'
        }}
      >
        {/* File type badge */}
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: 4,
          backgroundColor: '#f0f4ff',
          color: '#021048',
          minWidth: 40,
          textAlign: 'center',
          flexShrink: 0
        }}>
          {typeLabel}
        </span>

        {/* File info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#1a1a1a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {doc.file_name}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {formatFileSize(doc.file_size)} &middot; {formatDate(doc.created_at)}
          </div>
        </div>

        {/* Status badge */}
        <StatusBadge status={doc.extraction_status} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => handleDownload(doc.id)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: '#021048',
              backgroundColor: 'transparent',
              border: '1px solid #ddd',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.target.style.borderColor = '#021048'; }}
            onMouseLeave={e => { e.target.style.borderColor = '#ddd'; }}
          >
            Download
          </button>
          <button
            onClick={() => handleDelete(doc.id)}
            disabled={isDeleting}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: '#dc2626',
              backgroundColor: 'transparent',
              border: '1px solid #fecaca',
              borderRadius: 4,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { if (!isDeleting) e.target.style.backgroundColor = '#fef2f2'; }}
            onMouseLeave={e => { e.target.style.backgroundColor = 'transparent'; }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  // Render search result row
  const renderSearchResult = (result) => {
    const typeLabel = FILE_TYPE_ICONS[result.file_type] || 'FILE';

    return (
      <div
        key={result.id}
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #f0f0f0',
          cursor: 'pointer',
          transition: 'background-color 0.15s'
        }}
        onClick={() => handleDownload(result.id)}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 3,
            backgroundColor: '#f0f4ff',
            color: '#021048'
          }}>
            {typeLabel}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
            {result.file_name}
          </span>
          <span style={{ fontSize: 12, color: '#999' }}>
            {formatFileSize(result.file_size)}
          </span>
        </div>
        {result.headline && (
          <div
            style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: result.headline }}
          />
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Search bar */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px 10px 38px',
            fontSize: 14,
            border: '1px solid #ddd',
            borderRadius: 6,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s'
          }}
          onFocus={e => { e.target.style.borderColor = '#021048'; }}
          onBlur={e => { e.target.style.borderColor = '#ddd'; }}
        />
        {/* Search icon */}
        <svg
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: '#999',
              padding: '0 4px',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        )}
      </div>

      {/* Dropzone */}
      <div style={{ marginBottom: 24 }}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: dragging ? '2px dashed #021048' : '2px dashed #ddd',
            borderRadius: 4,
            padding: 32,
            textAlign: 'center',
            cursor: uploading ? 'default' : 'pointer',
            backgroundColor: dragging ? '#f0f9ff' : 'white',
            transition: 'all 0.2s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp"
            onChange={handleFileSelect}
            multiple
            style={{ display: 'none' }}
          />

          {uploading ? (
            <div>
              <div style={{ fontSize: 16, color: '#1a1a1a', marginBottom: 8, fontWeight: 600 }}>
                Uploading and extracting text...
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                This may take a moment for large files
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
                Drop documents here or click to browse
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                PDF, DOCX, TXT, CSV, and images up to 25MB
              </div>
            </div>
          )}
        </div>

        {uploadError && (
          <div style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 3,
            fontSize: 13,
            color: '#dc2626'
          }}>
            <strong>Error:</strong> {uploadError}
          </div>
        )}
      </div>

      {/* Document list or search results */}
      <div style={{
        border: '1px solid #e5e5e5',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: 'white'
      }}>
        {/* Header */}
        <div style={{
          padding: '10px 16px',
          backgroundColor: '#fafafa',
          borderBottom: '1px solid #e5e5e5',
          fontSize: 13,
          fontWeight: 600,
          color: '#555'
        }}>
          {searchQuery.trim()
            ? (searching ? 'Searching...' : `${searchResults?.length || 0} result${searchResults?.length === 1 ? '' : 's'}`)
            : `${documents.length} document${documents.length === 1 ? '' : 's'}`
          }
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>
            Loading documents...
          </div>
        ) : searchQuery.trim() ? (
          // Search results
          searchResults && searchResults.length > 0 ? (
            searchResults.map(renderSearchResult)
          ) : (
            !searching && (
              <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>
                No documents match your search
              </div>
            )
          )
        ) : (
          // Full document list
          documents.length > 0 ? (
            documents.map(renderDocRow)
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>
              No documents uploaded yet. Drop files above to get started.
            </div>
          )
        )}
      </div>
    </div>
  );
}
