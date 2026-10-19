import { logAuditEvent, logSecurityEvent } from '../services/audit.service.js';

/**
 * Role-Based Access Control (RBAC) Authorization Middleware
 * Enforces server-side permission gates based on verified user roles.
 * 
 * Roles hierarchy and capabilities:
 * - org_admin: Full workspace administration, user roles, security center.
 * - project_manager: Project creation, project editing, task assignments.
 * - member: Task creation, status updates, collaboration.
 * - viewer: Read-only access to authorized workspace content.
 * 
 * @param {string[]} allowedRoles - List of permitted roles for the target route
 */
export const requireRole = (allowedRoles = []) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication context required before evaluating role permissions.'
      }
    });
  }

  const userRole = req.user.role;

  if (!allowedRoles.includes(userRole)) {
    // Record security telemetry for unauthorized access attempt
    await logAuditEvent({
      organizationId: req.user.organizationId,
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: userRole,
      action: 'RBAC_ACCESS_DENIED',
      category: 'access_control',
      severity: 'warning',
      targetResource: req.baseUrl + req.path,
      details: {
        attemptedPath: req.originalUrl,
        userRole,
        requiredRoles: allowedRoles
      },
      req,
      status: 'denied'
    });

    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        message: 'You do not have the required role permissions to perform this action.',
        requiredRoles: allowedRoles
      }
    });
  }

  next();
};

/**
 * Dedicated Guard for Platform Super Administrators
 * Blocks tenant users from accessing infrastructure/platform management routes.
 */
export const requirePlatformSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_SUPERADMIN_REQUIRED',
        message: 'This operation is restricted to Platform Super Administrators.'
      }
    });
  }
  next();
};

export default {
  requireRole,
  requirePlatformSuperAdmin
};
