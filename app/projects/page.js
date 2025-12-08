'use client';
import { ProjectsDashboard } from '@/components/ProjectsDashboard';
import { Header } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import { Spinner } from '@/components/Spinner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProjectsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main style={{
        minHeight: '100vh',
        background: '#FAFAFA',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      }}>
        <Header />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spinner />
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#FAFAFA',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
    }}>
      <Header />
      <ProjectsDashboard />
    </main>
  );
}
