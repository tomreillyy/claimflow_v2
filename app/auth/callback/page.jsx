'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          router.push('/auth/error?message=' + encodeURIComponent(error.message));
          return;
        }

        if (data.session) {
          // Check if there's a redirect URL (for invite flows)
          const redirectTo = searchParams.get('redirect_to');
          const projectToken = searchParams.get('project_token');

          if (projectToken) {
            // User is joining a project via invite
            try {
              const { data: user } = await supabase.auth.getUser();
              const response = await fetch('/api/projects/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  project_token: projectToken,
                  user_email: user.user.email
                })
              });

              if (response.ok) {
                router.push(`/p/${projectToken}`);
                return;
              }
            } catch (error) {
              console.error('Error joining project:', error);
            }
          }

          if (redirectTo) {
            router.push(redirectTo);
          } else {
            router.push('/');
          }
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        router.push('/auth/error?message=' + encodeURIComponent('Authentication failed'));
      }
    };

    handleAuthCallback();
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
