import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface AuthResponse {
  isAuthenticated: boolean;
  isAdmin?: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    avatarUrl?: string;
    planId?: string;
    planStatus?: string;
    planExpiresAt?: string;
    trialEndsAt?: string;
    subdomain?: string;
    customDomain?: string;
    domainVerified?: boolean;
  };
}

async function fetchSession(): Promise<AuthResponse> {
  const response = await fetch("/api/auth/session", {
    credentials: "include",
  });

  if (!response.ok) {
    return { isAuthenticated: false };
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, refetch } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/session"],
    queryFn: fetchSession,
    retry: false,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!supabase) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return {
    data,
    user: data?.user,
    isLoading,
    isAuthenticated: data?.isAuthenticated || false,
    isAdmin: data?.isAdmin || false,
    refetch,
  };
}

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth/callback',
    },
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

export async function signOut() {
  if (!supabase) {
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getSupabaseSession() {
  if (!supabase) {
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export { isSupabaseConfigured };
