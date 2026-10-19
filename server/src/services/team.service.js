import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { findTenantResource } from '../middleware/tenantGuard.js';
import { logAuditEvent, logSecurityEvent } from './audit.service.js';

export const listMembers = async ({ organizationId, search, role, status, page = 1, limit = 50 }) => {
  const query = { organizationId };

  if (role && role !== 'all') {
    query.role = role;
  }

  if (status && status !== 'all') {
    query.status = status;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex }
    ];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (parsedPage - 1) * parsedLimit;

  const [members, total] = await Promise.all([
    User.find(query)
      .select('-passwordHash -mfaSecret')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    User.countDocuments(query)
  ]);

  return {
    members,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1
    }
  };
};

export const getMemberById = async ({ organizationId, memberId, req }) => {
  const member = await findTenantResource(User, memberId, req);
  if (!member) return null;

  return User.findOne({ _id: member._id, organizationId }).select('-passwordHash -mfaSecret');
};

export const updateMemberRole = async ({ organizationId, memberId, newRole, actor, req }) => {
  // 1. Prevent modifying own role to avoid privilege escalations or accidental self-demotion
  if (actor._id.toString() === memberId.toString()) {
    const error = new Error('You cannot modify your own organization role.');
    error.statusCode = 400;
    error.code = 'CANNOT_MODIFY_OWN_ROLE';
    throw error;
  }

  // 2. Fetch target user scoped strictly to organization
  const targetUser = await findTenantResource(User, memberId, req);
  if (!targetUser) return null;

  // 3. Prevent demotion of the last active Organization Admin
  if (targetUser.role === 'org_admin' && newRole !== 'org_admin') {
    const activeAdminCount = await User.countDocuments({
      organizationId,
      role: 'org_admin',
      status: 'active'
    });

    if (activeAdminCount <= 1) {
      const error = new Error('Cannot demote the last active Organization Administrator. Promote another administrator first.');
      error.statusCode = 400;
      error.code = 'CANNOT_DEMOTE_LAST_ADMIN';
      throw error;
    }
  }

  const oldRole = targetUser.role;
  targetUser.role = newRole;

  // 4. Invalidate target user's active sessions immediately by incrementing tokenVersion
  targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
  await targetUser.save();

  await logAuditEvent({
    organizationId,
    actorId: actor._id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'MEMBER_ROLE_CHANGED',
    category: 'access_control',
    severity: 'warning',
    targetResource: 'User',
    targetResourceId: targetUser._id.toString(),
    details: {
      targetUserId: targetUser._id.toString(),
      targetEmail: targetUser.email,
      oldRole,
      newRole
    },
    req,
    status: 'success'
  });

  return User.findById(targetUser._id).select('-passwordHash -mfaSecret');
};

export const updateMemberStatus = async ({ organizationId, memberId, newStatus, actor, req }) => {
  // 1. Prevent deactivating self
  if (actor._id.toString() === memberId.toString()) {
    const error = new Error('You cannot deactivate or suspend your own account.');
    error.statusCode = 400;
    error.code = 'CANNOT_DEACTIVATE_SELF';
    throw error;
  }

  // 2. Fetch target user scoped strictly to organization
  const targetUser = await findTenantResource(User, memberId, req);
  if (!targetUser) return null;

  // 3. Prevent suspending the last active Organization Admin
  if (targetUser.role === 'org_admin' && newStatus === 'suspended') {
    const activeAdminCount = await User.countDocuments({
      organizationId,
      role: 'org_admin',
      status: 'active'
    });

    if (activeAdminCount <= 1) {
      const error = new Error('Cannot deactivate the last active Organization Administrator.');
      error.statusCode = 400;
      error.code = 'CANNOT_DEACTIVATE_LAST_ADMIN';
      throw error;
    }
  }

  const oldStatus = targetUser.status;
  targetUser.status = newStatus;

  // 4. Invalidate sessions on suspension by incrementing tokenVersion
  if (newStatus === 'suspended') {
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
  }

  await targetUser.save();

  await logAuditEvent({
    organizationId,
    actorId: actor._id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: newStatus === 'suspended' ? 'MEMBER_DEACTIVATED' : 'MEMBER_REACTIVATED',
    category: 'access_control',
    severity: newStatus === 'suspended' ? 'warning' : 'info',
    targetResource: 'User',
    targetResourceId: targetUser._id.toString(),
    details: {
      targetUserId: targetUser._id.toString(),
      targetEmail: targetUser.email,
      oldStatus,
      newStatus
    },
    req,
    status: 'success'
  });

  return User.findById(targetUser._id).select('-passwordHash -mfaSecret');
};

export default {
  listMembers,
  getMemberById,
  updateMemberRole,
  updateMemberStatus
};
