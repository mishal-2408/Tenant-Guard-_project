import crypto from 'crypto';
import { Invitation } from '../models/Invitation.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { hashPassword } from '../utils/password.util.js';
import { signAccessToken } from '../utils/jwt.util.js';
import { findTenantResource } from '../middleware/tenantGuard.js';
import { logAuditEvent, logSecurityEvent } from './audit.service.js';

export const createInvitation = async ({ organizationId, actor, email, role, req }) => {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Prohibit granting platform super admin role
  if (role === 'platform_super_admin') {
    const error = new Error('Invitations cannot grant Platform Super Admin privileges.');
    error.statusCode = 400;
    error.code = 'INVALID_INVITATION_ROLE';
    throw error;
  }

  // 2. Check if user already exists within this organization
  const existingMember = await User.findOne({
    organizationId,
    email: normalizedEmail
  });

  if (existingMember) {
    const error = new Error('A user with this email address already belongs to this organization.');
    error.statusCode = 409;
    error.code = 'USER_ALREADY_MEMBER';
    throw error;
  }

  // 3. Invalidate any previously pending invitations for this email in this organization
  await Invitation.updateMany(
    {
      organizationId,
      email: normalizedEmail,
      status: 'pending'
    },
    { status: 'revoked' }
  );

  // 4. Generate cryptographically secure token and hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // 5. Set 24 hour expiration period
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // 6. Store ONLY the token hash in the database
  const invitation = await Invitation.create({
    organizationId,
    email: normalizedEmail,
    role,
    token: tokenHash,
    invitedBy: actor._id,
    status: 'pending',
    expiresAt
  });

  await logAuditEvent({
    organizationId,
    actorId: actor._id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'INVITATION_CREATED',
    category: 'access_control',
    severity: 'info',
    targetResource: 'Invitation',
    targetResourceId: invitation._id.toString(),
    details: {
      inviteeEmail: normalizedEmail,
      invitedRole: role,
      expiresAt
    },
    req,
    status: 'success'
  });

  // Return the invitation (toJSON strips token hash) along with the rawToken for the inviter/dev workflow
  return {
    invitation: await Invitation.findById(invitation._id).populate('invitedBy', 'firstName lastName email'),
    rawToken
  };
};

export const listInvitations = async ({ organizationId, page = 1, limit = 50 }) => {
  // Update expired pending invitations
  await Invitation.updateMany(
    {
      organizationId,
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    { status: 'expired' }
  );

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (parsedPage - 1) * parsedLimit;

  const [invitations, total] = await Promise.all([
    Invitation.find({ organizationId })
      .populate('invitedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Invitation.countDocuments({ organizationId })
  ]);

  return {
    invitations,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1
    }
  };
};

export const revokeInvitation = async ({ organizationId, invitationId, req }) => {
  const invitation = await findTenantResource(Invitation, invitationId, req);
  if (!invitation) return null;

  if (invitation.status !== 'pending') {
    const error = new Error(`Cannot revoke invitation with status '${invitation.status}'.`);
    error.statusCode = 400;
    error.code = 'INVITATION_NOT_PENDING';
    throw error;
  }

  invitation.status = 'revoked';
  await invitation.save();

  await logAuditEvent({
    organizationId,
    actorId: req.user._id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: 'INVITATION_REVOKED',
    category: 'access_control',
    severity: 'warning',
    targetResource: 'Invitation',
    targetResourceId: invitation._id.toString(),
    details: { inviteeEmail: invitation.email },
    req,
    status: 'success'
  });

  return invitation;
};

export const verifyInvitationToken = async (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, message: 'Invalid token format.' };
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

  const invitation = await Invitation.findOne({ token: tokenHash })
    .populate('organizationId', 'name slug');

  if (!invitation) {
    return { valid: false, message: 'Invitation token was not found.' };
  }

  if (invitation.status === 'revoked') {
    return { valid: false, message: 'This invitation has been revoked by an administrator.' };
  }

  if (invitation.status === 'accepted') {
    return { valid: false, message: 'This invitation has already been accepted.' };
  }

  if (invitation.expiresAt <= new Date() || invitation.status === 'expired') {
    if (invitation.status !== 'expired') {
      invitation.status = 'expired';
      await invitation.save();
    }
    return { valid: false, message: 'This invitation has expired.' };
  }

  return {
    valid: true,
    email: invitation.email,
    role: invitation.role,
    organizationName: invitation.organizationId?.name || 'Workspace',
    organizationSlug: invitation.organizationId?.slug || ''
  };
};

export const acceptInvitation = async ({ token, firstName, lastName, password, req }) => {
  if (!token || typeof token !== 'string') {
    const error = new Error('A valid invitation token is required.');
    error.statusCode = 400;
    error.code = 'INVALID_TOKEN';
    throw error;
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  // Atomically find valid, unexpired, pending invitation
  const invitation = await Invitation.findOne({
    token: tokenHash,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });

  if (!invitation) {
    const error = new Error('Invitation is invalid, expired, revoked, or has already been accepted.');
    error.statusCode = 400;
    error.code = 'INVITATION_INVALID_OR_EXPIRED';
    throw error;
  }

  // Double check that email does not already exist in the target organization
  const existingUser = await User.findOne({
    organizationId: invitation.organizationId,
    email: invitation.email
  });

  if (existingUser) {
    invitation.status = 'accepted';
    await invitation.save();

    const error = new Error('An account with this email already belongs to this organization.');
    error.statusCode = 409;
    error.code = 'USER_ALREADY_MEMBER';
    throw error;
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create new user in the invitation's organization with the server-assigned role
  const newUser = await User.create({
    organizationId: invitation.organizationId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: invitation.email,
    passwordHash,
    role: invitation.role, // role assigned strictly from the verified server-side invitation!
    status: 'active',
    tokenVersion: 0
  });

  // Mark invitation consumed
  invitation.status = 'accepted';
  await invitation.save();

  await logAuditEvent({
    organizationId: invitation.organizationId,
    actorId: newUser._id,
    actorEmail: newUser.email,
    actorRole: newUser.role,
    action: 'INVITATION_ACCEPTED',
    category: 'access_control',
    severity: 'info',
    targetResource: 'User',
    targetResourceId: newUser._id.toString(),
    details: {
      invitationId: invitation._id.toString(),
      email: newUser.email,
      role: newUser.role
    },
    req,
    status: 'success'
  });

  // Issue session token
  const jwtToken = signAccessToken({
    userId: newUser._id.toString(),
    organizationId: newUser.organizationId.toString(),
    role: newUser.role,
    tokenVersion: newUser.tokenVersion || 0
  });

  const organization = await Organization.findById(invitation.organizationId).select('name slug');

  return {
    user: newUser,
    organization,
    token: jwtToken
  };
};

export default {
  createInvitation,
  listInvitations,
  revokeInvitation,
  verifyInvitationToken,
  acceptInvitation
};
