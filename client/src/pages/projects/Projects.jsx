import React, { useState } from 'react';
import { FolderKanban, Plus, Search, Filter, Info, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Projects = () => {
  const { user, organization } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Role permissions check (presentation-level guidance)
  const canCreateProject = ['org_admin', 'project_manager'].includes(user?.role);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Projects
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage workspace projects isolated within <strong>{organization?.name}</strong>
          </p>
        </div>

        {canCreateProject ? (
          <button
            onClick={() => alert('Project creation API will be connected in Stage 5 when Project CRUD backend routes are implemented.')}
            className="btn btn-primary"
          >
            <Plus size={16} />
            New Project
          </button>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={14} /> Creation restricted to Project Managers & Admins
          </div>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search projects by name or key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button className="btn btn-secondary">
            <Filter size={16} />
            All Statuses
          </button>
        </div>
      </div>

      {/* Notice Banner: Stage 5 Roadmap */}
      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 600 }}>Stage 4 Frontend Scaffold Active</div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', lineHeight: 1.5 }}>
            Live Project CRUD endpoints (create, update, delete, unique project key per organization) are scheduled for implementation in <strong>Stage 5</strong>. No fake or unbacked database records are shown.
          </div>
        </div>
      </div>

      {/* Empty State Card */}
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <FolderKanban size={28} />
        </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          No Projects Active Yet
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
          This workspace is partitioned and ready for project records once Stage 5 domain CRUD services are enabled.
        </p>
      </div>
    </div>
  );
};

export default Projects;
