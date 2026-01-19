'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/app/lib/supabase/client';
import { Loader2, Lock, CheckCircle2 } from 'lucide-react';

function SetupPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const nameParam = searchParams.get('name');
    if (nameParam) {
      setName(nameParam);
    }

    // Check if we have a valid session from the recovery link
    const checkSession = async () => {
      const supabase = createClient();
      
      // Check if there are tokens in the URL hash (from Supabase recovery link)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      // If we have recovery tokens in the URL, set the session
      if (accessToken && refreshToken && type === 'recovery') {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Invalid or expired invitation link. Please request a new invitation.');
          setIsVerifying(false);
          return;
        }
        
        // Clean up the URL hash
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        setIsVerifying(false);
        return;
      }
      
      // Otherwise check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Invalid or expired invitation link. Please request a new invitation.');
      }
      setIsVerifying(false);
    };

    checkSession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // Check if user has a valid session (from recovery link)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Invalid or expired invitation link. Please request a new invitation.');
        setIsLoading(false);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error('Update error:', updateError);
        setError('Failed to set password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Update user metadata to mark invitation as complete
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { invitation_pending: false },
      });

      if (metadataError) {
        console.error('Metadata error:', metadataError);
      }

      setSuccess(true);

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div 
        className="w-full max-w-md p-8 rounded-xl shadow-xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        {success ? (
          <div className="text-center">
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(34, 197, 94, 0.1)' }}
            >
              <CheckCircle2 size={32} style={{ color: 'var(--accent-success)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Account Setup Complete!
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Redirecting you to your dashboard...
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(59, 130, 246, 0.1)' }}
              >
                <Lock size={32} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Welcome to Vetrinae{name ? `, ${name}` : ''}!
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Set your password to complete your registration
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ 
                    background: 'var(--bg-primary)', 
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Enter your password (min 8 characters)"
                  minLength={8}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div 
                  className="p-3 rounded-lg text-sm"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-error)' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
                style={{ 
                  background: isLoading ? 'var(--bg-tertiary)' : 'var(--accent-primary)', 
                  color: 'white',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Setting up your account...
                  </>
                ) : (
                  <>
                    <Lock size={20} />
                    Complete Setup
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    }>
      <SetupPasswordContent />
    </Suspense>
  );
}
