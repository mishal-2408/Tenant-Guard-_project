import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Search, Filter, Lock, Trash2, Edit2, X, AlertCircle, CheckCircle, Calendar, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import tasksApi from '../../api/tasks.api.js';
import projectsApi from '../../api/projects.api.js';
import teamApi from '../../api/team.api.js';

export const Tasks = () => {
  const { user, organization } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assignedTo: '',
    dueDate: ''
  });

  const canCreateTask = ['org_admin', 'project_manager', 'member'].includes(user?.role);
  const canDeleteTask = ['org_admin', 'project_manager'].includes(user?.role);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedProjectId !== 'all') params.projectId = selectedProjectId;
      if (selectedPriority !== 'all') params.priority = selectedPriority;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await tasksApi.list(params);
      setTasks(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [projRes, teamRes] = await Promise.all([
        projectsApi.list({ limit: 100 }),
        teamApi.listMembers({ status: 'active', limit: 100 })
      ]);
      setProjectsList(projRes.data || []);
      setMembersList(teamRes.data || []);
    } catch {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [selectedProjectId, selectedPriority]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const openCreateModal = () => {
    setFormData({
      projectId: projectsList[0]?._id || '',
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      assignedTo: '',
      dueDate: ''
    });
    setModalError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setFormData({
      projectId: typeof task.projectId === 'object' ? task.projectId?._id : task.projectId,
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assignedTo: typeof task.assignedTo === 'object' ? task.assignedTo?._id || '' : task.assignedTo || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : ''
    });
    setModalError(null);
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId) {
      setModalError('Please select a parent project.');
      return;
    }
    setSubmitting(true);
    setModalError(null);
    try {
      const payload = {
        projectId: formData.projectId,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        assignedTo: formData.assignedTo || null,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      };
      await tasksApi.create(payload);
      setShowCreateModal(false);
      setSuccessMsg('Task created successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchTasks();
    } catch (err) {
      setModalError(err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        assignedTo: formData.assignedTo || null,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      };
      await tasksApi.update(selectedTask._id, payload);
      setShowEditModal(false);
      setSuccessMsg('Task updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchTasks();
    } catch (err) {
      setModalError(err.message || 'Failed to update task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (task, newStatus) => {
    try {
      await tasksApi.update(task._id, { status: newStatus });
      fetchTasks();
    } catch (err) {
      setError(err.message || 'Failed to update task status.');
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await tasksApi.delete(task._id);
      setSuccessMsg('Task deleted successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchTasks();
    } catch (err) {
      setError(err.message || 'Failed to delete task.');
    }
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: 'var(--text-muted)' },
    { id: 'in_progress', title: 'In Progress', color: 'var(--primary)' },
    { id: 'in_review', title: 'In Review', color: 'var(--warning)' },
    { id: 'done', title: 'Done', color: 'var(--success)' }
  ];

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'badge-danger';
      case 'high':
        return 'badge-warning';
      case 'medium':
        return 'badge-primary';
      case 'low':
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
            Tasks
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Multi-tenant task execution workflow for <strong>{organization?.name}</strong>
          </p>
        </div>

        {canCreateTask ? (
          <button onClick={openCreateModal} className="btn btn-primary" id="btn-new-task">
            <Plus size={16} />
            New Task
          </button>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={14} /> View-only role active
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
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="form-input"
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="all">All Projects</option>
              {projectsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.key} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="form-input"
              style={{ width: 'auto', minWidth: '130px' }}
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            Filter
          </button>
        </form>
      </div>

      {/* Kanban Board Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ color: 'var(--text-muted)' }}>Loading workspace tasks...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          {columns.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="card"
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-surface-hover)',
                  minHeight: '380px'
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{col.title}</span>
                  </div>
                  <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Task Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {columnTasks.length === 0 ? (
                    <div
                      style={{
                        minHeight: '120px',
                        border: '2px dashed var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-subtle)',
                        fontSize: '0.82rem',
                        textAlign: 'center',
                        padding: '1rem'
                      }}
                    >
                      No tasks in {col.title}
                    </div>
                  ) : (
                    columnTasks.map((t) => {
                      const projKey = t.projectId?.key || 'TASK';
                      const taskRef = `${projKey}-${t.taskNumber}`;

                      return (
                        <div
                          key={t._id}
                          className="card"
                          style={{
                            padding: '0.85rem',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-light)',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                              {taskRef}
                            </span>
                            <span className={`badge ${getPriorityBadgeClass(t.priority)}`} style={{ fontSize: '0.7rem' }}>
                              {t.priority}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                            {t.title}
                          </h4>

                          {t.description && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '0.65rem' }}>
                              {t.description.length > 90 ? `${t.description.substring(0, 90)}...` : t.description}
                            </p>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '0.6rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <User size={12} />
                              <span>{t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName[0]}.` : 'Unassigned'}</span>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              {canCreateTask && (
                                <button
                                  onClick={() => openEditModal(t)}
                                  className="btn-icon"
                                  title="Edit Task"
                                  style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                                >
                                  <Edit2 size={13} />
                                </button>
                              )}
                              {canDeleteTask && (
                                <button
                                  onClick={() => handleDeleteTask(t)}
                                  className="btn-icon"
                                  title="Delete Task"
                                  style={{ padding: '0.2rem', color: 'var(--danger)' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick Status Shift */}
                          {canCreateTask && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              {columns
                                .filter((c) => c.id !== t.status)
                                .map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => handleQuickStatusChange(t, c.id)}
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: 'var(--radius-sm)',
                                      backgroundColor: 'var(--bg-surface-hover)',
                                      border: '1px solid var(--border-light)',
                                      color: 'var(--text-muted)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.2rem'
                                    }}
                                  >
                                    <ArrowRight size={10} /> {c.title}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Create New Task</h2>
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
                <label className="form-label">Parent Project *</label>
                <select
                  required
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="form-input"
                >
                  <option value="">Select Parent Project</option>
                  {projectsList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.key} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement tenant isolation test probes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  placeholder="Task details and acceptance criteria..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="form-input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="form-input"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Unassigned</option>
                    {membersList.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" id="btn-submit-task">
                  {submitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {showEditModal && selectedTask && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Edit Task</h2>
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
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="form-input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="form-input"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Unassigned</option>
                    {membersList.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

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

export default Tasks;
