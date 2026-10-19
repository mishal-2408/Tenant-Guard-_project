import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, CheckCircle, Lock, User, ArrowRight } from 'lucide-react';
import invitationsApi from '../../api/invitations.api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const [verifying, setVerifying] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setVerifyError('No invitation token was provided in the URL.');
      return;
    }

    const verifyToken = async () => {
      try {
        setVerifying(true);
        setVerifyError(null);
        const res = await invitationsApi.verify(token);
        setInvitationData(res.data);
      } catch (err) {
        setVerifyError(err.message || 'Invitation is invalid, expired, or has already been used.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await invitationsApi.accept({
        token,
        firstName,
        lastName,
        password
      });

      setAcceptedSuccess(true);
      // Refresh session in AuthContext so user is authenticated
      if (checkAuth) {
        await checkAuth();
      }

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setSubmitError(err.message || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', padding: '1.5rem' }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem 2rem', boxShadow: 'var(--shadow-lg)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--primary)', color: 'var(--text-inverse)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: 'var(--shadow-md)' }}>
            <ShieldCheck size={26} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Join Organization
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            TenantGuard Secure Onboarding
          </p>
        </div>

        {verifying ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            Verifying invitation token security hash...
          </div>
        ) : verifyError ? (
          <div>
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{verifyError}</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Invitations expire after 24 hours and can only be accepted once. Please request a new invitation from your workspace administrator.
            </p>
            <div style={{ textAlign: 'center' }}>
              <Link to="/login" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                Return to Login
              </Link>
            </div>
          </div>
        ) : acceptedSuccess ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle size={28} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Account Activated!
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Your membership in <strong>{invitationData?.organizationName}</strong> is active. Redirecting to your workspace dashboard...
            </p>
          </div>
        ) : (
          <div>
            {/* Invitation Details Banner */}
            <div style={{ backgroundColor: 'var(--bg-surface-hover)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Organization:</span>
                <strong style={{ color: 'var(--text-main)' }}>{invitationData?.organizationName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <strong style={{ color: 'var(--text-main)' }}>{invitationData?.email}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Role:</span>
                <span className="badge badge-primary">{invitationData?.role?.toUpperCase()}</span>
              </div>
            </div>

            {submitError && (
              <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={16} />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Alex"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Taylor"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Create Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                id="btn-accept-invitation"
              >
                {submitting ? 'Activating Account...' : 'Accept Invitation & Join Workspace'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;
