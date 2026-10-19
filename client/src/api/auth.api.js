import apiClient from './client.js';

export const authApi = {
  /**
   * Registers a new organization and root Org Admin account
   * @param {Object} data - { organizationName, slug, firstName, lastName, email, password }
   */
  register: (data) => apiClient.post('/auth/register', data),

  /**
   * Authenticates user with email & password, sets httpOnly session cookie
   * @param {Object} data - { email, password }
   */
  login: (data) => apiClient.post('/auth/login', data),

  /**
   * Terminates session, increments tokenVersion in DB, clears auth cookies
   */
  logout: () => apiClient.post('/auth/logout'),

  /**
   * Retrieves verified current session user and organization metadata
   */
  getMe: () => apiClient.get('/auth/me'),

  /**
   * Test endpoint to verify Organization Admin RBAC permission
   */
  testAdminOnly: () => apiClient.get('/auth/test/admin-only'),

  /**
   * Test endpoint to verify Member action RBAC permission (denies Viewer)
   */
  testMemberAction: () => apiClient.get('/auth/test/member-action'),

  /**
   * Test endpoint accessible to all roles including Viewers
   */
  testViewerAllowed: () => apiClient.get('/auth/test/viewer-allowed'),

  /**
   * Initializes TOTP MFA setup, returns secret key and QR code data URL
   */
  setupMfa: () => apiClient.post('/auth/mfa/setup'),

  /**
   * Verifies initial 6-digit TOTP token to activate MFA for user
   * @param {Object} data - { token }
   */
  verifyMfaSetup: (data) => apiClient.post('/auth/mfa/verify-setup', data),

  /**
   * Completes multi-factor authentication challenge during login
   * @param {Object} data - { mfaToken, token }
   */
  verifyMfaLogin: (data) => apiClient.post('/auth/mfa/verify-login', data),

  /**
   * Disables MFA requiring current account password and valid 6-digit TOTP token
   * @param {Object} data - { password, token }
   */
  disableMfa: (data) => apiClient.post('/auth/mfa/disable', data)
};

export const healthApi = {
  /**
   * Retrieves system health status from the backend
   */
  getHealth: () => apiClient.get('/health')
};

export default authApi;
