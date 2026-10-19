import express from 'express';
import projectController from '../controllers/project.controller.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantContext } from '../middleware/tenantGuard.js';
import { requireRole } from '../middleware/rbac.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = express.Router();

// Apply authentication and tenant isolation context to all project routes
router.use(authenticate, enforceTenantContext);

// Read routes: Accessible to all active tenant roles
router.get(
  '/',
  requireRole(['org_admin', 'project_manager', 'member', 'viewer']),
  projectController.listProjects
);

router.get(
  '/:id',
  requireRole(['org_admin', 'project_manager', 'member', 'viewer']),
  projectController.getProject
);

// Mutation routes: Restricted to Organization Admins and Project Managers
router.post(
  '/',
  requireRole(['org_admin', 'project_manager']),
  csrfProtection,
  validate(createProjectSchema),
  projectController.createProject
);

router.patch(
  '/:id',
  requireRole(['org_admin', 'project_manager']),
  csrfProtection,
  validate(updateProjectSchema),
  projectController.updateProject
);

router.put(
  '/:id',
  requireRole(['org_admin', 'project_manager']),
  csrfProtection,
  validate(updateProjectSchema),
  projectController.updateProject
);

router.delete(
  '/:id',
  requireRole(['org_admin', 'project_manager']),
  csrfProtection,
  projectController.deleteProject
);

export default router;
