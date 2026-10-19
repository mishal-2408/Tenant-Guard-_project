import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Search, Filter, Lock, Trash2, Edit2, X, AlertCircle, CheckCircle, Calendar, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import projectsApi from '../../api/projects.api.js';
import teamApi from '../../api/team.api.js';

export const Projects = () => {
  const { user, organization } = useAuth();
  const [projects, setProjects] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    status: 'planning',
    members: []
  });

  const canManageProjects = ['org_admin', 'project_manager'].includes(user?.role);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await projectsApi.list({ search: searchQuery, status: statusFilter });
      setProjects(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await teamApi.listMembers({ status: 'active' });
      setMembersList(res.data || []);
    } catch {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchMembers();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      key: '',
      description: '',
      status: 'planning',
      members: []
    });
    setModalError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      members: project.members?.map((m) => (typeof m === 'object' ? m._id : m)) || []
    });
    setModalError(null);
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await projectsApi.create({
        ...formData,
        key: formData.key.toUpperCase()
      });
      setShowCreateModal(false);
      setSuccessMsg('Project created successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchProjects();
    } catch (err) {
      setModalError(err.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await projectsApi.update(selectedProject._id, formData);
      setShowEditModal(false);
      setSuccessMsg('Project updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchProjects();
    } catch (err) {
      setModalError(err.message || 'Failed to update project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Are you sure you want to delete "${project.name}" (${project.key})? All associated tasks will also be deleted.`)) {
      return;
    }
    try {
      await projectsApi.delete(project._id);
      setSuccessMsg(`Project "${project.name}" deleted.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchProjects();
    } catch (err) {
      setError(err.message || 'Failed to delete project.');
    }
  };

  const toggleMemberSelection = (memberId) => {
    setFormData((prev) => {
      const exists = prev.members.includes(memberId);
      return {
        ...prev,
        members: exists ? prev.members.filter((id) => id !== memberId) : [...prev.members, memberId]
      };
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'planning':
        return 'badge-primary';
      case 'on_hold':
        return 'badge-warning';
      case 'completed':
        return 'badge-secondary';
      case 'archived':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Projects
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Workspaces and project initiatives strictly partitioned under <strong>{organization?.name}</strong>
          </p>
        </div>

        {canManageProjects ? (
          <button onClick={openCreateModal} className="btn btn-primary" id="btn-new-project">
            <Plus size={16} />
            New Project
          </button>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={14} /> Creation restricted to Project Managers & Admins
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

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            Filter
          </button>
        </form>
      </div>

      {/* Projects Grid / List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading workspace projects...</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <FolderKanban size={28} />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No Projects Found
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
            {searchQuery || statusFilter !== 'all'
              ? 'No projects matched the selected filters. Try clearing your search.'
              : 'Get started by creating your first project for this organization.'}
          </p>
          {canManageProjects && !searchQuery && (
            <button onClick={openCreateModal} className="btn btn-primary">
              <Plus size={16} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {projects.map((proj) => (
            <div key={proj._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-primary" style={{ fontWeight: 700, letterSpacing: '0.04em' }}>
                      {proj.key}
                    </span>
                    <span className={`badge ${getStatusBadgeClass(proj.status)}`}>
                      {proj.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {canManageProjects && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => openEditModal(proj)}
                        className="btn-icon"
                        title="Edit Project"
                        style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(proj)}
                        className="btn-icon"
                        title="Delete Project"
                        style={{ padding: '0.35rem', color: 'var(--danger)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  {proj.name}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.25rem', minHeight: '38px' }}>
                  {proj.description || <em style={{ color: 'var(--text-subtle)' }}>No description provided.</em>}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Users size={14} />
                  <span>{proj.members?.length || 0} members</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} />
                  <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Create New Project</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Identity Management System"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Project Key * (Unique prefix for tasks)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. IDM"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                  className="form-input"
                  style={{ textTransform: 'uppercase' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.25rem', display: 'block' }}>
                  2–10 uppercase letters or numbers (e.g. CORE, SEC, APP)
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the scope and objective..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Initial Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="form-input"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {membersList.length > 0 && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Assign Team Members</label>
                  <div style={{ maxHeight: '130px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                    {membersList.map((m) => (
                      <label key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={formData.members.includes(m._id)}
                          onChange={() => toggleMemberSelection(m._id)}
                        />
                        <span>{m.firstName} {m.lastName} ({m.email})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" id="btn-submit-project">
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {showEditModal && selectedProject && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Edit Project ({selectedProject.key})</h2>
              <button onClick={() => setShowEditModal(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="form-input"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {membersList.length > 0 && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Assigned Members</label>
                  <div style={{ maxHeight: '130px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                    {membersList.map((m) => (
                      <label key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={formData.members.includes(m._id)}
                          onChange={() => toggleMemberSelection(m._id)}
                        />
                        <span>{m.firstName} {m.lastName} ({m.email})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
