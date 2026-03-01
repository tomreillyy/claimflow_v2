'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { ConsultantBreadcrumb } from '@/components/ConsultantBreadcrumb';
import { Spinner } from '@/components/Spinner';
import { MapPin, Globe, Award, Eye, EyeOff } from 'lucide-react';

const SPECIALIZATIONS = [
  'Software & IT',
  'Manufacturing',
  'Biotech & Pharma',
  'Agriculture',
  'Mining & Resources',
  'Professional Services',
  'Construction & Engineering',
  'Food & Beverage',
];

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

export function ConsultantProfileEditor() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [specializations, setSpecializations] = useState([]);
  const [yearsExperience, setYearsExperience] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isListed, setIsListed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/consultant/profile', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setDisplayName(data.profile.display_name || '');
          setHeadline(data.profile.headline || '');
          setBio(data.profile.bio || '');
          setSpecializations(data.profile.specializations || []);
          setYearsExperience(data.profile.years_experience?.toString() || '');
          setLocationState(data.profile.location_state || '');
          setLocationCity(data.profile.location_city || '');
          setWebsiteUrl(data.profile.website_url || '');
          setIsListed(data.profile.is_listed || false);
          setAvatarUrl(data.avatar_url || null);
        } else if (data.defaults) {
          setDisplayName(data.defaults.display_name || '');
          setAvatarUrl(data.defaults.avatar_url || null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setError('Please upload a PNG, JPEG, or SVG file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.');
      return;
    }

    setError('');
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const toggleSpecialization = (spec) => {
    setSpecializations(prev =>
      prev.includes(spec)
        ? prev.filter(s => s !== spec)
        : [...prev, spec]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const form = new FormData();
      form.append('display_name', displayName);
      form.append('headline', headline);
      form.append('bio', bio);
      form.append('specializations', JSON.stringify(specializations));
      form.append('years_experience', yearsExperience);
      form.append('location_state', locationState);
      form.append('location_city', locationCity);
      form.append('website_url', websiteUrl);
      form.append('is_listed', isListed.toString());
      if (avatarFile) {
        form.append('avatar', avatarFile);
      }

      const response = await fetch('/api/consultant/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      setAvatarUrl(data.avatar_url);
      setAvatarFile(null);
      setAvatarPreview(null);
      setMessage('Profile saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarPreview || avatarUrl;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '60px 24px' }}>
      <ConsultantBreadcrumb items={[
        { label: 'Clients', href: '/consultant' },
        { label: 'Marketplace Profile' },
      ]} />

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px 0' }}>
          Marketplace Profile
        </h1>
        <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
          Create your public profile so clients can find and contact you through the ClaimFlow marketplace.
        </p>
      </div>

      <form onSubmit={handleSave}>
        {/* Listed toggle */}
        <div style={{
          marginBottom: 28,
          padding: 16,
          borderRadius: 12,
          border: `2px solid ${isListed ? '#059669' : '#d1d5db'}`,
          backgroundColor: isListed ? '#ecfdf5' : '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isListed ? <Eye size={20} color="#059669" /> : <EyeOff size={20} color="#9ca3af" />}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: isListed ? '#059669' : '#374151' }}>
                {isListed ? 'Listed on marketplace' : 'Not listed'}
              </div>
              <div style={{ fontSize: 12, color: isListed ? '#047857' : '#9ca3af' }}>
                {isListed ? 'Clients can find your profile' : 'Your profile is hidden from the marketplace'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsListed(!isListed)}
            style={{
              width: 48,
              height: 26,
              borderRadius: 13,
              border: 'none',
              backgroundColor: isListed ? '#059669' : '#d1d5db',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background-color 0.2s ease',
            }}
          >
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: '#fff',
              position: 'absolute',
              top: 2,
              left: isListed ? 24 : 2,
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        {/* Avatar */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 8 }}>
            Profile photo
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
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
              {displayAvatar ? (
                <img src={displayAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                {displayAvatar ? 'Change photo' : 'Upload photo'}
              </button>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>
                PNG, JPEG, or SVG. Max 2MB.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleAvatarSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Display Name */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 6 }}>
            Display name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name or company name"
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
            onFocus={e => { e.target.style.borderColor = '#021048'; e.target.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 6 }}>
            Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Helping SaaS companies maximize R&D claims"
            maxLength={120}
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
            onFocus={e => { e.target.style.borderColor = '#021048'; e.target.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Bio */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 6 }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell clients about your experience, approach, and what makes you a great R&D advisor..."
            maxLength={2000}
            rows={5}
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
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            onFocus={e => { e.target.style.borderColor = '#021048'; e.target.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          />
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0', textAlign: 'right' }}>
            {bio.length}/2000
          </p>
        </div>

        {/* Specializations */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 8 }}>
            Specializations
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SPECIALIZATIONS.map(spec => {
              const selected = specializations.includes(spec);
              return (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpecialization(spec)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 500,
                    border: selected ? '1.5px solid #021048' : '1.5px solid #d1d5db',
                    backgroundColor: selected ? '#f0f4ff' : '#fff',
                    color: selected ? '#021048' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {selected && '✓ '}{spec}
                </button>
              );
            })}
          </div>
        </div>

        {/* Years of Experience */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 6 }}>
            Years of R&D tax experience
          </label>
          <input
            type="number"
            min="0"
            max="50"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            placeholder="e.g. 8"
            style={{
              width: 120,
              padding: '10px 14px',
              fontSize: 14,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
              color: '#1a1a1a',
              backgroundColor: '#fff',
            }}
            onFocus={e => { e.target.style.borderColor = '#021048'; e.target.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Location */}
        <div style={{ marginBottom: 24, display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 6 }}>
              State
            </label>
            <select
              value={locationState}
              onChange={(e) => setLocationState(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 14,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                outline: 'none',
                boxSizing: 'border-box',
                color: locationState ? '#1a1a1a' : '#9ca3af',
                backgroundColor: '#fff',
              }}
              onFocus={e => { e.target.style.borderColor = '#021048'; e.target.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            >
              <option value="">Select state</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 6 }}>
              City
            </label>
            <input
              type="text"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              placeholder="e.g. Sydney"
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
              onFocus={e => { e.target.style.borderColor = '#021048'; e.target.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Website */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 6 }}>
            Website
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yoursite.com"
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
            onFocus={e => { e.target.style.borderColor = '#021048'; e.target.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Preview Card */}
        {displayName && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#333', marginBottom: 8 }}>
              Marketplace preview
            </label>
            <div style={{
              padding: 20,
              background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 20, fontWeight: 600, color: '#9ca3af' }}>
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{displayName}</div>
                  {headline && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{headline}</div>}
                </div>
              </div>

              {specializations.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {specializations.map(s => (
                    <span key={s} style={{
                      padding: '2px 10px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: '#f0f4ff',
                      color: '#021048',
                    }}>{s}</span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#6b7280' }}>
                {(locationCity || locationState) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14} />
                    {[locationCity, locationState].filter(Boolean).join(', ')}
                  </span>
                )}
                {yearsExperience && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Award size={14} />
                    {yearsExperience} years exp
                  </span>
                )}
              </div>
            </div>
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
            marginBottom: 16,
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
            marginBottom: 16,
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
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </main>
  );
}
