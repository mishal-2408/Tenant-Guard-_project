import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const AccessDenied = ({ requiredRoles = [], userRole = '' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', marginBottom: '1.5rem' }}>
        <ShieldAlert size={36} />
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
        403 — Access Denied
      </h1>

      <p style={{ color: 'var(--text-muted)', maxWidth: '480px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Your verified role <span className="badge badge-warning">{userRole || 'Viewer'}</span> does not have authorization to access this workspace section.
        {requiredRoles.length > 0 && (
          <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Required role(s): {requiredRoles.join(', ')}
          </span>
        )}
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/dashboard" className="btn btn-primary">
          <ArrowLeft size={16} />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default AccessDenied;
