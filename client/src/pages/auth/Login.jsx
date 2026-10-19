import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, AlertCircle, ArrowRight, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // MFA Challenge State
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const { login, verifyMfaLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const fillDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('DemoPassword123!');
    setErrorMessage('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please provide both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({ email: cleanEmail, password: cleanPassword });
      if (res?.mfaRequired) {
        setIsMfaStep(true);
        setMfaToken(res.mfaToken);
        setTotpCode('');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanCode = totpCode.trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setErrorMessage('Please enter a valid 6-digit numeric authenticator code.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyMfaLogin({ mfaToken, token: cleanCode });
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'MFA verification failed. Please ensure the code is correct.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsMfaStep(false);
    setMfaToken('');
    setTotpCode('');
    setErrorMessage('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '1.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: isMfaStep ? '#4f46e5' : 'var(--primary)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-md)',
            transition: 'background-color 0.2s ease'
          }}>
            {isMfaStep ? <KeyRound size={26} /> : <ShieldCheck size={28} />}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {isMfaStep ? 'Two-Factor Authentication' : 'TenantGuard Portal'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            {isMfaStep 
              ? 'Enter the 6-digit TOTP code from your authenticator application' 
              : 'Secure Multi-Tenant Workspace Sign In'}
          </p>
        </div>

        {/* Login / MFA Form Card */}
        <div className="card" style={{ padding: '2rem' }}>
          {errorMessage && (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {!isMfaStep ? (
            /* Standard Password Authentication Step */
            <form onSubmit={handlePasswordSubmit}>
              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Work Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              {/* Password with Show/Hide Toggle */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="password">
                    Password
                  </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={isLoading}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
              >
                {isLoading ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Workspace
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Multi-Factor Authentication Verification Step */
            <form onSubmit={handleMfaSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="totpCode">
                  6-Digit Authenticator Code
                </label>
                <input
                  id="totpCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  className="form-input"
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading}
                  style={{
                    fontSize: '1.5rem',
                    letterSpacing: '0.35em',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 700
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
                  Open Google Authenticator, Authy, or your password manager
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || totpCode.length !== 6}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
              >
                {isLoading ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    Verifying Code...
                  </>
                ) : (
                  <>
                    Verify & Enter Workspace
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                disabled={isLoading}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.6rem' }}
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </button>
            </form>
          )}

          {/* Quick Demo Accounts Selection */}
          {!isMfaStep && (
            <div style={{
              marginTop: '1.25rem',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)'
            }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>⚡ 1-Click Demo Accounts</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 500 }}>Auto-fills Form</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.4rem', justifyContent: 'center' }}
                  onClick={() => fillDemoAccount('alice.admin@cybercorp.demo')}
                  title="Org Admin - Full Access (CyberCorp)"
                >
                  👑 Alice (Admin)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.4rem', justifyContent: 'center' }}
                  onClick={() => fillDemoAccount('bob.pm@cybercorp.demo')}
                  title="Project Manager (CyberCorp)"
                >
                  💼 Bob (PM)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.4rem', justifyContent: 'center' }}
                  onClick={() => fillDemoAccount('charlie.dev@cybercorp.demo')}
                  title="Developer / Member (CyberCorp)"
                >
                  💻 Charlie (Dev)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.4rem', justifyContent: 'center' }}
                  onClick={() => fillDemoAccount('eve.admin@apexshield.demo')}
                  title="ApexShield Admin (Tenant Isolation Test)"
                >
                  🏢 Eve (ApexShield)
                </button>
              </div>
            </div>
          )}

          {/* Registration Link (Only shown on password step) */}
          {!isMfaStep && (
            <div style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-light)',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}>
              New organization?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Create an isolated workspace
              </Link>
            </div>
          )}
        </div>

        {/* Security Notice Footer */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
          Protected by TenantGuard Multi-Tenant Boundary Isolation
        </div>
      </div>
    </div>
  );
};

export default Login;
