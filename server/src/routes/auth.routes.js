import express from 'express';
import authController from '../controllers/auth.controller.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantContext, findTenantResource } from '../middleware/tenantGuard.js';
import { requireRole } from '../middleware/rbac.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { csrfProtection } from '../middleware/csrf.js';
import { Project } from '../models/Project.js';

const router = express.Router();

// ==========================================
// Public Authentication Routes
// ==========================================

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// ==========================================
// Authenticated Session Routes
// ==========================================

router.post('/logout', authenticate, csrfProtection, authController.logout);
router.get('/me', authenticate, authController.getMe);

// ==========================================
// Verification & Middleware Test Routes
// Demonstrates RBAC & TenantGuard in Action
// ==========================================

// Route accessible only by Organization Admins
router.get(
  '/test/admin-only',
  authenticate,
  enforceTenantContext,
  requireRole(['org_admin']),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted to Organization Admin.',
      userRole: req.user.role,
      organizationId: req.organizationId
    });
  }
);

// Route accessible by Members, Project Managers, and Admins (Denies Viewers)
router.get(
  '/test/member-action',
  authenticate,
  enforceTenantContext,
  requireRole(['org_admin', 'project_manager', 'member']),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted to collaborative member.',
      userRole: req.user.role
    });
  }
);

// Route accessible by all roles including Viewers
router.get(
  '/test/viewer-allowed',
  authenticate,
  enforceTenantContext,
  requireRole(['org_admin', 'project_manager', 'member', 'viewer']),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Read-only access granted.',
      userRole: req.user.role
    });
  }
);

// Route demonstrating TenantGuard Cross-Tenant Resource Isolation
router.get(
  '/test/resource/:id',
  authenticate,
  enforceTenantContext,
  async (req, res) => {
    const resource = await findTenantResource(Project, req.params.id, req);

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'The requested resource was not found.'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: resource
    });
  }
);

export default router;
