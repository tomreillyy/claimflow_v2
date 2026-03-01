'use client';

import { useState, useEffect } from 'react';
import { MapPin, Award, ArrowRight } from 'lucide-react';

export function MarketplaceTeaser() {
  const [profiles, setProfiles] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchFeatured();
  }, []);

  const fetchFeatured = async () => {
    try {
      const response = await fetch('/api/marketplace/featured');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
      }
    } catch (err) {
      console.error('Failed to fetch featured consultants:', err);
    } finally {
      setLoaded(true);
    }
  };

  // Don't render if no profiles available
  if (loaded && profiles.length === 0) return null;
  if (!loaded) return null;

  return (
    <section style={{
      padding: 'clamp(60px, 12vw, 100px) 16px',
      borderTop: '1px solid var(--line)',
      background: 'var(--bg-soft)',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{
          margin: '0 0 12px',
          fontSize: 'clamp(24px, 5vw, 38px)',
          fontWeight: 700,
          color: 'var(--ink)',
        }}>
          Find a trusted R&D advisor
        </h2>
        <p style={{
          color: 'var(--muted)',
          fontSize: 'clamp(15px, 3.5vw, 18px)',
          marginBottom: 'clamp(32px, 8vw, 48px)',
          maxWidth: 520,
          margin: '0 auto clamp(32px, 8vw, 48px)',
        }}>
          Browse experienced R&D tax consultants ready to help with your claim
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginBottom: 32,
          textAlign: 'left',
        }}>
          {profiles.map(profile => (
            <div
              key={profile.id}
              style={{
                padding: 20,
                background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
                borderRadius: 16,
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 44,
                  height: 44,
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
                    <span style={{ fontSize: 18, fontWeight: 600, color: '#9ca3af' }}>
                      {profile.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
                    {profile.display_name}
                  </div>
                  {profile.headline && (
                    <div style={{
                      fontSize: 12,
                      color: '#6b7280',
                      marginTop: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {profile.headline}
                    </div>
                  )}
                </div>
              </div>

              {profile.specializations?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {profile.specializations.slice(0, 2).map(s => (
                    <span key={s} style={{
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 500,
                      backgroundColor: '#f0f4ff',
                      color: '#021048',
                    }}>{s}</span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#9ca3af' }}>
                {(profile.location_city || profile.location_state) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={12} />
                    {[profile.location_city, profile.location_state].filter(Boolean).join(', ')}
                  </span>
                )}
                {profile.years_experience && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Award size={12} />
                    {profile.years_experience}y exp
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <a
          href="/auth/login?redirect=/marketplace"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 600,
            color: 'white',
            backgroundColor: '#021048',
            borderRadius: 9999,
            textDecoration: 'none',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(2, 16, 72, 0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Browse all advisors
          <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}
