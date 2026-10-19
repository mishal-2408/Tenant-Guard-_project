import crypto from 'crypto';

export const AUTH_COOKIE_NAME = 'jwt_access_token';
export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';

/**
 * Derives secure cookie options based on the operational environment.
 */
export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true, // Prevents client-side scripts from reading session cookie
    secure: isProduction, // HTTPS required in production, relaxed for local dev
    sameSite: process.env.COOKIE_SAME_SITE || 'lax', // Defends against standard cross-site CSRF
    maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    path: '/'
  };
};

/**
 * Attaches the authenticated JWT session cookie and anti-CSRF token to the response.
 * @param {Object} res - Express response object
 * @param {string} token - Signed JWT
 */
export const setAuthCookies = (res, token) => {
  const options = getCookieOptions();

  // 1. Primary Authentication Cookie (httpOnly)
  res.cookie(AUTH_COOKIE_NAME, token, options);

  // 2. Anti-CSRF Synchronizer Token Cookie (readable by client for header echo)
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // SPA reads this cookie and reflects it in request headers
    secure: options.secure,
    sameSite: options.sameSite,
    maxAge: options.maxAge,
    path: '/'
  });

  return csrfToken;
};

/**
 * Clears authentication and CSRF cookies on logout or session invalidation.
 * @param {Object} res - Express response object
 */
export const clearAuthCookies = (res) => {
  const options = getCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, { ...options, maxAge: 0 });
  res.clearCookie(CSRF_COOKIE_NAME, { ...options, httpOnly: false, maxAge: 0 });
};

export default {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  getCookieOptions,
  setAuthCookies,
  clearAuthCookies
};
