import React, { useState } from 'react';
import { 
  User, 
  Building2, 
  Shield, 
  Lock, 
  LogOut, 
  CheckCircle2, 
  RefreshCw, 
  KeyRound, 
  QrCode, 
  AlertTriangle, 
  X, 
  Copy, 
  Check,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { authApi } from '../../api/auth.api.js';
import { useNavigate } from 'react-router-dom';

export const Settings = () => {
  const { user, organization, logout, checkSession } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  // MFA Enrollment Modal State
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // MFA Disable Modal State
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableError, setDisableError] = useState('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshSuccess(false);
    try {
      await checkSession();
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 1. Open MFA Setup Modal
  const handleOpenSetupModal = async () => {
    setSetupError('');
    setVerifyCode('');
    setIsSettingUp(true);
    setShowSetupModal(true);
    try {
      const res = await authApi.setupMfa();
      if (res.success && res.data) {
        setSetupData(res.data);
      } else {
        setSetupError('Failed to initialize MFA configuration.');
      }
    } catch (err) {
      setSetupError(err.message || 'Error generating MFA setup keys.');
    } finally {
      setIsSettingUp(false);
    }
  };

  // 2. Confirm MFA Enrollment
  const handleConfirmMfaSetup = async (e) => {
    e.preventDefault();
    setSetupError('');

    const cleanCode = verifyCode.trim();
    if (cleanCode.length !== 6) {
      setSetupError('Please enter a 6-digit verification code.');
      return;
    }

    setIsSettingUp(true);
    try {
      await authApi.verifyMfaSetup({ token: cleanCode });
      setShowSetupModal(false);
      await checkSession();
      setActionMessage({ type: 'success', text: 'Two-Factor Authentication (TOTP) successfully activated on your account!' });
      setTimeout(() => setActionMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      setSetupError(err.message || 'Invalid authenticator code. Please check your authenticator application.');
    } finally {
      setIsSettingUp(false);
    }
  };

  // 3. Confirm MFA Disablement
  const handleConfirmMfaDisable = async (e) => {
    e.preventDefault();
    setDisableError('');

    if (!disablePassword) {
      setDisableError('Account password is required to disable 2FA.');
      return;
    }
    if (disableCode.trim().length !== 6) {
      setDisableError('Valid 6-digit TOTP code is required.');
      return;
    }

    setIsDisabling(true);
    try {
      await authApi.disableMfa({ 
        password: disablePassword, 
        token: disableCode.trim() 
      });
      setShowDisableModal(false);
      setDisablePassword('');
      setDisableCode('');
      await checkSession();
      setActionMessage({ type: 'warning', text: 'Two-Factor Authentication has been disabled for your account.' });
      setTimeout(() => setActionMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      setDisableError(err.message || 'Failed to disable 2FA. Verify password and authenticator code.');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleCopySecret = (secret) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div style={{ maxWidth: '840px', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Profile & Security Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Verified identity parameters, cryptographic credentials, and multi-factor authentication
        </p>
      </div>

      {refreshSuccess && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle2 size={18} />
          <div>Authentication session successfully re-validated with backend.</div>
        </div>
      )}

      {actionMessage.text && (
        <div className={`alert alert-${actionMessage.type === 'success' ? 'success' : 'warning'}`} style={{ marginBottom: '1.5rem' }}>
          <CheckCircle2 size={18} />
          <div>{actionMessage.text}</div>
        </div>
      )}

      {/* User Profile Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={20} color="var(--primary)" />
            <h2 className="card-title">User Account Profile</h2>
          </div>
          <button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="btn btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spinner' : ''} />
            Re-verify Session
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Full Name</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>{user?.firstName} {user?.lastName}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Work Email</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>{user?.email}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Role</div>
            <div style={{ marginTop: '0.2rem' }}>
              <span className="badge badge-primary">{user?.role?.toUpperCase()}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>User ID</div>
            <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{user?.id}</div>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication (TOTP) Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound size={20} color="#4f46e5" />
            <h2 className="card-title">Two-Factor Authentication (TOTP MFA)</h2>
          </div>
          <span className={`badge ${user?.mfaEnabled ? 'badge-success' : 'badge-warning'}`}>
            {user?.mfaEnabled ? 'PROTECTED (2FA ACTIVE)' : 'NOT CONFIGURED'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            Protect your workspace identity with time-based one-time password (TOTP) multi-factor authentication.
            Compatible with Google Authenticator, Authy, 1Password, and any RFC 6238 authenticator application.
          </p>

          <div style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                Status: {user?.mfaEnabled ? 'Two-Factor Authentication is Enabled' : 'Two-Factor Authentication is Disabled'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {user?.mfaEnabled 
                  ? 'Your account requires both password and 6-digit TOTP code on every login.' 
                  : 'We strongly recommend enabling 2FA to prevent unauthorized workspace access.'}
              </div>
            </div>

            {!user?.mfaEnabled ? (
              <button 
                onClick={handleOpenSetupModal}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <QrCode size={16} />
                Enable 2FA Protection
              </button>
            ) : (
              <button 
                onClick={() => {
                  setDisableError('');
                  setDisablePassword('');
                  setDisableCode('');
                  setShowDisableModal(true);
                }}
                className="btn btn-secondary"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.5rem 1rem', fontSize: '0.88rem' }}
              >
                Disable 2FA
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Organization Details Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="var(--primary)" />
            <h2 className="card-title">Tenant Organization Context</h2>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Organization Name</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>{organization?.name}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>URL Slug</div>
            <div style={{ fontSize: '0.95rem', fontFamily: 'monospace', color: 'var(--primary)', marginTop: '0.2rem' }}>{organization?.slug}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Subscription Plan</div>
            <div style={{ marginTop: '0.2rem' }}>
              <span className="badge badge-success">{organization?.plan?.toUpperCase()}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Partition ID</div>
            <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{organization?.id || user?.organizationId}</div>
          </div>
        </div>
      </div>

      {/* Security Telemetry & Session Management */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--primary)" />
            <h2 className="card-title">Security & Session State</h2>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Authentication Transport</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cryptographic JWT delivered via secure httpOnly cookie</div>
            </div>
            <span className="badge badge-success">ACTIVE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Multi-Factor Authentication (MFA)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AES-256-GCM encrypted TOTP secret storage</div>
            </div>
            <span className={`badge ${user?.mfaEnabled ? 'badge-success' : 'badge-warning'}`}>
              {user?.mfaEnabled ? 'ENABLED' : 'OPTIONAL'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Brute-Force Account Protection</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>5-attempt limit with 15-minute temporary lockout</div>
            </div>
            <span className="badge badge-success">ENFORCED</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--danger)' }}>Terminate Active Session</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Invalidates tokenVersion in database and clears cookies</div>
            </div>
            <button onClick={handleLogout} className="btn btn-danger" style={{ fontSize: '0.85rem' }}>
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: MFA SETUP & ENROLLMENT                                          */}
      {/* ========================================================================= */}
      {showSetupModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Configure Two-Factor Auth</h3>
              </div>
              <button 
                onClick={() => setShowSetupModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {setupError && (
              <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                <AlertTriangle size={18} />
                <div>{setupError}</div>
              </div>
            )}

            {isSettingUp && !setupData ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 1rem' }}></div>
                <div style={{ color: 'var(--text-muted)' }}>Generating cryptographic MFA secret...</div>
              </div>
            ) : setupData ? (
              <form onSubmit={handleConfirmMfaSetup}>
                {/* Step 1: Scan QR Code */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    Step 1: Scan QR Code
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Open Google Authenticator, Authy, or 1Password and scan the barcode below:
                  </div>

                  <div style={{
                    backgroundColor: '#fff',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '0.75rem'
                  }}>
                    <img 
                      src={setupData.qrCodeDataUrl} 
                      alt="TOTP QR Code" 
                      style={{ width: '190px', height: '190px', display: 'block' }} 
                    />
                  </div>

                  {/* Manual Secret Key Fallback */}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Can't scan? Enter this secret manually in your app:
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: '1px solid var(--border-light)'
                  }}>
                    <span>{setupData.secret}</span>
                    <button
                      type="button"
                      onClick={() => handleCopySecret(setupData.secret)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                    >
                      {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                      {copiedSecret ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Step 2: Verification Code */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" htmlFor="verifyCode">
                    Step 2: Enter 6-Digit Code from Authenticator
                  </label>
                  <input
                    id="verifyCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    className="form-input"
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    disabled={isSettingUp}
                    style={{
                      fontSize: '1.4rem',
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      fontWeight: 700
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowSetupModal(false)}
                    className="btn btn-secondary"
                    disabled={isSettingUp}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSettingUp || verifyCode.length !== 6}
                  >
                    {isSettingUp ? 'Verifying...' : 'Activate 2FA'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MFA DISABLE CONFIRMATION                                        */}
      {/* ========================================================================= */}
      {showDisableModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={22} color="var(--danger)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Disable Two-Factor Auth</h3>
              </div>
              <button 
                onClick={() => setShowDisableModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Disabling 2FA reduces your account security. To proceed, please confirm your identity with your account password and a current 6-digit TOTP code.
            </p>

            {disableError && (
              <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                <AlertTriangle size={18} />
                <div>{disableError}</div>
              </div>
            )}

            <form onSubmit={handleConfirmMfaDisable}>
              <div className="form-group">
                <label className="form-label" htmlFor="disablePassword">Account Password</label>
                <input
                  id="disablePassword"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Enter your current password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  disabled={isDisabling}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="disableCode">Current 6-Digit TOTP Code</label>
                <input
                  id="disableCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  className="form-input"
                  placeholder="000000"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                  disabled={isDisabling}
                  style={{
                    fontSize: '1.2rem',
                    letterSpacing: '0.25em',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 700
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDisableModal(false)}
                  className="btn btn-secondary"
                  disabled={isDisabling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={isDisabling || !disablePassword || disableCode.length !== 6}
                >
                  {isDisabling ? 'Disabling...' : 'Confirm Disablement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
