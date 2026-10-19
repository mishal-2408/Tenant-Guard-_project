import { generateSecret, generateURI, verifySync } from 'otplib';
import qrcode from 'qrcode';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.util.js';
import { comparePassword } from '../utils/password.util.js';
import { signAccessToken, verifyAccessToken } from '../utils/jwt.util.js';
import { logAuditEvent, logSecurityEvent } from './audit.service.js';

/**
 * Initiates TOTP MFA enrollment by generating a cryptographically secure secret
 * and QR code data URL. Encrypts the secret at rest with AES-256-GCM.
 */
export const setupMfa = async ({ userId, req }) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (user.mfaEnabled) {
    const error = new Error('Multi-factor authentication is already enabled on this account.');
    error.statusCode = 400;
    error.code = 'MFA_ALREADY_ENABLED';
    throw error;
  }

  // 1. Generate standard Base32 TOTP secret
  const rawSecret = generateSecret();

  // 2. Format standard OTPAuth URI
  const issuer = 'TenantGuard';
  const keyuri = generateURI({
    secret: rawSecret,
    label: user.email,
    issuer
  });

  // 3. Generate QR Code Data URL
  const qrCodeDataUrl = await qrcode.toDataURL(keyuri, {
    margin: 1,
    width: 240,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  // 4. Encrypt secret at rest using AES-256-GCM before saving
  user.mfaSecret = encryptSecret(rawSecret);
  // Keep enrollment pending until verified
  user.mfaEnabled = false;
  await user.save();

  await logAuditEvent({
    organizationId: user.organizationId,
    actorId: user._id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'MFA_SETUP_INITIATED',
    category: 'access_control',
    severity: 'info',
    req,
    status: 'success'
  });

  return {
    secret: rawSecret,
    qrCodeDataUrl,
    issuer
  };
};

/**
 * Verifies the first TOTP code to finalize MFA enrollment.
 */
export const verifyMfaSetup = async ({ userId, token, req }) => {
  const user = await User.findById(userId).select('+mfaSecret');
  if (!user || !user.mfaSecret) {
    const error = new Error('MFA enrollment has not been initialized.');
    error.statusCode = 400;
    error.code = 'MFA_NOT_INITIALIZED';
    throw error;
  }

  // 1. Decrypt secret from database
  let rawSecret;
  try {
    rawSecret = decryptSecret(user.mfaSecret);
  } catch (err) {
    const error = new Error('Failed to decrypt MFA secret.');
    error.statusCode = 500;
    error.code = 'MFA_DECRYPTION_ERROR';
    throw error;
  }

  // 2. Validate TOTP code
  const result = verifySync({ secret: rawSecret, token: token.trim() });
  const isValid = result && result.valid === true;

  if (!isValid) {
    await logAuditEvent({
      organizationId: user.organizationId,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'MFA_SETUP_FAILED',
      category: 'access_control',
      severity: 'warning',
      details: { reason: 'Invalid TOTP verification code entered during setup' },
      req,
      status: 'failed'
    });

    const error = new Error('Invalid verification code. Please check your authenticator app and try again.');
    error.statusCode = 400;
    error.code = 'MFA_INVALID_CODE';
    throw error;
  }

  // 3. Mark MFA permanently enabled
  user.mfaEnabled = true;
  await user.save();

  await logAuditEvent({
    organizationId: user.organizationId,
    actorId: user._id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'MFA_ENROLLED',
    category: 'access_control',
    severity: 'info',
    req,
    status: 'success'
  });

  return {
    success: true,
    message: 'Multi-factor authentication successfully enabled.'
  };
};

/**
 * Completes login authentication for accounts with MFA enabled.
 * Validates pre-auth token and checks TOTP code before issuing full session.
 */
export const verifyMfaLogin = async ({ mfaToken, token, req }) => {
  if (!mfaToken || typeof mfaToken !== 'string') {
    const error = new Error('MFA pre-authentication token is required.');
    error.statusCode = 401;
    error.code = 'AUTH_MFA_TOKEN_REQUIRED';
    throw error;
  }

  let decoded;
  try {
    decoded = verifyAccessToken(mfaToken);
  } catch (err) {
    const error = new Error('MFA pre-authentication session has expired. Please log in again.');
    error.statusCode = 401;
    error.code = 'AUTH_MFA_TOKEN_EXPIRED';
    throw error;
  }

  if (!decoded.isMfaPending) {
    const error = new Error('Invalid pre-authentication state.');
    error.statusCode = 400;
    error.code = 'AUTH_MFA_TOKEN_INVALID';
    throw error;
  }

  const user = await User.findById(decoded.userId).select('+mfaSecret +status +tokenVersion');
  if (!user || user.status !== 'active') {
    const error = new Error('User account is inactive or not found.');
    error.statusCode = 401;
    error.code = 'AUTH_USER_NOT_FOUND';
    throw error;
  }

  let rawSecret;
  try {
    rawSecret = decryptSecret(user.mfaSecret);
  } catch (err) {
    const error = new Error('Failed to decrypt MFA credentials.');
    error.statusCode = 500;
    error.code = 'MFA_DECRYPTION_ERROR';
    throw error;
  }

  const result = verifySync({ secret: rawSecret, token: token.trim() });
  const isValid = result && result.valid === true;

  if (!isValid) {
    await logSecurityEvent({
      organizationId: user.organizationId,
      eventType: 'MFA_VERIFICATION_FAILED',
      severity: 'warning',
      title: 'MFA Verification Code Failed',
      description: `Failed TOTP verification attempt during login for user ${user.email}.`,
      metadata: { actorId: user._id, actorEmail: user.email },
      req
    });

    await logAuditEvent({
      organizationId: user.organizationId,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'MFA_LOGIN_FAILED',
      category: 'auth',
      severity: 'warning',
      req,
      status: 'failed'
    });

    const error = new Error('Invalid two-factor authentication code.');
    error.statusCode = 400;
    error.code = 'MFA_INVALID_CODE';
    throw error;
  }

  // Generate full-access JWT session token
  const fullToken = signAccessToken({
    userId: user._id.toString(),
    organizationId: user.organizationId.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion || 0
  });

  const organization = await Organization.findById(user.organizationId).select('name slug plan settings');

  await logAuditEvent({
    organizationId: user.organizationId,
    actorId: user._id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'USER_LOGIN_SUCCESS',
    category: 'auth',
    severity: 'info',
    details: { mfaUsed: true },
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
      organizationId: user.organizationId.toString(),
      mfaEnabled: true
    },
    organization,
    token: fullToken
  };
};

/**
 * Disables TOTP MFA. Requires both current account password and valid TOTP code.
 */
export const disableMfa = async ({ userId, password, token, req }) => {
  const user = await User.findById(userId).select('+passwordHash +mfaSecret');
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (!user.mfaEnabled || !user.mfaSecret) {
    const error = new Error('Multi-factor authentication is not currently enabled on this account.');
    error.statusCode = 400;
    error.code = 'MFA_NOT_ENABLED';
    throw error;
  }

  // 1. Verify current account password
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Current password verification failed.');
    error.statusCode = 400;
    error.code = 'INVALID_PASSWORD';
    throw error;
  }

  // 2. Verify TOTP code
  let rawSecret;
  try {
    rawSecret = decryptSecret(user.mfaSecret);
  } catch (err) {
    const error = new Error('Failed to decrypt MFA credentials.');
    error.statusCode = 500;
    error.code = 'MFA_DECRYPTION_ERROR';
    throw error;
  }

  const result = verifySync({ secret: rawSecret, token: token.trim() });
  const isValid = result && result.valid === true;

  if (!isValid) {
    const error = new Error('Invalid verification code.');
    error.statusCode = 400;
    error.code = 'MFA_INVALID_CODE';
    throw error;
  }

  // 3. Disable MFA and clear secret
  user.mfaEnabled = false;
  user.mfaSecret = null;
  await user.save();

  await logSecurityEvent({
    organizationId: user.organizationId,
    eventType: 'MFA_DISABLED',
    severity: 'high',
    title: 'Multi-Factor Authentication Disabled',
    description: `User ${user.email} disabled TOTP multi-factor authentication.`,
    metadata: { actorId: user._id, actorEmail: user.email },
    req
  });

  await logAuditEvent({
    organizationId: user.organizationId,
    actorId: user._id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'MFA_DISABLED',
    category: 'access_control',
    severity: 'warning',
    req,
    status: 'success'
  });

  return {
    success: true,
    message: 'Multi-factor authentication has been disabled.'
  };
};

export default {
  setupMfa,
  verifyMfaSetup,
  verifyMfaLogin,
  disableMfa
};
