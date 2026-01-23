'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Check, X, Loader2, ArrowLeft, Building } from 'lucide-react';

type AuthView = 'login' | 'register' | 'otp';

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

interface PartnerAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'register';
}

export default function PartnerAuthDialog({ isOpen, onClose, initialView = 'login' }: PartnerAuthDialogProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
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

  // Update view when initialView changes
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setEmail('');
      setPassword('');
      setCompanyName('');
      setOtpCode('');
      setAcceptedTerms(false);
      setAcceptedPrivacy(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialView]);

  // Handle Partner Registration
  const handleRegister = async () => {
    if (!email || !companyName || !isPasswordValid || !acceptedTerms || !acceptedPrivacy) {
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
          data: {
            is_partner: true,
            company_name: companyName,
          }
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
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      // Create partner record
      if (data.user) {
        const response = await fetch('/api/partners/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: companyName,
            metadata: {
              email: email,
              registered_at: new Date().toISOString(),
            }
          }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          console.error('Failed to create partner record:', result.error);
          setError('Failed to create partner account. Please contact support.');
          return;
        }

        console.log('Partner record created successfully:', result.partner);
      }

      // Redirect to main app
      window.location.href = '/';
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

      // Redirect to main app
      window.location.href = '/';
    } catch (err) {
      setError('Login failed. Please try again.');
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
    <div className="auth-dialog-overlay" onClick={onClose}>
      <div className="auth-dialog partner-auth-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Left Panel - Partner Branding */}
        <div className="auth-dialog-brand partner-brand">
          <div className="auth-brand-content">
            {/* Logo */}
            <div className="auth-logo">
              <span className="auth-logo-text">Vetrinae</span>
              <span className="partner-badge-large">Partner</span>
            </div>

            {/* Tagline */}
            <h1 className="auth-headline">
              Grow your business with<br />
              <span className="auth-headline-accent">AI-powered solutions</span>
            </h1>

            {/* Partner Features */}
            <ul className="auth-features">
              <li>
                <Check size={16} className="auth-feature-icon" />
                Competitive partner margins
              </li>
              <li>
                <Check size={16} className="auth-feature-icon" />
                Dedicated support team
              </li>
              <li>
                <Check size={16} className="auth-feature-icon" />
                White-label options
              </li>
              <li>
                <Check size={16} className="auth-feature-icon" />
                Revenue dashboard & analytics
              </li>
            </ul>
          </div>

          {/* Background decoration */}
          <div className="auth-brand-decoration" />
        </div>

        {/* Right Panel - Auth Forms */}
        <div className="auth-dialog-form">
          {/* Mobile Close Button */}
          <button 
            onClick={onClose}
            className="auth-dialog-close-mobile"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          {/* Login View */}
          {view === 'login' && (
            <div className="auth-form-content">
              <h2 className="auth-form-title">Partner Sign In</h2>
              <p className="auth-form-subtitle">
                Access your partner dashboard
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
                    placeholder="partner@company.com"
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
                onClick={handleLogin}
                disabled={isLoading || !email || !password}
                className="auth-btn-primary auth-btn-full"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
              </button>

              <p className="auth-switch-text">
                Not a partner yet?{' '}
                <button onClick={() => setView('register')} className="auth-link-btn">
                  Apply now
                </button>
              </p>
            </div>
          )}

          {/* Register View */}
          {view === 'register' && (
            <div className="auth-form-content">
              <h2 className="auth-form-title">Become a Partner</h2>
              <p className="auth-form-subtitle">
                Join our partner ecosystem
              </p>

              {error && <div className="auth-error">{error}</div>}

              <div className="auth-input-group">
                <label className="auth-label">Company Name</label>
                <div className="auth-input-wrapper">
                  <Building size={18} className="auth-input-icon" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Ltd."
                    className="auth-input"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Email</label>
                <div className="auth-input-wrapper">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@company.com"
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
                disabled={isLoading || !email || !companyName || !isPasswordValid || !acceptedTerms || !acceptedPrivacy}
                className="auth-btn-primary auth-btn-full"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Partner Account'}
              </button>

              <p className="auth-switch-text">
                Already a partner?{' '}
                <button onClick={() => setView('login')} className="auth-link-btn">
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* OTP Verification View */}
          {view === 'otp' && (
            <div className="auth-form-content">
              <button onClick={() => setView('register')} className="auth-back-btn">
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
