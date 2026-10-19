import { CSRF_COOKIE_NAME, AUTH_COOKIE_NAME } from '../utils/cookie.util.js';

/**
 * Double-Submit Cookie CSRF Protection Middleware
 * Defends against Cross-Site Request Forgery on state-changing requests (POST, PUT, PATCH, DELETE)
 * when requests authenticate via httpOnly cookies.
 * 
 * Rules:
 * 1. Safe HTTP methods (GET, HEAD, OPTIONS) are exempt.
 * 2. Unauthenticated public onboarding routes (login, register) are exempt.
 * 3. Requests that use Authorization Bearer headers (API/test clients) are exempt because
 *    browsers do not attach custom Authorization headers on cross-site form/script submissions.
 * 4. For requests relying on the httpOnly session cookie, the client must echo the value of
 *    the 'XSRF-TOKEN' cookie in the 'x-xsrf-token' or 'x-csrf-token' header.
 */
export const csrfProtection = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt public auth entrypoints where no prior cookie exists
  const exemptPaths = ['/api/auth/login', '/api/auth/register'];
  if (exemptPaths.includes(req.path)) {
    return next();
  }

  // If request uses explicit Bearer token header, CSRF is not applicable
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If request does not have an authentication cookie, pass through to auth middleware
  const hasAuthCookie = req.cookies && req.cookies[AUTH_COOKIE_NAME];
  if (!hasAuthCookie) {
    return next();
  }

  // For cookie-based authenticated mutations: verify Double Submit token
  const cookieCsrfToken = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;
  const headerCsrfToken = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];

  if (!cookieCsrfToken || !headerCsrfToken || cookieCsrfToken !== headerCsrfToken) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'State-changing cookie request failed anti-CSRF token verification.'
      }
    });
  }

  next();
};

export default csrfProtection;
