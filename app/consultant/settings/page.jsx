'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';
import { ConsultantBreadcrumb } from '@/components/ConsultantBreadcrumb';

export default function ConsultantSettingsPage() {
  const { user, loading: authLoading, isConsultant, consultantStatusLoaded } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (!authLoading && consultantStatusLoaded && user && !isConsultant) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isConsultant, consultantStatusLoaded, router]);

  useEffect(() => {
    if (!user) return;
    fetchBranding();
  }, [user]);

  const fetchBranding = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/consultant/settings', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanyName(data.company_name || '');
        setLogoUrl(data.logo_url || null);
      }
    } catch (err) {
      console.error('Failed to fetch branding:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setError('Please upload a PNG, JPEG, or SVG file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB.');
      return;
    }

    setError('');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const form = new FormData();
      form.append('company_name', companyName);
      if (logoFile) {
        form.append('logo', logoFile);
      }

      const response = await fetch('/api/consultant/settings', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save branding');
      }

      setLogoUrl(data.logo_url);
      setLogoFile(null);
      setLogoPreview(null);
      setMessage('Branding saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const displayLogo = logoPreview || logoUrl;

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
        maxWidth: 600,
        margin: '0 auto',
        padding: '60px 24px'
      }}>
        <ConsultantBreadcrumb items={[
          { label: 'Clients', href: '/consultant' },
          { label: 'Settings' },
        ]} />

        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>Branding</h1>
          <p style={{
            fontSize: 14,
            color: '#666',
            margin: 0
          }}>
            Customize your branding. Your logo and company name will appear for your clients.
          </p>
        </div>

        <form onSubmit={handleSave}>
          {/* Logo upload */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#333',
              marginBottom: 8
            }}>
              Logo
            </label>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              {/* Logo preview */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  border: '2px dashed #d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  backgroundColor: '#fafafa',
                  flexShrink: 0,
                }}
              >
                {displayLogo ? (
                  <img
                    src={displayLogo}
                    alt="Logo preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {displayLogo ? 'Change logo' : 'Upload logo'}
                </button>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>
                  PNG, JPEG, or SVG. Max 2MB.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoSelect}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Company name */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              color: '#333',
              marginBottom: 6
            }}>
              Company name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your consulting firm"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 14,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                outline: 'none',
                boxSizing: 'border-box',
                color: '#1a1a1a',
                backgroundColor: '#fff',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#021048';
                e.target.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.1)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Preview */}
          {(displayLogo || companyName) && (
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#333',
                marginBottom: 8
              }}>
                Preview
              </label>
              <div style={{
                padding: '12px 24px',
                backgroundColor: '#FAFAFA',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                height: 56,
              }}>
                {displayLogo ? (
                  <img
                    src={displayLogo}
                    alt="Logo"
                    style={{ height: 32, width: 'auto', objectFit: 'contain' }}
                  />
                ) : null}
                {companyName && (
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>
                    {companyName}
                  </span>
                )}
                <span style={{
                  fontSize: 11,
                  color: '#9ca3af',
                  marginLeft: 'auto',
                }}>
                  Powered by ClaimFlow
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>
                This is how your branding will appear in the header for your clients.
              </p>
            </div>
          )}

          {/* Share link */}
          {user && (
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#333',
                marginBottom: 6
              }}>
                Branded login link
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/auth/login?ref=${user.id}` : ''}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: 13,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: '#6b7280',
                    backgroundColor: '#f9fafb',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/auth/login?ref=${user.id}`);
                    setMessage('Link copied!');
                    setTimeout(() => setMessage(''), 2000);
                  }}
                  style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Copy
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>
                Share this link with clients so they see your branding on the login page.
              </p>
            </div>
          )}

          {error && (
            <div style={{
              padding: 12,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              fontSize: 14,
              color: '#dc2626',
              marginBottom: 16
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              padding: 12,
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 8,
              fontSize: 14,
              color: '#059669',
              marginBottom: 16
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              backgroundColor: saving ? '#9ca3af' : '#021048',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={e => { if (!saving) e.target.style.backgroundColor = '#010a2e'; }}
            onMouseOut={e => { if (!saving) e.target.style.backgroundColor = '#021048'; }}
          >
            {saving ? 'Saving...' : 'Save branding'}
          </button>
        </form>
      </main>
      )}
    </div>
  );
}
