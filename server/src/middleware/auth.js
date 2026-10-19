import { verifyAccessToken } from '../utils/jwt.util.js';
import { AUTH_COOKIE_NAME } from '../utils/cookie.util.js';
import { User } from '../models/User.js';
import { PlatformAdmin } from '../models/PlatformAdmin.js';
import { logAuditEvent } from '../services/audit.service.js';

/**
 * Central Authentication Middleware
 * Validates JWT access token from httpOnly cookie or Authorization Bearer header.
 * Verifies signature, expiry, account status, and tokenVersion (invalidation check).
 */
export const authenticate = async (req, res, next) => {
  let token = null;

  // 1. Extract token from httpOnly cookie first
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    token = req.cookies[AUTH_COOKIE_NAME];
  }
  // 2. Fallback to Authorization: Bearer header (for API / programmatic clients)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_TOKEN_REQUIRED',
        message: 'Authentication token is required to access this resource.'
      }
    });
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Authentication token has expired. Please log in again.'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_TOKEN_INVALID',
        message: 'Invalid authentication token.'
      }
    });
  }

  // Pre-authentication state cannot access protected application resources
  if (decoded.isMfaPending) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_MFA_REQUIRED',
        message: 'Multi-factor authentication verification is required to complete login.'
      }
    });
  }

  try {
    // 3. Check for Platform Super Administrator Session (Decoupled Collection)
    if (decoded.role === 'platform_super_admin') {
      const admin = await PlatformAdmin.findById(decoded.userId).select('+status');

      if (!admin || admin.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_ADMIN_NOT_FOUND',
            message: 'Platform administrator account not found or inactive.'
          }
        });
      }

      req.user = {
        _id: admin._id,
        id: admin._id.toString(),
        isSuperAdmin: true,
        role: 'platform_super_admin',
        email: admin.email,
        fullName: admin.fullName,
        organizationId: null
      };

      return next();
    }

    // 4. Load tenant user to verify current account status and tokenVersion
    const user = await User.findById(decoded.userId).select('+status +tokenVersion');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_USER_NOT_FOUND',
          message: 'The user associated with this token no longer exists.'
        }
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_ACCOUNT_SUSPENDED',
          message: 'Your account is suspended or inactive.'
        }
      });
    }

    // 4. Token Invalidation Check: compare tokenVersion in JWT claim with user record in DB
    if (user.tokenVersion !== decoded.tokenVersion) {
      await logAuditEvent({
        organizationId: user.organizationId,
        actorId: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'AUTH_TOKEN_REVOKED',
        category: 'auth',
        severity: 'warning',
        details: { reason: 'Stale tokenVersion used after logout or password change' },
        req,
        status: 'denied'
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_REVOKED',
          message: 'Session has been invalidated. Please log in again.'
        }
      });
    }

    // 5. Establish immutable, trusted authentication context
    req.user = {
      _id: user._id,
      id: user._id.toString(),
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
