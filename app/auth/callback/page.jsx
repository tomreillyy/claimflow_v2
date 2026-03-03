'use client';
import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    const redirectTo = searchParams.get('redirect_to');
    const projectToken = searchParams.get('project_token');

    const handleSession = async (session) => {
      if (handled.current) return;
      handled.current = true;

      if (!session) {
        router.push('/auth/login');
        return;
      }

      if (projectToken) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          const response = await fetch('/api/projects/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_token: projectToken,
              user_email: userData.user.email,
            }),
          });
          if (response.ok) {
            router.push(`/p/${projectToken}`);
            return;
          }
        } catch (err) {
          console.error('Error joining project:', err);
        }
      }

      if (redirectTo) {
        router.push(redirectTo);
        return;
      }

      try {
        const consultantRes = await fetch('/api/consultant/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (consultantRes.ok) {
          const consultantData = await consultantRes.json();
          if (consultantData.isConsultant) {
            router.push('/consultant');
            return;
          }
        }
      } catch (e) {
        // Fall through to default redirect
      }

      router.push('/dashboard');
    };

    // Explicitly parse the hash in case detectSessionInUrl hasn't fired yet.
    if (window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data }) => { if (data.session) handleSession(data.session); });
      }
    }

    // Also listen for SIGNED_IN (fired when detectSessionInUrl processes the hash).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') handleSession(session);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) handleSession(data.session);
    });

    // Safety fallback: if nothing fires after 8s, redirect to login.
    const timeout = setTimeout(() => {
      if (!handled.current) router.push('/auth/login');
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        textAlign: 'center',
        padding: 40
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #021048',
          borderRadius: '50%',
          margin: '0 auto 20px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{
          fontSize: 16,
          color: '#6b7280',
          margin: 0
        }}>Signing you in...</p>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#fff',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          padding: 40
        }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #021048',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{
            fontSize: 16,
            color: '#6b7280',
            margin: 0
          }}>Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
