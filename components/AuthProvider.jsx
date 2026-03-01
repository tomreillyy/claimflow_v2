'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isConsultant, setIsConsultant] = useState(false);
  const [consultantStatusLoaded, setConsultantStatusLoaded] = useState(false);
  const [consultantBranding, setConsultantBranding] = useState(null);

  const fetchConsultantBranding = useCallback(async (session) => {
    if (!session?.access_token) {
      setConsultantBranding(null);
      return;
    }
    try {
      const res = await fetch('/api/consultant/my-branding', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.company_name || data.logo_url) {
          setConsultantBranding(data);
        } else {
          setConsultantBranding(null);
        }
      } else {
        setConsultantBranding(null);
      }
    } catch {
      setConsultantBranding(null);
    }
  }, []);

  const fetchConsultantStatus = useCallback(async (session) => {
    if (!session?.access_token) {
      setIsConsultant(false);
      setConsultantStatusLoaded(true);
      return;
    }
    try {
      const res = await fetch('/api/consultant/status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsConsultant(data.isConsultant === true);
      } else {
        setIsConsultant(false);
      }
    } catch {
      setIsConsultant(false);
    } finally {
      setConsultantStatusLoaded(true);
    }
  }, []);

  const fetchSubscriptionStatus = useCallback(async (session) => {
    if (!session?.access_token) {
      setSubscription(null);
      return;
    }

    setSubscriptionLoading(true);
    try {
      const res = await fetch('/api/stripe/subscription-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetchSubscriptionStatus(session);
  }, [fetchSubscriptionStatus]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);

      // Fetch subscription and consultant status if user is logged in
      if (session?.user) {
        fetchSubscriptionStatus(session);
        fetchConsultantStatus(session);
        fetchConsultantBranding(session);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        setLoading(false);

        // Fetch subscription and consultant status when auth state changes
        if (session?.user) {
          fetchSubscriptionStatus(session);
          fetchConsultantStatus(session);
          fetchConsultantBranding(session);
        } else {
          setSubscription(null);
          setIsConsultant(false);
          setConsultantStatusLoaded(true);
          setConsultantBranding(null);
        }
      }
    );

    return () => authSubscription.unsubscribe();
  }, [fetchSubscriptionStatus, fetchConsultantStatus, fetchConsultantBranding]);

  const refreshConsultantStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetchConsultantStatus(session);
  }, [fetchConsultantStatus]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscription(null);
    setIsConsultant(false);
    setConsultantBranding(null);
    window.location.href = '/auth/login';
  };

  const isSubscribed = subscription?.isSubscribed === true;

  const value = {
    user,
    loading,
    signOut,
    subscription,
    subscriptionLoading,
    isSubscribed,
    refreshSubscription,
    isConsultant,
    consultantStatusLoaded,
    refreshConsultantStatus,
    consultantBranding,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}