import apiClient from './client.js';

export const securityApi = {
  /**
   * Retrieves high-level security summary metrics for authenticated organization
   */
  getSecuritySummary: () => apiClient.get('/security/summary'),

  /**
   * Retrieves paginated and filterable audit logs
   * @param {Object} params - { category, severity, status, action, actorEmail, startDate, endDate, page, limit }
   */
  getAuditLogs: (params = {}) => apiClient.get('/security/audit-logs', { params }),

  /**
   * Exports filtered audit logs to CSV for authorized Org Admins
   * @param {Object} params - { category, severity, status, startDate, endDate }
   */
  exportAuditLogsCsv: async (params = {}) => {
    const response = await apiClient.get('/security/audit-logs/export', {
      params,
      responseType: 'blob'
    });
    return response;
  },

  /**
   * Retrieves security alerts for authenticated organization
   * @param {Object} params - { status, severity, page, limit }
   */
  getAlerts: (params = {}) => apiClient.get('/security/alerts', { params }),

  /**
   * Updates status of a security alert (acknowledge / resolve)
   * @param {string} alertId
   * @param {string} status - 'acknowledged' | 'resolved' | 'open'
   */
  updateAlertStatus: (alertId, status) => 
    apiClient.patch(`/security/alerts/${alertId}/status`, { status }),

  /**
   * Updates organization-wide MFA requirement policy
   * @param {boolean} enforceMfa
   */
  updateMfaPolicy: (enforceMfa) => 
    apiClient.patch('/security/mfa-policy', { enforceMfa }),

  /**
   * Executes deterministic synthetic tenant isolation test suite
   */
  runIsolationTests: () => apiClient.post('/security/run-isolation-test')
};

export default securityApi;
