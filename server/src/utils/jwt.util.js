import jwt from 'jsonwebtoken';

/**
 * Retrieves the configured JWT secret or throws a fail-closed error.
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret === 'your_super_secret_jwt_access_token_key_here_change_in_production' && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_ACCESS_SECRET is improperly configured. Refusing to sign or verify tokens.');
  }
  return secret || 'tenantguard_default_dev_secret_never_use_in_production_32chars';
};

const DEFAULT_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '15m';

/**
 * Generates a signed, short-lived JWT access token.
 * Payload includes strictly necessary claims: userId, organizationId, role, and tokenVersion.
 * Never includes passwords, MFA secrets, or sensitive PII.
 * @param {Object} payload - User session context
 * @returns {string} Signed JWT
 */
export const signAccessToken = (payload) => {
  const secret = getJwtSecret();
  const claims = {
    userId: payload.userId,
    organizationId: payload.organizationId,
    role: payload.role,
    tokenVersion: payload.tokenVersion ?? 0
  };

  return jwt.sign(claims, secret, {
    expiresIn: DEFAULT_EXPIRATION,
    algorithm: 'HS256'
  });
};

/**
 * Cryptographically verifies an access token signature and expiration.
 * @param {string} token - Raw JWT string
 * @returns {Object} Decoded token claims
 */
export const verifyAccessToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
};

export default {
  signAccessToken,
  verifyAccessToken
};
