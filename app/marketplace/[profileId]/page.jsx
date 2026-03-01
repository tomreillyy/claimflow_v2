'use client';

import { useEffect, use } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';
import { ConsultantProfile } from '@/components/ConsultantProfile';

export default function MarketplaceProfilePage({ params }) {
  const { profileId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?redirect=/marketplace');
    }
  }, [user, loading, router]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAFAFA',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
    }}>
      <Header />
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spinner />
        </div>
      ) : (
        <ConsultantProfile profileId={profileId} />
      )}
    </div>
  );
}
