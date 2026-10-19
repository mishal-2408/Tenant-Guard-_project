import mongoose from 'mongoose';
import { logSecurityEvent, logAuditEvent, resourceExistsInDb } from '../services/audit.service.js';

/**
 * TenantGuard Middleware
 * Guarantees that the active tenant identity is derived exclusively from the verified
 * authentication context (req.user.organizationId), never from client-controlled input.
 */
export const enforceTenantContext = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication context is missing.'
      }
    });
  }

  // 1. Separation of Privilege: Platform Super Admins are prohibited from accessing private tenant content
  if (req.user.isSuperAdmin || !req.user.organizationId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_SUPERADMIN_TENANT_CONTENT_BLOCKED',
        message: 'Platform Super Admins are strictly prohibited from accessing tenant-private workspace content.'
      }
    });
  }

  const authenticatedOrgId = req.user.organizationId;

  // 2. Anti-Tampering Shield: Disarm client-supplied organizationId attempts
  const clientOrgId = req.body?.organizationId || req.query?.organizationId || req.headers['x-tenant-id'] || req.headers['x-organization-id'];

  if (clientOrgId && clientOrgId.toString() !== authenticatedOrgId.toString()) {
    logSecurityEvent({
      organizationId: authenticatedOrgId,
      eventType: 'UNAUTHORIZED_CROSS_TENANT_PROBE',
      severity: 'high',
      title: 'Tenant ID Spoofing Attempt Intercepted',
      description: `Client attempted to override authenticated tenant context ${authenticatedOrgId} with foreign tenant ID ${clientOrgId}`,
      metadata: { clientOrgId, authenticatedOrgId },
      req
    });
  }

  // Sanitize any client-supplied org ID from body and query
  if (req.body && typeof req.body === 'object') {
    delete req.body.organizationId;
  }
  if (req.query && typeof req.query === 'object') {
    delete req.query.organizationId;
  }

  // 3. Attach immutable tenant context to request
  req.organizationId = authenticatedOrgId;

  // 4. Attach scoped query builder helper to request
  req.tenantFilter = (filter = {}) => ({
    ...filter,
    organizationId: authenticatedOrgId
  });

  next();
};

/**
 * Reusable Tenant Isolation Query Helper
 * Queries a document by ID strictly scoped to the authenticated tenant.
 * If the document exists under another organization, an alert is logged and a generic 404 is returned.
 * 
 * @param {import('mongoose').Model} Model - Target Mongoose Model
 * @param {string|import('mongoose').Types.ObjectId} resourceId - Target entity ID
 * @param {Object} req - Express request object
 * @returns {Promise<Object|null>} Entity document or null
 */
export const findTenantResource = async (Model, resourceId, req) => {
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    return null;
  }

  const tenantOrgId = req.user.organizationId;

  // Primary Query: Strictly scoped to tenant boundary
  const doc = await Model.findOne({
    _id: resourceId,
    organizationId: tenantOrgId
  });

  if (doc) {
    return doc;
  }

  // Anti-Enumeration & Detection: Probe if the ID exists in another tenant's collection
  const foreignExists = await resourceExistsInDb(Model, resourceId);

  if (foreignExists) {
    // Log security alert for cross-tenant probe
    logSecurityEvent({
      organizationId: tenantOrgId,
      eventType: 'CROSS_TENANT_ACCESS_DENIED',
      severity: 'high',
      title: 'Cross-Tenant Access Probe Intercepted',
      description: `User ${req.user.email} attempted to access ${Model.modelName} ${resourceId} belonging to another organization.`,
      metadata: {
        actorId: req.user._id,
        actorEmail: req.user.email,
        targetModel: Model.modelName,
        attemptedResourceId: resourceId.toString()
      },
      req
    });

    logAuditEvent({
      organizationId: tenantOrgId,
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'CROSS_TENANT_ACCESS_DENIED',
      category: 'security_violation',
      severity: 'high',
      targetResource: Model.modelName,
      targetResourceId: resourceId.toString(),
      details: { attemptedResourceId: resourceId.toString() },
      req,
      status: 'denied'
    });
  }

  // Return null so the controller returns a uniform 404 Not Found (concealing resource existence)
  return null;
};

export default {
  enforceTenantContext,
  findTenantResource
};
