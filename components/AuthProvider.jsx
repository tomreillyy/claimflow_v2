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

      // Fetch subscription status if user is logged in
      if (session?.user) {
        fetchSubscriptionStatus(session);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        setLoading(false);

        // Fetch subscription status when auth state changes
        if (session?.user) {
          fetchSubscriptionStatus(session);
        } else {
          setSubscription(null);
        }
      }
    );

    return () => authSubscription.unsubscribe();
  }, [fetchSubscriptionStatus]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscription(null);
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}