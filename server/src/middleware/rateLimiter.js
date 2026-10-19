import rateLimit from 'express-rate-limit';

/**
 * Authentication Route Rate Limiter
 * Limits repeated authentication requests to prevent brute-force attacks.
 * In testing environments (NODE_ENV === 'test'), rate limits are relaxed to prevent test interference.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 10, // 10 attempts per IP in production/dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts from this IP address. Please try again in 15 minutes.'
    }
  }
});

export default {
  authLimiter
};
