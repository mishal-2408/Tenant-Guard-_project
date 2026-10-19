import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  ShieldCheck, 
  Users, 
  FolderKanban, 
  CheckSquare, 
  Activity, 
  Lock, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { healthApi, authApi } from '../../api/auth.api.js';

export const Dashboard = () => {
  const { user, organization } = useAuth();
  const [healthStatus, setHealthStatus] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isTestingRbac, setIsTestingRbac] = useState(false);

  useEffect(() => {
    // Fetch live system health from backend
    healthApi.getHealth()
      .then((res) => {
        if (res?.success) setHealthStatus(res.data);
      })
      .catch((err) => {
        setHealthStatus({ status: 'offline', error: err.message });
      });
  }, []);

  // Live RBAC verification probe
  const runRbacTest = async (testType) => {
    setIsTestingRbac(true);
    setTestResult(null);
    try {
      let res;
      if (testType === 'admin') {
        res = await authApi.testAdminOnly();
      } else if (testType === 'member') {
        res = await authApi.testMemberAction();
      } else {
        res = await authApi.testViewerAllowed();
      }
      setTestResult({ success: true, message: res.message, type: testType });
    } catch (err) {
      setTestResult({ 
        success: false, 
        code: err.code, 
        message: err.message, 
        status: err.status,
        type: testType 
      });
    } finally {
      setIsTestingRbac(false);
    }
  };

  const formatRole = (role) => {
    switch (role) {
      case 'org_admin': return 'Organization Admin';
      case 'project_manager': return 'Project Manager';
      case 'viewer': return 'Viewer';
      default: return 'Member';
    }
  };

  return (
    <div>
      {/* Top Welcome Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Welcome back, {user?.firstName}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Workspace overview for <strong style={{ color: 'var(--text-main)' }}>{organization?.name}</strong>
        </p>
      </div>

      {/* Grid: Tenant Status & System Health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Workspace Card */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Active Workspace
            </span>
            <Building2 size={20} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            {organization?.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Slug:</span>
            <code style={{ backgroundColor: 'var(--bg-surface-hover)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>
              {organization?.slug}
            </code>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="badge badge-primary">{organization?.plan?.toUpperCase()} PLAN</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
              <Lock size={12} /> Isolated Tenant
            </span>
          </div>
        </div>

        {/* User Identity & Role Card */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Verified Identity
            </span>
            <ShieldCheck size={20} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            {user?.firstName} {user?.lastName}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {user?.email}
          </div>
          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="badge badge-success">{formatRole(user?.role)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
              Session Validated
            </span>
          </div>
        </div>

        {/* Backend API Health Status Card */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              API Health Telemetry
            </span>
            <Activity size={20} color={healthStatus?.status === 'healthy' ? 'var(--success)' : 'var(--warning)'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              backgroundColor: healthStatus?.status === 'healthy' ? 'var(--success)' : 'var(--danger)' 
            }}></div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'capitalize' }}>
              {healthStatus ? healthStatus.status : 'Checking...'}
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div>Database: <strong>{healthStatus?.database || 'active'}</strong></div>
            <div>Uptime: <strong>{healthStatus ? `${healthStatus.uptimeSeconds}s` : '—'}</strong></div>
          </div>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            Endpoint: GET /api/health
          </div>
        </div>
      </div>

      {/* Domain Entities Status Section (Explains Stage 5 Progression) */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Workspace Data Modules
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Projects Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FolderKanban size={20} color="var(--primary)" />
                  <span style={{ fontWeight: 600 }}>Projects</span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>STAGE 5 PENDING</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Project creation, key assignment, and multi-tenant workspace collaboration endpoints.
              </p>
            </div>
            <Link to="/projects" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
              View Projects UI <ArrowRight size={14} />
            </Link>
          </div>

          {/* Tasks Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckSquare size={20} color="var(--primary)" />
                  <span style={{ fontWeight: 600 }}>Tasks</span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>STAGE 5 PENDING</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Kanban workflows, status columns, priority tracking, and assignee assignment.
              </p>
            </div>
            <Link to="/tasks" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
              View Tasks UI <ArrowRight size={14} />
            </Link>
          </div>

          {/* Team Members Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="var(--primary)" />
                  <span style={{ fontWeight: 600 }}>Team Directory</span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>STAGE 5 PENDING</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Member invitations, token generation, and organization role modifications.
              </p>
            </div>
            <Link to="/team" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
              View Team UI <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Live RBAC Test Center */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Live RBAC Permission Probe</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Test your verified backend role (<span style={{ fontWeight: 600 }}>{user?.role}</span>) against backend authorization gates.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => runRbacTest('admin')}
            disabled={isTestingRbac}
            className="btn btn-secondary"
          >
            Probe Admin-Only Endpoint
          </button>
          <button
            onClick={() => runRbacTest('member')}
            disabled={isTestingRbac}
            className="btn btn-secondary"
          >
            Probe Member-Action Endpoint
          </button>
          <button
            onClick={() => runRbacTest('viewer')}
            disabled={isTestingRbac}
            className="btn btn-secondary"
          >
            Probe Viewer-Allowed Endpoint
          </button>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div className={`alert ${testResult.success ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 0 }}>
            {testResult.success ? (
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div>
              <div style={{ fontWeight: 600 }}>
                {testResult.success ? 'Backend Authorization Granted' : `Denied: ${testResult.status} ${testResult.code || 'Forbidden'}`}
              </div>
              <div style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
                {testResult.message}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
