'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabase/client';
import { Eye, EyeOff, Lock, Check, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // Password validation
  const validatePassword = (pwd: string): PasswordValidation => ({
    minLength: pwd.length >= 8,
    hasUppercase: /[A-Z]/.test(pwd),
    hasLowercase: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/.test(pwd),
  });

  const passwordValidation = validatePassword(password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = password === confirmPassword && password !== '';

  // Check if we have a valid session from the email link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No valid session, redirect to home
        router.push('/');
      }
    };
    checkSession();
  }, [supabase.auth, router]);

  const handleResetPassword = async () => {
    if (!isPasswordValid) {
      setError('Password does not meet requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError('Failed to reset password');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div 
        className="w-full max-w-md p-8 rounded-xl"
        style={{ 
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {success ? (
          <div className="text-center">
            <div 
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34, 197, 94, 0.1)' }}
            >
              <Check size={32} style={{ color: 'var(--accent-success)' }} />
            </div>
            <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Password Updated!
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Redirecting you to the dashboard...
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Set New Password
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Enter your new password below
            </p>

            {error && (
              <div 
                className="p-3 rounded-lg mb-4 text-sm"
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--accent-error)'
                }}
              >
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  New Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-lg text-sm"
                    style={{ 
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Requirements */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <PasswordReq met={passwordValidation.minLength} text="8+ chars" />
                  <PasswordReq met={passwordValidation.hasUppercase} text="Uppercase" />
                  <PasswordReq met={passwordValidation.hasLowercase} text="Lowercase" />
                  <PasswordReq met={passwordValidation.hasNumber} text="Number" />
                  <PasswordReq met={passwordValidation.hasSpecial} text="Special" />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-lg text-sm"
                    style={{ 
                      background: 'var(--bg-tertiary)',
                      border: `1px solid ${confirmPassword && !passwordsMatch ? 'var(--accent-error)' : 'var(--border-subtle)'}`,
                      color: 'var(--text-primary)'
                    }}
                  />
                  {confirmPassword && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {passwordsMatch ? (
                        <Check size={18} style={{ color: 'var(--accent-success)' }} />
                      ) : (
                        <X size={18} style={{ color: 'var(--accent-error)' }} />
                      )}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleResetPassword}
                disabled={isLoading || !isPasswordValid || !passwordsMatch}
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                style={{ 
                  background: isPasswordValid && passwordsMatch ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: isPasswordValid && passwordsMatch ? 'white' : 'var(--text-muted)',
                  cursor: isPasswordValid && passwordsMatch ? 'pointer' : 'not-allowed'
                }}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PasswordReq({ met, text }: { met: boolean; text: string }) {
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
      style={{ 
        background: met ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-primary)',
        color: met ? 'var(--accent-success)' : 'var(--text-muted)'
      }}
    >
      {met ? <Check size={10} /> : <X size={10} />}
      {text}
    </span>
  );
}
