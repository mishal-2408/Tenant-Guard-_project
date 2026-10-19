import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Lock, AlertCircle, CheckCircle, Copy, Check, X, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import teamApi from '../../api/team.api.js';
import invitationsApi from '../../api/invitations.api.js';

export const Team = () => {
  const { user, organization } = useAuth();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const isOrgAdmin = user?.role === 'org_admin';

  const roleDefinitions = [
    { role: 'Organization Admin', key: 'org_admin', badge: 'badge-primary', description: 'Full administrative rights across users, workspace settings, audit logs, and data.' },
    { role: 'Project Manager', key: 'project_manager', badge: 'badge-warning', description: 'Can create and modify projects, organize workflows, and assign team tasks.' },
    { role: 'Member', key: 'member', badge: 'badge-success', description: 'Collaborates on workspace projects, creates tasks, and updates task progress.' },
    { role: 'Viewer', key: 'viewer', badge: 'badge-secondary', description: 'Strictly read-only access to approved workspace projects and tasks.' }
  ];

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      const membersRes = await teamApi.listMembers({ limit: 100 });
      setMembers(membersRes.data || []);

      if (isOrgAdmin) {
        const invRes = await invitationsApi.list({ limit: 50 });
        setInvitations(invRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load team directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [isOrgAdmin]);

  const handleRoleChange = async (memberId, newRole) => {
    try {
      setError(null);
      await teamApi.updateRole(memberId, newRole);
      setSuccessMsg('Member role updated successfully. Active user sessions will require re-authentication.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchTeamData();
    } catch (err) {
      setError(err.message || 'Failed to update member role.');
    }
  };

  const handleStatusToggle = async (member) => {
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    const actionLabel = newStatus === 'suspended' ? 'deactivate' : 'reactivate';

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${member.firstName} ${member.lastName}?`)) {
      return;
    }

    try {
      setError(null);
      await teamApi.updateStatus(member._id, newStatus);
      setSuccessMsg(`Member status set to ${newStatus}. Any active sessions have been invalidated.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchTeamData();
    } catch (err) {
      setError(err.message || 'Failed to update member status.');
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    try {
      const res = await invitationsApi.create({
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole
      });

      const inviteUrl = `${window.location.origin}/accept-invitation?token=${res.data.rawToken}`;
      setGeneratedInviteLink(inviteUrl);
      setSuccessMsg('Invitation created successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchTeamData();
    } catch (err) {
      setInviteError(err.message || 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (invitationId) => {
    if (!window.confirm('Revoke this invitation? The invitee will no longer be able to use this token.')) return;
    try {
      await invitationsApi.revoke(invitationId);
      setSuccessMsg('Invitation revoked.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchTeamData();
    } catch (err) {
      setError(err.message || 'Failed to revoke invitation.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('member');
    setGeneratedInviteLink(null);
    setInviteError(null);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Team Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Members, roles, and invitation workflows partitioned for <strong>{organization?.name}</strong>
          </p>
        </div>

        {isOrgAdmin ? (
          <button onClick={() => setShowInviteModal(true)} className="btn btn-primary" id="btn-invite-member">
            <UserPlus size={16} />
            Invite Member
          </button>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={14} /> Member invitations managed by Organization Admins
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Active Members Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Active Workspace Members ({members.length})</h2>
          </div>
          <button onClick={fetchTeamData} className="btn-icon" title="Refresh list">
            <RefreshCw size={15} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading member directory...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Member</th>
                  <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Account Status</th>
                  <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isSelf = m._id === user?.id || m._id === user?._id;

                  return (
                    <tr key={m._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            {m.firstName?.[0] || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {m.firstName} {m.lastName} {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>(You)</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        {isOrgAdmin && !isSelf ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m._id, e.target.value)}
                            className="form-input"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.82rem', width: 'auto' }}
                          >
                            <option value="org_admin">Organization Admin</option>
                            <option value="project_manager">Project Manager</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className={`badge ${m.role === 'org_admin' ? 'badge-primary' : m.role === 'project_manager' ? 'badge-warning' : m.role === 'member' ? 'badge-success' : 'badge-secondary'}`}>
                            {m.role?.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                          {m.status}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        {isOrgAdmin && !isSelf ? (
                          <button
                            onClick={() => handleStatusToggle(m)}
                            className={`btn ${m.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            {m.status === 'active' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                            {isSelf ? 'Current Session' : 'Protected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations Section (Org Admin Only) */}
      {isOrgAdmin && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-light)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Invitations Log ({invitations.length})</h2>
          </div>

          {invitations.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No outstanding or historical invitations for this workspace.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Invitee Email</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Expires At</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 500 }}>
                        {inv.email}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span className="badge badge-secondary">{inv.role}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span className={`badge ${inv.status === 'accepted' ? 'badge-success' : inv.status === 'pending' ? 'badge-primary' : inv.status === 'revoked' ? 'badge-danger' : 'badge-secondary'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>
                        {new Date(inv.expiresAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => handleRevokeInvite(inv._id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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

      {/* INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Invite Member to Workspace</h2>
              <button onClick={closeInviteModal} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {inviteError && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{inviteError}</span>
              </div>
            )}

            {!generatedInviteLink ? (
              <form onSubmit={handleCreateInvite}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Invitee Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@domain.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Intended Organization Role *</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="form-input"
                  >
                    <option value="viewer">Viewer (Read-only)</option>
                    <option value="member">Member (Collaborator)</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="org_admin">Organization Administrator</option>
                  </select>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  Security rule: Invitations expire automatically after 24 hours. The raw token is hashed using SHA-256 before storage in the database.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={closeInviteModal} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={inviting} className="btn btn-primary" id="btn-submit-invite">
                    {inviting ? 'Generating...' : 'Create Invitation'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                  <CheckCircle size={18} />
                  <span>Single-use invitation token created successfully!</span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                  In this local environment, email delivery is not configured. Copy this direct invitation acceptance URL to test onboarding as the invited user:
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteLink}
                    className="form-input"
                    style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}
                  />
                  <button
                    onClick={() => copyToClipboard(generatedInviteLink)}
                    className="btn btn-primary"
                    style={{ flexShrink: 0 }}
                  >
                    {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={closeInviteModal} className="btn btn-secondary">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
