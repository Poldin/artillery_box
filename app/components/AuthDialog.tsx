'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Check, X, Loader2, ArrowLeft } from 'lucide-react';

type AuthView = 'welcome' | 'login' | 'register' | 'otp' | 'forgot-password' | 'reset-sent';

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

interface AuthDialogProps {
  isOpen: boolean;
  onAuthSuccess: () => void;
}

export default function AuthDialog({ isOpen, onAuthSuccess }: AuthDialogProps) {
  const [view, setView] = useState<AuthView>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setView('welcome');
      setEmail('');
      setPassword('');
      setOtpCode('');
      setAcceptedTerms(false);
      setAcceptedPrivacy(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // Handle Registration
  const handleRegister = async () => {
    if (!email || !isPasswordValid || !acceptedTerms || !acceptedPrivacy) {
      setError('Please fill all fields correctly and accept the terms');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('This email is already registered. Please login instead.');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // Move to OTP verification
      setView('otp');
      setSuccessMessage('Check your email for the verification code');
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 8) {
      setError('Please enter a valid 8-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      // Auto-login successful
      onAuthSuccess();
    } catch (err) {
      setError('Verification failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      onAuthSuccess();
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setView('reset-sent');
    } catch (err) {
      setError('Failed to send reset email');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccessMessage('Verification code resent!');
    } catch (err) {
      setError('Failed to resend code');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-dialog-overlay">
      <div className="auth-dialog">
        {/* Left Panel - Branding */}
        <div className="auth-dialog-brand">
          <div className="auth-brand-content">
            {/* Logo */}
            <div className="auth-logo">
              <span className="auth-logo-text">Vetrinae</span>
            </div>

            {/* Tagline */}
            <h1 className="auth-headline">
              The AI-powered platform for<br />
              <span className="auth-headline-accent">data analysis & dashboards</span>
            </h1>

            {/* Features */}
            <ul className="auth-features">
              <li>
                <Check size={16} className="auth-feature-icon" />
                Connect any database in seconds
              </li>
              <li>
                <Check size={16} className="auth-feature-icon" />
                Query data with natural language
              </li>
              <li>
                <Check size={16} className="auth-feature-icon" />
                Create interactive dashboards
              </li>
              <li>
                <Check size={16} className="auth-feature-icon" />
                AI-assisted data exploration
              </li>
            </ul>
          </div>

          {/* Background decoration */}
          <div className="auth-brand-decoration" />
        </div>

        {/* Right Panel - Auth Forms */}
        <div className="auth-dialog-form">
          {/* Welcome View */}
          {view === 'welcome' && (
            <div className="auth-form-content">
              <h2 className="auth-form-title">Get Started</h2>
              <p className="auth-form-subtitle">
                Create an account or sign in to unlock the full power of Vetrinae
              </p>

              <div className="auth-welcome-buttons">
                <button
                  onClick={() => setView('register')}
                  className="auth-btn-primary"
                >
                  Create Account
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => setView('login')}
                  className="auth-btn-secondary"
                >
                  I already have an account
                </button>
              </div>
            </div>
          )}

          {/* Register View */}
          {view === 'register' && (
            <div className="auth-form-content">
              <button
                onClick={() => setView('welcome')}
                className="auth-back-btn"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <h2 className="auth-form-title">Create Account</h2>
              <p className="auth-form-subtitle">
                Start analyzing your data in minutes
              </p>

              {error && <div className="auth-error">{error}</div>}

              <div className="auth-input-group">
                <label className="auth-label">Email</label>
                <div className="auth-input-wrapper">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="auth-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-input-toggle"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Requirements */}
                <div className="auth-password-requirements">
                  <PasswordRequirement met={passwordValidation.minLength} text="8+ characters" />
                  <PasswordRequirement met={passwordValidation.hasUppercase} text="Uppercase" />
                  <PasswordRequirement met={passwordValidation.hasLowercase} text="Lowercase" />
                  <PasswordRequirement met={passwordValidation.hasNumber} text="Number" />
                  <PasswordRequirement met={passwordValidation.hasSpecial} text="Special char" />
                </div>
              </div>

              {/* Terms & Privacy */}
              <div className="auth-checkbox-group">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="auth-checkbox"
                  />
                  <span>
                    I agree to the{' '}
                    <a href="/terms" target="_blank" className="auth-link">Terms of Service</a>
                  </span>
                </label>

                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="auth-checkbox"
                  />
                  <span>
                    I agree to the{' '}
                    <a href="/privacy" target="_blank" className="auth-link">Privacy Policy</a>
                  </span>
                </label>
              </div>

              <button
                onClick={handleRegister}
                disabled={isLoading || !email || !isPasswordValid || !acceptedTerms || !acceptedPrivacy}
                className="auth-btn-primary auth-btn-full"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
              </button>

              <p className="auth-switch-text">
                Already have an account?{' '}
                <button onClick={() => setView('login')} className="auth-link-btn">
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* OTP Verification View */}
          {view === 'otp' && (
            <div className="auth-form-content">
              <button
                onClick={() => setView('register')}
                className="auth-back-btn"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <h2 className="auth-form-title">Verify Email</h2>
              <p className="auth-form-subtitle">
                We sent an 8-digit code to<br />
                <strong>{email}</strong>
              </p>

              {error && <div className="auth-error">{error}</div>}
              {successMessage && <div className="auth-success">{successMessage}</div>}

              <div className="auth-input-group">
                <label className="auth-label">Verification Code</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="00000000"
                  className="auth-input auth-input-otp"
                  maxLength={8}
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isLoading || otpCode.length !== 8}
                className="auth-btn-primary auth-btn-full"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Continue'}
              </button>

              <p className="auth-switch-text">
                Didn&apos;t receive the code?{' '}
                <button onClick={handleResendOtp} disabled={isLoading} className="auth-link-btn">
                  Resend
                </button>
              </p>
            </div>
          )}

          {/* Login View */}
          {view === 'login' && (
            <div className="auth-form-content">
              <button
                onClick={() => setView('welcome')}
                className="auth-back-btn"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <h2 className="auth-form-title">Welcome Back</h2>
              <p className="auth-form-subtitle">
                Sign in to continue to Vetrinae
              </p>

              {error && <div className="auth-error">{error}</div>}

              <div className="auth-input-group">
                <label className="auth-label">Email</label>
                <div className="auth-input-wrapper">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="auth-input"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-input-toggle"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setView('forgot-password')}
                className="auth-forgot-btn"
              >
                Forgot password?
              </button>

              <button
                onClick={handleLogin}
                disabled={isLoading || !email || !password}
                className="auth-btn-primary auth-btn-full"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
              </button>

              <p className="auth-switch-text">
                Don&apos;t have an account?{' '}
                <button onClick={() => setView('register')} className="auth-link-btn">
                  Create one
                </button>
              </p>
            </div>
          )}

          {/* Forgot Password View */}
          {view === 'forgot-password' && (
            <div className="auth-form-content">
              <button
                onClick={() => setView('login')}
                className="auth-back-btn"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <h2 className="auth-form-title">Reset Password</h2>
              <p className="auth-form-subtitle">
                Enter your email and we&apos;ll send you a reset link
              </p>

              {error && <div className="auth-error">{error}</div>}

              <div className="auth-input-group">
                <label className="auth-label">Email</label>
                <div className="auth-input-wrapper">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                  />
                </div>
              </div>

              <button
                onClick={handleForgotPassword}
                disabled={isLoading || !email}
                className="auth-btn-primary auth-btn-full"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
              </button>
            </div>
          )}

          {/* Reset Sent View */}
          {view === 'reset-sent' && (
            <div className="auth-form-content auth-form-center">
              <div className="auth-success-icon">
                <Mail size={32} />
              </div>

              <h2 className="auth-form-title">Check Your Email</h2>
              <p className="auth-form-subtitle">
                We sent a password reset link to<br />
                <strong>{email}</strong>
              </p>

              <button
                onClick={() => setView('login')}
                className="auth-btn-secondary"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Password requirement indicator
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <span className={`auth-password-req ${met ? 'met' : ''}`}>
      {met ? <Check size={12} /> : <X size={12} />}
      {text}
    </span>
  );
}
