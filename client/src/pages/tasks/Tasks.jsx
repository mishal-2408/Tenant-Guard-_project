import React from 'react';
import { CheckSquare, Plus, Filter, Info, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Tasks = () => {
  const { user, organization } = useAuth();

  const canCreateTask = ['org_admin', 'project_manager', 'member'].includes(user?.role);

  const columns = [
    { title: 'To Do', count: 0, color: 'var(--text-muted)' },
    { title: 'In Progress', count: 0, color: 'var(--primary)' },
    { title: 'In Review', count: 0, color: 'var(--warning)' },
    { title: 'Done', count: 0, color: 'var(--success)' }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Tasks
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Action items and Kanban task flow for <strong>{organization?.name}</strong>
          </p>
        </div>

        {canCreateTask ? (
          <button
            onClick={() => alert('Task creation API will be connected in Stage 5 when Task CRUD backend routes are implemented.')}
            className="btn btn-primary"
          >
            <Plus size={16} />
            New Task
          </button>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={14} /> View-only role active
          </div>
        )}
      </div>

      {/* Notice Banner */}
      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 600 }}>Stage 4 Frontend Scaffold Active</div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', lineHeight: 1.5 }}>
            Task state management, assignee routing, priority tags, and Kanban re-ordering endpoints are scheduled for <strong>Stage 5</strong>. No unbacked mock tasks are shown.
          </div>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {columns.map((col) => (
          <div key={col.title} className="card" style={{ padding: '1rem', backgroundColor: 'var(--bg-surface-hover)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }}></div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{col.title}</span>
              </div>
              <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>{col.count}</span>
            </div>

            <div style={{
              minHeight: '180px',
              border: '2px dashed var(--border-light)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-subtle)',
              fontSize: '0.85rem',
              textAlign: 'center',
              padding: '1rem'
            }}>
              No tasks in {col.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tasks;
