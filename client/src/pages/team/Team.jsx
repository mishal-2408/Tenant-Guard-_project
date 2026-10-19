import React from 'react';
import { Users, UserPlus, Shield, Info, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Team = () => {
  const { user, organization } = useAuth();

  const isOrgAdmin = user?.role === 'org_admin';

  const roleDefinitions = [
    { role: 'Organization Admin', key: 'org_admin', badge: 'badge-primary', description: 'Full administrative rights across users, workspace settings, audit logs, and data.' },
    { role: 'Project Manager', key: 'project_manager', badge: 'badge-warning', description: 'Can create and modify projects, organize workflows, and assign team tasks.' },
    { role: 'Member', key: 'member', badge: 'badge-success', description: 'Collaborates on workspace projects, creates tasks, and updates task progress.' },
    { role: 'Viewer', key: 'viewer', badge: 'badge-secondary', description: 'Strictly read-only access to approved workspace projects and tasks.' }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Team Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Members and role assignments for <strong>{organization?.name}</strong>
          </p>
        </div>

        {isOrgAdmin ? (
          <button
            onClick={() => alert('The invitation dispatch API and token verification flow are scheduled for Stage 5.')}
            className="btn btn-primary"
          >
            <UserPlus size={16} />
            Invite Member
          </button>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={14} /> Member invitations managed by Organization Admins
          </div>
        )}
      </div>

      {/* Notice Banner */}
      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 600 }}>Active Member Directory</div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', lineHeight: 1.5 }}>
            Displays currently verified session user. Team invitation generation, token expiry, and member role reassignment endpoints belong to <strong>Stage 5</strong>.
          </div>
        </div>
      </div>

      {/* Active Members Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-light)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Current Workspace Members</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Member</th>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Organization</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {user?.firstName?.[0] || 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {user?.firstName} {user?.lastName} <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>(You)</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {user?.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem 1.25rem' }}>
                  <span className={`badge ${user?.role === 'org_admin' ? 'badge-primary' : 'badge-success'}`}>
                    {user?.role?.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.25rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontWeight: 500, fontSize: '0.82rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></div>
                    Active Session
                  </span>
                </td>
                <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                  {organization?.name}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Definitions Guide */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--primary)" />
            <h2 className="card-title">TenantGuard RBAC Permission Matrix Guide</h2>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {roleDefinitions.map((item) => (
            <div key={item.key} style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.role}</span>
                <span className={`badge ${item.badge}`}>{item.key}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Team;
