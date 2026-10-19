import authService from '../services/auth.service.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookie.util.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new organization and root Organization Admin
 * @access  Public (Rate-limited, Zod-validated)
 */
export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerOrganization({
    ...req.body,
    req
  });

  // Attach secure httpOnly authentication cookie and anti-CSRF cookie
  setAuthCookies(res, result.token);

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      organization: result.organization
    }
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates user, handles lockout, issues session cookie
 * @access  Public (Rate-limited, Zod-validated)
 */
export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser({
    ...req.body,
    req
  });

  // Attach secure httpOnly authentication cookie and anti-CSRF cookie
  setAuthCookies(res, result.token);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      organization: result.organization
    }
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Invalidates current session tokenVersion and clears cookies
 * @access  Authenticated
 */
export const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user, req);

  // Clear auth and CSRF cookies
  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully. All sessions with this token have been invalidated.'
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Returns current authenticated profile and organization context
 * @access  Authenticated
 */
export const getMe = asyncHandler(async (req, res) => {
  const profile = await authService.getAuthenticatedProfile(req.user._id);

  res.status(200).json({
    success: true,
    data: profile
  });
});

export default {
  register,
  login,
  logout,
  getMe
};
