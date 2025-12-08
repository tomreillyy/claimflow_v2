'use client';
import { DashboardOverview } from '@/components/DashboardOverview';
import { useAuth } from '@/components/AuthProvider';
import { Spinner } from '@/components/Spinner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <DashboardOverview />;
}
