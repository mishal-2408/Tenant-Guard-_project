import express from 'express';
import securityController from '../controllers/security.controller.js';
import { updateAlertStatusSchema, updateMfaPolicySchema } from '../validators/security.validator.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantContext } from '../middleware/tenantGuard.js';
import { requireRole } from '../middleware/rbac.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = express.Router();

// Apply authentication, tenant scoping, and Org Admin RBAC restriction to all Security Center routes
router.use(authenticate, enforceTenantContext, requireRole(['org_admin']));

// Audit Logs
router.get('/audit-logs', securityController.getAuditLogs);
router.get('/audit-logs/export', securityController.exportAuditLogs);

// Security Alerts
router.get('/alerts', securityController.getAlerts);
router.patch('/alerts/:id/status', csrfProtection, validate(updateAlertStatusSchema), securityController.updateAlertStatus);

// Security Overview Summary
router.get('/summary', securityController.getSecuritySummary);

// Organization MFA Enforcement Policy
router.patch('/mfa-policy', csrfProtection, validate(updateMfaPolicySchema), securityController.updateMfaPolicy);

// Live Tenant Isolation Test Runner
router.post('/run-isolation-test', csrfProtection, securityController.runIsolationTests);

export default router;
