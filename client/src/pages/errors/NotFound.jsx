import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '1.5rem' }}>
        <FileQuestion size={36} />
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
        404 — Page Not Found
      </h1>

      <p style={{ color: 'var(--text-muted)', maxWidth: '480px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        The page you requested does not exist or has been moved. Check the URL or navigate back to your workspace.
      </p>

      <Link to="/dashboard" className="btn btn-primary">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
