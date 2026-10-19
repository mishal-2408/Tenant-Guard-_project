import express from 'express';
import taskController from '../controllers/task.controller.js';
import { createTaskSchema, updateTaskSchema } from '../validators/task.validator.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantContext } from '../middleware/tenantGuard.js';
import { requireRole } from '../middleware/rbac.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = express.Router();

// Apply authentication and tenant isolation context to all task routes
router.use(authenticate, enforceTenantContext);

// Read routes: Accessible to all active tenant roles
router.get(
  '/',
  requireRole(['org_admin', 'project_manager', 'member', 'viewer']),
  taskController.listTasks
);

router.get(
  '/:id',
  requireRole(['org_admin', 'project_manager', 'member', 'viewer']),
  taskController.getTask
);

// Create route: Accessible to Admins, Project Managers, and Members (Viewer is blocked)
router.post(
  '/',
  requireRole(['org_admin', 'project_manager', 'member']),
  csrfProtection,
  validate(createTaskSchema),
  taskController.createTask
);

// Update route: Accessible to Admins, Project Managers, and Members (Viewer is blocked)
router.patch(
  '/:id',
  requireRole(['org_admin', 'project_manager', 'member']),
  csrfProtection,
  validate(updateTaskSchema),
  taskController.updateTask
);

router.put(
  '/:id',
  requireRole(['org_admin', 'project_manager', 'member']),
  csrfProtection,
  validate(updateTaskSchema),
  taskController.updateTask
);

// Delete route: Restricted to Organization Admins and Project Managers
router.delete(
  '/:id',
  requireRole(['org_admin', 'project_manager']),
  csrfProtection,
  taskController.deleteTask
);

export default router;
