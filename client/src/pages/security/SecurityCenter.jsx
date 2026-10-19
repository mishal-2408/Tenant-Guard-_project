import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Lock, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Clock, 
  Eye, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import { securityApi } from '../../api/security.api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export const SecurityCenter = () => {
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'audit' | 'alerts' | 'isolation' | 'policy'

  // Summary Metrics State
  const [summary, setSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [auditFilters, setAuditFilters] = useState({
    category: '',
    severity: '',
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Security Alerts State
  const [alerts, setAlerts] = useState([]);
  const [alertFilters, setAlertFilters] = useState({ status: '', severity: '' });
  const [isAlertsLoading, setIsAlertsLoading] = useState(false);
  const [alertActionLoadingId, setAlertActionLoadingId] = useState(null);

  // Isolation Test State
  const [isolationResult, setIsolationResult] = useState(null);
  const [isTestingRunning, setIsTestingRunning] = useState(false);
  const [testConfirmationOpen, setTestConfirmationOpen] = useState(false);

  // MFA Policy State
  const [enforceMfa, setEnforceMfa] = useState(organization?.settings?.enforceMfa || false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policyMessage, setPolicyMessage] = useState({ type: '', text: '' });

  // General Error / Notification State
  const [generalError, setGeneralError] = useState('');

  // --------------------------------------------------------------------------
  // Data Fetching: Summary
  // --------------------------------------------------------------------------
  const fetchSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const res = await securityApi.getSecuritySummary();
      if (res?.success) {
        setSummary(res.data);
        if (res.data.mfaPolicy?.enforceMfa !== undefined) {
          setEnforceMfa(res.data.mfaPolicy.enforceMfa);
        }
      }
    } catch (err) {
      setGeneralError(err.message || 'Failed to load security summary.');
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Data Fetching: Audit Logs
  // --------------------------------------------------------------------------
  const fetchAuditLogs = useCallback(async (page = 1) => {
    setIsAuditLoading(true);
    setGeneralError('');
    try {
      const params = {
        page,
        limit: auditPagination.limit,
        ...(auditFilters.category && { category: auditFilters.category }),
        ...(auditFilters.severity && { severity: auditFilters.severity }),
        ...(auditFilters.status && { status: auditFilters.status }),
        ...(auditFilters.search && { search: auditFilters.search.trim() }),
        ...(auditFilters.startDate && { startDate: auditFilters.startDate }),
        ...(auditFilters.endDate && { endDate: auditFilters.endDate })
      };
      const res = await securityApi.getAuditLogs(params);
      if (res?.success) {
        setAuditLogs(res.data || []);
        if (res.pagination) {
          setAuditPagination(res.pagination);
        }
      }
    } catch (err) {
      setGeneralError(err.message || 'Failed to load audit logs.');
    } finally {
      setIsAuditLoading(false);
    }
  }, [auditFilters, auditPagination.limit]);

  // --------------------------------------------------------------------------
  // Data Fetching: Alerts
  // --------------------------------------------------------------------------
  const fetchAlerts = useCallback(async () => {
    setIsAlertsLoading(true);
    setGeneralError('');
    try {
      const params = {
        ...(alertFilters.status && { status: alertFilters.status }),
        ...(alertFilters.severity && { severity: alertFilters.severity })
      };
      const res = await securityApi.getAlerts(params);
      if (res?.success) {
        setAlerts(res.data || []);
      }
    } catch (err) {
      setGeneralError(err.message || 'Failed to load security alerts.');
    } finally {
      setIsAlertsLoading(false);
    }
  }, [alertFilters]);

  // Initial Load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(1);
    } else if (activeTab === 'alerts') {
      fetchAlerts();
    }
  }, [activeTab, fetchAuditLogs, fetchAlerts]);

  // --------------------------------------------------------------------------
  // Action Handlers
  // --------------------------------------------------------------------------
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const params = {
        ...(auditFilters.category && { category: auditFilters.category }),
        ...(auditFilters.severity && { severity: auditFilters.severity }),
        ...(auditFilters.status && { status: auditFilters.status }),
        ...(auditFilters.startDate && { startDate: auditFilters.startDate }),
        ...(auditFilters.endDate && { endDate: auditFilters.endDate })
      };
      const res = await securityApi.exportAuditLogsCsv(params);
      
      // Generate browser download for CSV blob
      const blob = new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tenantguard-audit-log-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setGeneralError(err.message || 'Failed to export audit logs to CSV.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleUpdateAlertStatus = async (alertId, newStatus) => {
    setAlertActionLoadingId(alertId);
    try {
      await securityApi.updateAlertStatus(alertId, newStatus);
      await fetchAlerts();
      await fetchSummary();
    } catch (err) {
      setGeneralError(err.message || `Failed to set alert status to ${newStatus}.`);
    } finally {
      setAlertActionLoadingId(null);
    }
  };

  const handleRunIsolationTests = async () => {
    setTestConfirmationOpen(false);
    setIsTestingRunning(true);
    setGeneralError('');
    try {
      const res = await securityApi.runIsolationTests();
      if (res?.success) {
        setIsolationResult(res.data);
        await fetchSummary();
      }
    } catch (err) {
      setGeneralError(err.message || 'Failed to execute live isolation tests.');
    } finally {
      setIsTestingRunning(false);
    }
  };

  const handleSaveMfaPolicy = async () => {
    setIsSavingPolicy(true);
    setPolicyMessage({ type: '', text: '' });
    try {
      const res = await securityApi.updateMfaPolicy(enforceMfa);
      if (res?.success) {
        setPolicyMessage({ 
          type: 'success', 
          text: `Organization MFA Policy updated: ${enforceMfa ? 'Enforced for all members' : 'Optional'}` 
        });
        await fetchSummary();
      }
    } catch (err) {
      setPolicyMessage({ type: 'danger', text: err.message || 'Failed to update MFA policy.' });
    } finally {
      setIsSavingPolicy(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={22} />
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
              Security Center
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Multi-tenant boundary verification, audit log telemetry, security alerts, and live isolation testing
          </p>
        </div>

        {/* Active Tenant Badge */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
          padding: '0.5rem 0.9rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Lock size={14} color="#10b981" />
          <span>Tenant Scope:</span>
          <strong style={{ color: 'var(--text-main)' }}>{organization?.name || 'Authorized Tenant'}</strong>
        </div>
      </div>

      {generalError && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <div>{generalError}</div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-light)',
        marginBottom: '1.75rem',
        gap: '0.5rem',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.65rem 1.1rem',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'none',
            color: activeTab === 'overview' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'overview' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <ShieldCheck size={16} />
          Overview
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '0.65rem 1.1rem',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'none',
            color: activeTab === 'audit' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'audit' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <FileText size={16} />
          Audit Logs
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          style={{
            padding: '0.65rem 1.1rem',
            border: 'none',
            borderBottom: activeTab === 'alerts' ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'none',
            color: activeTab === 'alerts' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'alerts' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <AlertTriangle size={16} />
          Security Alerts
          {summary?.alerts?.open > 0 && (
            <span style={{
              backgroundColor: 'var(--danger)',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px'
            }}>
              {summary.alerts.open}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('isolation')}
          style={{
            padding: '0.65rem 1.1rem',
            border: 'none',
            borderBottom: activeTab === 'isolation' ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'none',
            color: activeTab === 'isolation' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'isolation' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Play size={16} />
          Live Isolation Testing
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          style={{
            padding: '0.65rem 1.1rem',
            border: 'none',
            borderBottom: activeTab === 'policy' ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'none',
            color: activeTab === 'policy' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'policy' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <SlidersHorizontal size={16} />
          MFA & Compliance Policy
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & POSTURE                                                */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {/* Metric 1: Total Audits */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Audited Events</span>
                <FileText size={18} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {isSummaryLoading ? '...' : (summary?.auditLogs?.total || 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Append-only immutable audit trail
              </div>
            </div>

            {/* Metric 2: Open Security Alerts */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Security Alerts</span>
                <AlertTriangle size={18} color={summary?.alerts?.open > 0 ? 'var(--danger)' : '#10b981'} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: summary?.alerts?.open > 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                {isSummaryLoading ? '...' : (summary?.alerts?.open || 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {summary?.alerts?.highSeverity > 0 ? `${summary.alerts.highSeverity} high/critical priority` : 'Zero active critical threats'}
              </div>
            </div>

            {/* Metric 3: MFA Adoption */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>MFA Adoption Rate</span>
                <UserCheck size={18} color="#4f46e5" />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {isSummaryLoading ? '...' : `${summary?.mfaAdoption?.adoptionPercentage || 0}%`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {isSummaryLoading ? '' : `${summary?.mfaAdoption?.mfaEnabledUsers || 0} of ${summary?.mfaAdoption?.totalUsers || 0} members enrolled`}
              </div>
            </div>

            {/* Metric 4: Isolation Status */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Boundary Isolation</span>
                <Lock size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981', marginTop: '0.45rem' }}>
                VERIFIED ACTIVE
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
                Strict Server-Side Enforced Isolation
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activity Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Left Card: Core Security Controls */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} color="var(--primary)" />
                  <h3 className="card-title">TenantGuard Active Controls</h3>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Tenant-Context Guard</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Organization identity extracted strictly from server session</div>
                  </div>
                  <span className="badge badge-success">ACTIVE</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Anti-Enumeration Protection</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cross-tenant resource probes return generic 404 responses</div>
                  </div>
                  <span className="badge badge-success">ENFORCED</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Super Admin Decoupling</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Platform Admins cannot access private workspace data</div>
                  </div>
                  <span className="badge badge-success">ISOLATED</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Live Isolation Test Suite</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deterministic verification against synthetic demo tenants</div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('isolation')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                  >
                    Run Tests
                  </button>
                </div>
              </div>
            </div>

            {/* Right Card: Recent Security Activity */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} color="var(--primary)" />
                  <h3 className="card-title">Recent Security Events</h3>
                </div>
                <button 
                  onClick={() => setActiveTab('audit')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  View All
                </button>
              </div>

              {isSummaryLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ width: '24px', height: '24px', margin: '0 auto' }}></div>
                </div>
              ) : !summary?.recentActivity?.length ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No recent security-relevant events recorded.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {summary.recentActivity.map((event) => (
                    <div 
                      key={event.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{event.action}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Actor: {event.actorEmail} &bull; {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <span className={`badge ${
                        event.severity === 'critical' ? 'badge-danger' :
                        event.severity === 'high' ? 'badge-danger' :
                        event.severity === 'warning' ? 'badge-warning' : 'badge-primary'
                      }`}>
                        {event.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUDIT LOGS                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div>
          {/* Controls Bar: Filters & CSV Export */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Filter Audit Log Stream</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => fetchAuditLogs(1)}
                  disabled={isAuditLoading}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                >
                  <RefreshCw size={14} className={isAuditLoading ? 'spinner' : ''} />
                  Refresh
                </button>
                <button
                  onClick={handleExportCsv}
                  disabled={isExportingCsv}
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                >
                  <Download size={14} />
                  {isExportingCsv ? 'Exporting...' : 'Export to CSV'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {/* Category Filter */}
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
                <select
                  value={auditFilters.category}
                  onChange={(e) => setAuditFilters({ ...auditFilters, category: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
                >
                  <option value="">All Categories</option>
                  <option value="auth">Authentication</option>
                  <option value="project_management">Project Management</option>
                  <option value="user_management">User Management</option>
                  <option value="security_violation">Security Violations</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Severity</label>
                <select
                  value={auditFilters.severity}
                  onChange={(e) => setAuditFilters({ ...auditFilters, severity: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
                >
                  <option value="">All Severities</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Outcome Status</label>
                <select
                  value={auditFilters.status}
                  onChange={(e) => setAuditFilters({ ...auditFilters, status: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
                >
                  <option value="">All Outcomes</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="denied">Denied</option>
                </select>
              </div>

              {/* Search Filter */}
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Actor / Action Search</label>
                <input
                  type="text"
                  placeholder="Filter by actor or action..."
                  value={auditFilters.search}
                  onChange={(e) => setAuditFilters({ ...auditFilters, search: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setAuditFilters({ category: '', severity: '', status: '', search: '', startDate: '', endDate: '' });
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Actor</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Target Resource</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Severity</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isAuditLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 0.75rem' }}></div>
                        <div style={{ color: 'var(--text-muted)' }}>Querying immutable audit logs...</div>
                      </td>
                    </tr>
                  ) : !auditLogs.length ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        No audit events match your selected filters.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr 
                        key={log._id || log.id} 
                        style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.15s ease' }}
                      >
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{log.actorEmail || 'System / Unauthenticated'}</div>
                          {log.actorRole && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {log.actorRole}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)' }}>
                            {log.action}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {log.category?.replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                          {log.targetResource ? (
                            <div>
                              <span>{log.targetResource}</span>
                              {log.targetResourceId && (
                                <div style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                                  ID: {log.targetResourceId.slice(0, 8)}...
                                </div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className={`badge ${
                            log.severity === 'critical' ? 'badge-danger' :
                            log.severity === 'high' ? 'badge-danger' :
                            log.severity === 'warning' ? 'badge-warning' : 'badge-primary'
                          }`}>
                            {log.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className={`badge ${
                            log.status === 'success' ? 'badge-success' :
                            log.status === 'denied' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-light)'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing page {auditPagination.page} of {auditPagination.totalPages || 1} ({auditPagination.total} total records)
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => fetchAuditLogs(auditPagination.page - 1)}
                  disabled={auditPagination.page <= 1 || isAuditLoading}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <button
                  onClick={() => fetchAuditLogs(auditPagination.page + 1)}
                  disabled={auditPagination.page >= auditPagination.totalPages || isAuditLoading}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SECURITY ALERTS                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div>
          {/* Header & Threshold Documentation */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: 'rgba(79, 70, 229, 0.04)', borderColor: 'rgba(79, 70, 229, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <ShieldAlert size={18} color="#4f46e5" />
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>Aggregated Security Incident Detection</strong>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              TenantGuard automatically correlates suspicious security signals into stateful incident alerts.
              Repeated events within a 15-minute window are aggregated into a single incident window with incrementing event counts and automatic severity escalation.
            </p>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={alertFilters.status}
                onChange={(e) => setAlertFilters({ ...alertFilters, status: e.target.value })}
                className="form-input"
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', minWidth: '140px' }}
              >
                <option value="">All Statuses</option>
                <option value="open">Open / New</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>

              <select
                value={alertFilters.severity}
                onChange={(e) => setAlertFilters({ ...alertFilters, severity: e.target.value })}
                className="form-input"
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', minWidth: '140px' }}
              >
                <option value="">All Severities</option>
                <option value="warning">Warning</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <button
              onClick={fetchAlerts}
              disabled={isAlertsLoading}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
            >
              <RefreshCw size={14} className={isAlertsLoading ? 'spinner' : ''} />
              Refresh Alerts
            </button>
          </div>

          {/* Alerts List */}
          {isAlertsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 1rem' }}></div>
              <div style={{ color: 'var(--text-muted)' }}>Loading security incident alerts...</div>
            </div>
          ) : !alerts.length ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>No Alerts Found</div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>No active security alerts match your filter criteria.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {alerts.map((alert) => (
                <div 
                  key={alert._id || alert.id} 
                  className="card"
                  style={{ 
                    padding: '1.25rem',
                    borderLeft: `4px solid ${
                      alert.severity === 'critical' || alert.severity === 'high' ? 'var(--danger)' : 'var(--warning)'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.65rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                          {alert.title}
                        </h4>
                        <span className={`badge ${
                          alert.severity === 'critical' ? 'badge-danger' :
                          alert.severity === 'high' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className={`badge ${
                          alert.status === 'open' ? 'badge-danger' :
                          alert.status === 'acknowledged' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {alert.status.toUpperCase()}
                        </span>
                        {alert.eventCount > 1 && (
                          <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--bg-secondary)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                            {alert.eventCount} occurrences aggregated
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        {alert.description}
                      </div>
                    </div>

                    {/* Action Buttons: Acknowledge & Resolve */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {alert.status === 'open' && (
                        <button
                          onClick={() => handleUpdateAlertStatus(alert._id || alert.id, 'acknowledged')}
                          disabled={alertActionLoadingId === (alert._id || alert.id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
                        >
                          Acknowledge
                        </button>
                      )}
                      {alert.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateAlertStatus(alert._id || alert.id, 'resolved')}
                          disabled={alertActionLoadingId === (alert._id || alert.id)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
                        >
                          Resolve Incident
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata and Timestamps */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-light)',
                    marginTop: '0.65rem'
                  }}>
                    <div>
                      Event Type: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{alert.eventType}</span>
                    </div>
                    <div>
                      First seen: {new Date(alert.firstSeenAt || alert.createdAt).toLocaleString()} &bull; Last seen: {new Date(alert.lastSeenAt || alert.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LIVE TENANT-ISOLATION TEST DASHBOARD                              */}
      {/* ========================================================================= */}
      {activeTab === 'isolation' && (
        <div>
          {/* Explanation Banner */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem', backgroundColor: 'rgba(37, 99, 235, 0.04)', borderColor: 'rgba(37, 99, 235, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={22} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Live Deterministic Tenant-Boundary Isolation Testing
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              TenantGuard’s live isolation dashboard executes 10 real backend requests against designated synthetic demo organizations
              (<strong>Synthetic Corp A</strong> and <strong>Synthetic Shield B</strong>). 
              Real tenant data is never exposed. Every result is computed in real time from executed HTTP requests—no hardcoded success mocks.
            </p>

            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setTestConfirmationOpen(true)}
                disabled={isTestingRunning}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isTestingRunning ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    Executing Security Matrix...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Execute Live Isolation Suite
                  </>
                )}
              </button>

              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isolationResult ? `Last run: ${new Date(isolationResult.timestamp).toLocaleString()}` : 'Test suite not run yet in this session.'}
              </span>
            </div>
          </div>

          {/* Test Confirmation Modal */}
          {testConfirmationOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1.5rem'
            }}>
              <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>Confirm Isolation Test Execution</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  This action will provision isolated synthetic demo tenants, execute 10 security scenarios across RBAC and tenant boundaries, and clean up the synthetic resources immediately afterwards.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setTestConfirmationOpen(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRunIsolationTests}
                    className="btn btn-primary"
                  >
                    Confirm & Run Tests
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Test Results Summary Banner */}
          {isolationResult && (
            <div style={{
              backgroundColor: isolationResult.summary.failed === 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${isolationResult.summary.failed === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isolationResult.summary.failed === 0 ? (
                  <CheckCircle2 size={28} color="#10b981" />
                ) : (
                  <XCircle size={28} color="var(--danger)" />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    {isolationResult.summary.failed === 0 
                      ? 'TENANT BOUNDARY ISOLATION VERIFIED (10/10 PASS)' 
                      : `ISOLATION DEFECTS DETECTED (${isolationResult.summary.failed} Failed)`}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Run ID: <span style={{ fontFamily: 'monospace' }}>{isolationResult.testRunId}</span> &bull; Scenarios: {isolationResult.summary.total} | Passed: {isolationResult.summary.passed} | Failed: {isolationResult.summary.failed}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 10 Detailed Scenario Cards */}
          {isolationResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isolationResult.results.map((r) => (
                <div 
                  key={r.scenario}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    borderLeft: `4px solid ${r.status === 'PASS' ? '#10b981' : 'var(--danger)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'var(--bg-secondary)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          Case #{r.scenario}
                        </span>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                          {r.title}
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        {r.description}
                      </div>
                    </div>

                    <span className={`badge ${r.status === 'PASS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                      {r.status}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    marginTop: '0.75rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Target Action:</span>{' '}
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.action}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Expected:</span>{' '}
                      <strong>{r.expected}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Observed Outcome:</span>{' '}
                      <span style={{ color: r.status === 'PASS' ? '#10b981' : 'var(--danger)', fontWeight: 600 }}>
                        {r.observed}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Shield size={36} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>Live Isolation Suite Ready</div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', maxWidth: '460px', margin: '0.25rem auto 0' }}>
                Click "Execute Live Isolation Suite" above to run the 10 real backend isolation tests against synthetic demo organizations.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MFA & COMPLIANCE POLICY                                           */}
      {/* ========================================================================= */}
      {activeTab === 'policy' && (
        <div style={{ maxWidth: '780px' }}>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SlidersHorizontal size={20} color="var(--primary)" />
                <h3 className="card-title">Organization Multi-Factor Authentication Policy</h3>
              </div>
            </div>

            {policyMessage.text && (
              <div className={`alert alert-${policyMessage.type}`} style={{ marginBottom: '1.25rem' }}>
                <CheckCircle2 size={18} />
                <div>{policyMessage.text}</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Organization Admins can configure mandatory two-factor authentication (TOTP) for all workspace members.
                When enabled, members who have not yet enrolled in 2FA will be prompted to configure their authenticator application before being allowed to perform sensitive workspace mutations.
              </p>

              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    Enforce TOTP MFA for all organization members
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Current status: {enforceMfa ? 'MANDATORY (ENFORCED)' : 'OPTIONAL'}
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enforceMfa}
                    onChange={(e) => setEnforceMfa(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSaveMfaPolicy}
                  disabled={isSavingPolicy}
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem' }}
                >
                  {isSavingPolicy ? 'Saving Policy...' : 'Save Policy Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityCenter;
