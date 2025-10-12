'use client';
import { useState, useRef } from 'react';

export default function PayrollDropzone({ projectToken, onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

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
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file) => {
    setError(null);

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isXLS = file.name.toLowerCase().endsWith('.xls');
    const isXLSX = file.name.toLowerCase().endsWith('.xlsx');

    if (!isCSV && !isXLS && !isXLSX) {
      setError('Please upload a CSV or XLSX file');
      return;
    }

    // Upload file
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/projects/${projectToken}/payroll/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: dragging ? '2px dashed #007acc' : '2px dashed #ddd',
          borderRadius: 4,
          padding: 40,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragging ? '#f0f9ff' : 'white',
          transition: 'all 0.2s ease'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div>
            <div style={{ fontSize: 16, color: '#1a1a1a', marginBottom: 8, fontWeight: 600 }}>
              Uploading and analyzing...
            </div>
            <div style={{ fontSize: 13, color: '#1a1a1a' }}>
              This may take a moment for large files
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
              Drop payroll file here or click to browse
            </div>
            <div style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 4 }}>
              Accepts CSV, XLS, or XLSX files
            </div>
            <div style={{ fontSize: 13, color: '#1a1a1a' }}>
              Upload a payroll report (CSV/XLSX) from your payroll or accounting system.
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 3,
          fontSize: 13,
          color: '#dc2626'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 13, color: '#1a1a1a' }}>
        <a
          href="/sample-payroll-upc.csv"
          download
          style={{ color: '#007acc', textDecoration: 'underline' }}
        >
          Download sample payroll file (UPC)
        </a>
      </div>
    </div>
  );
}
