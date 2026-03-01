'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Spinner } from '@/components/Spinner';
import { ConsultantTeamManager } from '@/components/ConsultantTeamManager';

export default function ConsultantTeamPage() {
  const { user, loading: authLoading, isConsultant, consultantStatusLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (!authLoading && consultantStatusLoaded && user && !isConsultant) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isConsultant, consultantStatusLoaded, router]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAFAFA',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      <Header />
      {authLoading || !consultantStatusLoaded ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spinner />
        </div>
      ) : (
        <ConsultantTeamManager />
      )}
    </div>
  );
}
