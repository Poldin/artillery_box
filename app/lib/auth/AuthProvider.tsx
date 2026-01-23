'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '../supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import AuthDialog from '@/app/components/AuthDialog';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Rotte che non devono mostrare il dialog di autenticazione
const noAuthDialogRoutes = ['/partner', '/dashare'];

export function AuthProvider({ children }: AuthProviderProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const supabase = createClient();
  
  // Controlla se siamo su una route che non deve mostrare il dialog
  const shouldShowDialog = !noAuthDialogRoutes.some(route => pathname?.startsWith(route));

  // Refresh session
  const refreshSession = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
    setUser(currentSession?.user || null);
  }, [supabase.auth]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for recovery tokens in URL hash first
        if (typeof window !== 'undefined') {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const type = hashParams.get('type');
          const accessToken = hashParams.get('access_token');
          
          // If this is a recovery link, redirect to setup password page
          if (type === 'recovery' && accessToken) {
            // Get user info from token to check if they need to setup password
            const { data: { session: recoverySession } } = await supabase.auth.getSession();
            
            if (recoverySession?.user?.user_metadata?.invitation_pending) {
              const name = recoverySession.user.user_metadata.name || '';
              window.location.href = `/auth/setup-password?name=${encodeURIComponent(name)}`;
              return;
            }
          }
        }
        
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user || null);
        
        // Show auth dialog if not authenticated and we're on a route that requires it
        if (!initialSession && shouldShowDialog) {
          setShowAuthDialog(true);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);

        if (event === 'SIGNED_IN') {
          setShowAuthDialog(false);
        } else if (event === 'SIGNED_OUT' && shouldShowDialog) {
          setShowAuthDialog(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, shouldShowDialog]);

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    if (shouldShowDialog) {
      setShowAuthDialog(true);
    }
  };

  // Handle successful auth
  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
    refreshSession();
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated,
      signOut,
      refreshSession,
    }}>
      {children}
      <AuthDialog 
        isOpen={showAuthDialog && !isLoading} 
        onAuthSuccess={handleAuthSuccess} 
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
