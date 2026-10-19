import express from 'express';
import teamController from '../controllers/team.controller.js';
import { updateRoleSchema, updateStatusSchema } from '../validators/team.validator.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantContext } from '../middleware/tenantGuard.js';
import { requireRole } from '../middleware/rbac.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = express.Router();

// Apply authentication and tenant isolation context to all team routes
router.use(authenticate, enforceTenantContext);

// Member directory: Accessible to all active members of the tenant
router.get(
  '/members',
  requireRole(['org_admin', 'project_manager', 'member', 'viewer']),
  teamController.listMembers
);

router.get(
  '/members/:id',
  requireRole(['org_admin', 'project_manager', 'member', 'viewer']),
  teamController.getMember
);

// Member administrative management: Strictly restricted to Organization Admins
router.patch(
  '/members/:id/role',
  requireRole(['org_admin']),
  csrfProtection,
  validate(updateRoleSchema),
  teamController.updateMemberRole
);

router.patch(
  '/members/:id/status',
  requireRole(['org_admin']),
  csrfProtection,
  validate(updateStatusSchema),
  teamController.updateMemberStatus
);

export default router;
