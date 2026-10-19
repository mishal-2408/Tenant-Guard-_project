import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.util.js';
import { signAccessToken } from '../utils/jwt.util.js';
import { logAuditEvent, logSecurityEvent } from './audit.service.js';

/**
 * Utility to generate an alphanumeric URL slug from an organization name
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Organization Registration Service
 * Atomically provisions a new organization and assigns the registering user as Organization Admin.
 */
export const registerOrganization = async ({
  organizationName,
  slug,
  firstName,
  lastName,
  email,
  password,
  req
}) => {
  const normalizedEmail = email.toLowerCase().trim();
  const targetSlug = slug ? slug.toLowerCase().trim() : generateSlug(organizationName);

  // 1. Enforce unique organization slug
  const existingOrg = await Organization.findOne({ slug: targetSlug });
  if (existingOrg) {
    const error = new Error(`An organization with the workspace slug '${targetSlug}' already exists.`);
    error.statusCode = 409;
    error.code = 'ORGANIZATION_SLUG_CONFLICT';
    throw error;
  }

  // 2. Hash password with bcrypt cost factor 12
  const passwordHash = await hashPassword(password);

  let organization;
  try {
    // 3. Create Organization
    organization = await Organization.create({
      name: organizationName.trim(),
      slug: targetSlug,
      plan: 'free',
      status: 'active'
    });

    // 4. Create root user with Organization Admin role
    const user = await User.create({
      organizationId: organization._id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'org_admin', // Enforced server-side: creator is always org_admin
      status: 'active',
      tokenVersion: 0
    });

    // 5. Generate short-lived access JWT
    const token = signAccessToken({
      userId: user._id,
      organizationId: organization._id,
      role: user.role,
      tokenVersion: user.tokenVersion
    });

    // 6. Record Registration Audit Telemetry
    await logAuditEvent({
      organizationId: organization._id,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'ORGANIZATION_REGISTER_SUCCESS',
      category: 'auth',
      severity: 'info',
      targetResource: 'Organization',
      targetResourceId: organization._id.toString(),
      details: { organizationName: organization.name, slug: organization.slug },
      req,
      status: 'success'
    });

    return {
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organizationId: organization._id.toString()
      },
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan
      },
      token
    };
  } catch (err) {
    // Compensation Cleanup: If user creation fails, purge the newly created organization
    if (organization?._id) {
      await Organization.findByIdAndDelete(organization._id);
    }

    if (err.code === 11000) {
      const conflictError = new Error('A user with this email address already exists in this organization.');
      conflictError.statusCode = 409;
      conflictError.code = 'USER_ALREADY_EXISTS';
      throw conflictError;
    }
    throw err;
  }
};

/**
 * User Authentication / Login Service
 * Verifies credentials, manages failed attempts and lockout timers, and issues short-lived JWT.
 */
export const loginUser = async ({ email, password, req }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Query user including sensitive auth fields
  const user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordHash +status +failedLoginAttempts +lockUntil +tokenVersion'
  );

  // 2. Generic Error on Not Found (Prevents user enumeration)
  if (!user) {
    await logAuditEvent({
      actorEmail: normalizedEmail,
      actorRole: 'anonymous',
      action: 'USER_LOGIN_FAILED',
      category: 'auth',
      severity: 'warning',
      details: { reason: 'User not found' },
      req,
      status: 'failed'
    });

    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // 3. Verify Account Status
  if (user.status !== 'active') {
    const error = new Error('This account is suspended or inactive. Please contact your organization administrator.');
    error.statusCode = 403;
    error.code = 'ACCOUNT_NOT_ACTIVE';
    throw error;
  }

  // 4. Check Brute-Force Lockout State
  if (user.isLocked()) {
    const remainingMs = user.lockUntil.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

    await logSecurityEvent({
      organizationId: user.organizationId,
      eventType: 'BRUTE_FORCE_LOCKOUT',
      severity: 'high',
      title: 'Login Attempt on Locked Account',
      description: `Login attempted for locked user ${user.email}. Lockout active for ${remainingMinutes} more minutes.`,
      metadata: { actorId: user._id, actorEmail: user.email },
      req
    });

    const error = new Error(`Account is temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s).`);
    error.statusCode = 423; // 423 Locked
    error.code = 'ACCOUNT_LOCKED';
    throw error;
  }

  // 5. Compare Password
  const isMatch = await comparePassword(password, user.passwordHash);

  if (!isMatch) {
    user.failedLoginAttempts += 1;

    // Trigger lockout after 5 consecutive failures
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute freeze

      await logSecurityEvent({
        organizationId: user.organizationId,
        eventType: 'BRUTE_FORCE_LOCKOUT',
        severity: 'high',
        title: 'Account Locked Due to Multiple Failed Logins',
        description: `User ${user.email} reached 5 consecutive failed login attempts. Account locked for 15 minutes.`,
        metadata: { actorId: user._id, actorEmail: user.email, failedAttempts: user.failedLoginAttempts },
        req
      });
    }

    await user.save();

    await logAuditEvent({
      organizationId: user.organizationId,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'USER_LOGIN_FAILED',
      category: 'auth',
      severity: 'warning',
      details: { failedAttempts: user.failedLoginAttempts },
      req,
      status: 'failed'
    });

    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // 6. Successful Login: Reset lockout counters
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  // 7. Load Organization
  const organization = await Organization.findById(user.organizationId);

  // 8. If Multi-Factor Authentication is enabled, issue restricted pre-auth token (do not issue session JWT)
  if (user.mfaEnabled) {
    const mfaPendingToken = signAccessToken(
      {
        userId: user._id,
        organizationId: user.organizationId,
        role: user.role,
        isMfaPending: true
      },
      '5m'
    );

    await logAuditEvent({
      organizationId: user.organizationId,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'USER_LOGIN_MFA_CHALLENGE',
      category: 'auth',
      severity: 'info',
      req,
      status: 'success'
    });

    return {
      mfaRequired: true,
      mfaToken: mfaPendingToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName
      }
    };
  }

  // 9. Standard Non-MFA Flow: Sign Full Access Token
  const token = signAccessToken({
    userId: user._id,
    organizationId: user.organizationId,
    role: user.role,
    tokenVersion: user.tokenVersion
  });

  // 9. Record Successful Login Audit Event
  await logAuditEvent({
    organizationId: user.organizationId,
    actorId: user._id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'USER_LOGIN_SUCCESS',
    category: 'auth',
    severity: 'info',
    req,
    status: 'success'
  });

  return {
    user: {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString()
    },
    organization: organization
      ? {
          id: organization._id.toString(),
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan
        }
      : null,
    token
  };
};

/**
 * Logout and Token Invalidation Service
 * Increments user.tokenVersion to invalidate all existing tokens issued for this user.
 */
export const logoutUser = async (user, req) => {
  if (!user || !user._id) return;

  // Increment tokenVersion in database: Any token containing old tokenVersion becomes invalid immediately
  await User.findByIdAndUpdate(user._id, {
    $inc: { tokenVersion: 1 }
  });

  await logAuditEvent({
    organizationId: user.organizationId,
    actorId: user._id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'USER_LOGOUT_SUCCESS',
    category: 'auth',
    severity: 'info',
    req,
    status: 'success'
  });
};

/**
 * Retrieves the current authenticated user's profile and organization
 */
export const getAuthenticatedProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const organization = await Organization.findById(user.organizationId);

  return {
    user: {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      organizationId: user.organizationId.toString(),
      createdAt: user.createdAt
    },
    organization: organization
      ? {
          id: organization._id.toString(),
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan,
          settings: organization.settings
        }
      : null
  };
};

export default {
  registerOrganization,
  loginUser,
  logoutUser,
  getAuthenticatedProfile
};
