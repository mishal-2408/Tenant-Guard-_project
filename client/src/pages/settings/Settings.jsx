import React, { useState } from 'react';
import { User, Building2, Shield, Lock, LogOut, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export const Settings = () => {
  const { user, organization, logout, checkSession } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Profile & Security Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Verified identity parameters and tenant security configuration
        </p>
      </div>

      {refreshSuccess && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <div>Authentication session successfully re-validated with backend.</div>
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
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTP enrollment scheduled for Stage 5/6 Security Center</div>
            </div>
            <span className="badge badge-warning">{user?.mfaEnabled ? 'ENABLED' : 'OPTIONAL'}</span>
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
    </div>
  );
};

export default Settings;
