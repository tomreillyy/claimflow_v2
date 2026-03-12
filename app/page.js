'use client';

import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LandingPage from '@/components/LandingPage';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner />
      </div>
    );
  }

  if (user) return null;

  return <LandingPage />;
}
