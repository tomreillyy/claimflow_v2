'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/Spinner';
import { MapPin, Award, Users, Globe, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export function ConsultantProfile({ profileId }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [existingInquiry, setExistingInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inquiry form
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryError, setInquiryError] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user, profileId]);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/marketplace/consultants/${profileId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Profile not found');
        } else {
          setError('Failed to load profile');
        }
        return;
      }

      const data = await response.json();
      setProfile(data.profile);
      setExistingInquiry(data.existing_inquiry);
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInquiry = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setInquiryError('Please enter a message');
      return;
    }

    setSending(true);
    setInquiryError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/marketplace/inquiries', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultant_profile_id: profileId,
          message: message.trim(),
          client_name: clientName.trim() || null,
          company_name: companyName.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send inquiry');
      }

      setInquirySent(true);
      setShowInquiryForm(false);
    } catch (err) {
      setInquiryError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{error}</h2>
        <Link href="/marketplace" style={{ color: '#021048', fontSize: 14 }}>Back to marketplace</Link>
      </main>
    );
  }

  if (!profile) return null;

  const isOwnProfile = profile.user_id === user?.id;
  const hasInquired = !!existingInquiry || inquirySent;

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>
      {/* Back link */}
      <Link
        href="/marketplace"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#6b7280',
          textDecoration: 'none',
          fontSize: 14,
          marginBottom: 32,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#021048'}
        onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
      >
        <ArrowLeft size={16} />
        Back to marketplace
      </Link>

      {/* Profile header */}
      <div style={{
        display: 'flex',
        gap: 20,
        marginBottom: 32,
        alignItems: 'flex-start',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 32, fontWeight: 600, color: '#9ca3af' }}>
              {profile.display_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>
            {profile.display_name}
          </h1>
          {profile.headline && (
            <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 12px' }}>{profile.headline}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: '#6b7280' }}>
            {(profile.location_city || profile.location_state) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} />
                {[profile.location_city, profile.location_state].filter(Boolean).join(', ')}
              </span>
            )}
            {profile.years_experience && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Award size={14} />
                {profile.years_experience} years experience
              </span>
            )}
            {profile.client_count > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={14} />
                Working with {profile.client_count} client{profile.client_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Specializations */}
      {profile.specializations?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 10px' }}>
            Specializations
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {profile.specializations.map(s => (
              <span key={s} style={{
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 500,
                backgroundColor: '#f0f4ff',
                color: '#021048',
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 10px' }}>
            About
          </h3>
          <p style={{
            fontSize: 14,
            color: '#4b5563',
            lineHeight: 1.7,
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}>
            {profile.bio}
          </p>
        </div>
      )}

      {/* Website */}
      {profile.website_url && (
        <div style={{ marginBottom: 32 }}>
          <a
            href={profile.website_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#021048',
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            <Globe size={16} />
            {profile.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        </div>
      )}

      {/* Inquiry section */}
      {!isOwnProfile && (
        <div style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: 28,
        }}>
          {hasInquired ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 16,
              backgroundColor: '#ecfdf5',
              borderRadius: 12,
              border: '1px solid #a7f3d0',
            }}>
              <CheckCircle size={20} color="#059669" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>
                  Inquiry sent
                </div>
                <div style={{ fontSize: 13, color: '#047857' }}>
                  {profile.display_name} will get in touch with you.
                </div>
              </div>
            </div>
          ) : showInquiryForm ? (
            <form onSubmit={handleSendInquiry}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>
                Send an inquiry to {profile.display_name}
              </h3>

              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                    Your name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Smith"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: 14,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#021048'}
                    onBlur={e => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                    Company
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: 14,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#021048'}
                    onBlur={e => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                  Message <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell the advisor about your R&D activities and what you need help with..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: 14,
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = '#021048'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {inquiryError && (
                <div style={{
                  padding: 10,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#dc2626',
                  marginBottom: 14,
                }}>
                  {inquiryError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'white',
                    backgroundColor: sending ? '#9ca3af' : '#021048',
                    border: 'none',
                    borderRadius: 8,
                    cursor: sending ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Send size={14} />
                  {sending ? 'Sending...' : 'Send inquiry'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInquiryForm(false)}
                  style={{
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowInquiryForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 600,
                color: 'white',
                backgroundColor: '#021048',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={e => e.target.style.backgroundColor = '#010a2e'}
              onMouseOut={e => e.target.style.backgroundColor = '#021048'}
            >
              <Send size={16} />
              Send inquiry
            </button>
          )}
        </div>
      )}
    </main>
  );
}
