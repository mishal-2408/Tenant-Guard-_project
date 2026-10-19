import { AuditLog } from '../models/AuditLog.js';
import { SecurityEvent } from '../models/SecurityEvent.js';

/**
 * Sanitizes metadata objects to guarantee zero passwords, tokens, or credentials leak.
 */
const sanitizePayload = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const sanitized = { ...obj };
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'secret', 'mfaSecret', 'cookie', 'authorization'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizePayload(sanitized[key]);
    }
  }
  return sanitized;
};

/**
 * Records an operational or security audit log entry asynchronously.
 */
export const logAuditEvent = async ({
  organizationId = null,
  actorId = null,
  actorEmail = 'anonymous',
  actorRole = 'anonymous',
  action,
  category = 'auth',
  severity = 'info',
  targetResource = '',
  targetResourceId = '',
  details = {},
  req = null,
  status = 'success'
}) => {
  try {
    const ipAddress = req?.ip || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] || '';

    await AuditLog.create({
      organizationId,
      actorId,
      actorEmail,
      actorRole,
      action,
      category,
      severity,
      targetResource,
      targetResourceId,
      details: sanitizePayload(details),
      ipAddress,
      userAgent,
      status
    });
  } catch (err) {
    // Audit logging must not crash main operational requests, but is logged to server console
    console.error('[Audit Logging Failed]:', err.message);
  }
};

/**
 * Records an elevated security event alert.
 */
export const logSecurityEvent = async ({
  organizationId = null,
  eventType,
  severity = 'warning',
  title,
  description,
  metadata = {},
  req = null
}) => {
  try {
    const ipAddress = req?.ip || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] || '';

    await SecurityEvent.create({
      organizationId,
      eventType,
      severity,
      title,
      description,
      metadata: {
        ...sanitizePayload(metadata),
        ipAddress,
        userAgent
      }
    });
  } catch (err) {
    console.error('[Security Event Recording Failed]:', err.message);
  }
};

/**
 * Narrowly-controlled existence check to determine if a requested resource ID exists in the database.
 * Used exclusively for security telemetry to distinguish a 404 (non-existent item) from a 
 * cross-tenant access probe (item exists in another organization).
 * 
 * SECURITY GUARANTEES:
 * 1. Uses .exists() which returns only boolean ({ _id: ... }) or null.
 * 2. NEVER returns the document or exposes another tenant's data.
 * 
 * @param {import('mongoose').Model} Model - Target Mongoose model
 * @param {string|import('mongoose').Types.ObjectId} resourceId - Target document ID
 * @returns {Promise<boolean>} True if ID exists anywhere in DB
 */
export const resourceExistsInDb = async (Model, resourceId) => {
  try {
    const exists = await Model.exists({ _id: resourceId });
    return !!exists;
  } catch {
    return false;
  }
};

export default {
  logAuditEvent,
  logSecurityEvent,
  resourceExistsInDb
};
