'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/Spinner';
import { Search, MapPin, Award, Users, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';

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

export function MarketplaceBrowse() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    setPage(1);
    fetchProfiles(1);
  }, [user, debouncedQuery, selectedSpec, selectedState]);

  const fetchProfiles = async (pageNum) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (selectedSpec) params.set('specialization', selectedSpec);
      if (selectedState) params.set('state', selectedState);

      const response = await fetch(`/api/marketplace/consultants?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Failed to fetch marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasFilters = searchQuery || selectedSpec || selectedState;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSpec('');
    setSelectedState('');
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{
          fontSize: 'clamp(24px, 5vw, 36px)',
          fontWeight: 700,
          color: '#1a1a1a',
          margin: '0 0 8px 0',
        }}>
          Find an R&D Tax Advisor
        </h1>
        <p style={{
          fontSize: 'clamp(14px, 3vw, 16px)',
          color: '#6b7280',
          margin: 0,
          maxWidth: 500,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Browse experienced R&D tax consultants ready to help with your claim
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 32,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <Search size={16} color="#9ca3af" style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
          }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or expertise..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              fontSize: 14,
              border: '1px solid #d1d5db',
              borderRadius: 10,
              outline: 'none',
              boxSizing: 'border-box',
              color: '#1a1a1a',
              backgroundColor: '#fff',
            }}
            onFocus={e => { e.target.style.borderColor = '#021048'; e.target.style.boxShadow = '0 0 0 3px rgba(2, 16, 72, 0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Specialization filter */}
        <select
          value={selectedSpec}
          onChange={(e) => setSelectedSpec(e.target.value)}
          style={{
            padding: '10px 14px',
            fontSize: 14,
            border: '1px solid #d1d5db',
            borderRadius: 10,
            outline: 'none',
            color: selectedSpec ? '#1a1a1a' : '#9ca3af',
            backgroundColor: '#fff',
            cursor: 'pointer',
            minWidth: 160,
          }}
        >
          <option value="">All specializations</option>
          {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* State filter */}
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          style={{
            padding: '10px 14px',
            fontSize: 14,
            border: '1px solid #d1d5db',
            borderRadius: 10,
            outline: 'none',
            color: selectedState ? '#1a1a1a' : '#9ca3af',
            backgroundColor: '#fff',
            cursor: 'pointer',
            minWidth: 100,
          }}
        >
          <option value="">All states</option>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 500,
              color: '#6b7280',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
          {total} advisor{total !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Results grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner />
        </div>
      ) : profiles.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 24px',
          color: '#6b7280',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>
            <Search size={48} color="#d1d5db" style={{ margin: '0 auto' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
            No advisors found
          </h3>
          <p style={{ fontSize: 14, margin: '0 0 16px' }}>
            {hasFilters
              ? 'Try adjusting your filters to see more results.'
              : 'No advisors have listed their profiles yet.'}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: '8px 20px',
                fontSize: 14,
                fontWeight: 500,
                color: '#021048',
                backgroundColor: '#f0f4ff',
                border: '1px solid #021048',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: 16,
          }}>
            {profiles.map(profile => (
              <ConsultantCard key={profile.id} profile={profile} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              marginTop: 32,
            }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => fetchProfiles(p)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: p === page ? '1.5px solid #021048' : '1px solid #d1d5db',
                    backgroundColor: p === page ? '#f0f4ff' : '#fff',
                    color: p === page ? '#021048' : '#6b7280',
                    fontWeight: p === page ? 600 : 400,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function ConsultantCard({ profile }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/marketplace/${profile.id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        padding: 20,
        background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: hovered
          ? '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)'
          : '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        cursor: 'pointer',
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
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 20, fontWeight: 600, color: '#9ca3af' }}>
                {profile.display_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>
              {profile.display_name}
            </div>
            {profile.headline && (
              <div style={{
                fontSize: 13,
                color: '#6b7280',
                marginTop: 2,
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {profile.specializations.slice(0, 3).map(s => (
              <span key={s} style={{
                padding: '2px 10px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: '#f0f4ff',
                color: '#021048',
              }}>{s}</span>
            ))}
            {profile.specializations.length > 3 && (
              <span style={{
                padding: '2px 10px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
              }}>+{profile.specializations.length - 3}</span>
            )}
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          color: '#6b7280',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {(profile.location_city || profile.location_state) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} />
                {[profile.location_city, profile.location_state].filter(Boolean).join(', ')}
              </span>
            )}
            {profile.years_experience && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Award size={14} />
                {profile.years_experience}y exp
              </span>
            )}
            {profile.client_count > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={14} />
                {profile.client_count} client{profile.client_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <ChevronRight size={16} color={hovered ? '#021048' : '#d1d5db'} style={{ transition: 'color 0.2s' }} />
        </div>
      </div>
    </Link>
  );
}
