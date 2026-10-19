import express from 'express';
import invitationController from '../controllers/invitation.controller.js';
import { createInvitationSchema, acceptInvitationSchema } from '../validators/invitation.validator.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantContext } from '../middleware/tenantGuard.js';
import { requireRole } from '../middleware/rbac.js';
import { csrfProtection } from '../middleware/csrf.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ==========================================
// Public Invitation Routes (No Session Needed)
// ==========================================

router.get('/verify/:token', authLimiter, invitationController.verifyInvitation);
router.get('/validate/:token', authLimiter, invitationController.verifyInvitation);
router.post('/accept', authLimiter, validate(acceptInvitationSchema), invitationController.acceptInvitation);

// ==========================================
// Protected Tenant Admin Routes
// ==========================================

router.post(
  '/',
  authenticate,
  enforceTenantContext,
  requireRole(['org_admin']),
  csrfProtection,
  validate(createInvitationSchema),
  invitationController.createInvitation
);

router.get(
  '/',
  authenticate,
  enforceTenantContext,
  requireRole(['org_admin']),
  invitationController.listInvitations
);

router.delete(
  '/:id',
  authenticate,
  enforceTenantContext,
  requireRole(['org_admin']),
  csrfProtection,
  invitationController.revokeInvitation
);

router.patch(
  '/:id/revoke',
  authenticate,
  enforceTenantContext,
  requireRole(['org_admin']),
  csrfProtection,
  invitationController.revokeInvitation
);

export default router;
