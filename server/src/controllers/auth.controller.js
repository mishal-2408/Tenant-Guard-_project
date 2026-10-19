import authService from '../services/auth.service.js';
import mfaService from '../services/mfa.service.js';
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
 * @desc    Authenticates user, handles lockout, issues session cookie or MFA challenge
 * @access  Public (Rate-limited, Zod-validated)
 */
export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser({
    ...req.body,
    req
  });

  // Multi-Factor Authentication Challenge Flow
  if (result.mfaRequired) {
    return res.status(200).json({
      success: true,
      mfaRequired: true,
      mfaToken: result.mfaToken,
      user: result.user,
      message: 'Multi-factor authentication required. Please enter your 6-digit TOTP code.'
    });
  }

  // Standard non-MFA flow: Attach secure httpOnly authentication cookie and anti-CSRF cookie
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
 * @route   POST /api/auth/mfa/verify-login
 * @desc    Verifies TOTP code against pre-auth token and issues full session cookies
 * @access  Public (Pre-auth token required)
 */
export const verifyMfaLogin = asyncHandler(async (req, res) => {
  const { mfaToken, token } = req.body;

  const result = await mfaService.verifyMfaLogin({
    mfaToken,
    token,
    req
  });

  // Attach full-access session cookies
  setAuthCookies(res, result.token);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      organization: result.organization
    },
    message: 'Two-factor authentication verified successfully.'
  });
});

/**
 * @route   POST /api/auth/mfa/setup
 * @desc    Generates TOTP secret and QR code for enrollment
 * @access  Authenticated
 */
export const setupMfa = asyncHandler(async (req, res) => {
  const result = await mfaService.setupMfa({
    userId: req.user._id,
    req
  });

  res.status(200).json({
    success: true,
    data: result,
    message: 'Scan the QR code with your authenticator app and enter the 6-digit code to complete setup.'
  });
});

/**
 * @route   POST /api/auth/mfa/verify-setup
 * @desc    Verifies the initial code to activate MFA on the user account
 * @access  Authenticated
 */
export const verifyMfaSetup = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const result = await mfaService.verifyMfaSetup({
    userId: req.user._id,
    token,
    req
  });

  res.status(200).json({
    success: true,
    message: result.message
  });
});

/**
 * @route   POST /api/auth/mfa/disable
 * @desc    Disables MFA after validating current password and a valid TOTP code
 * @access  Authenticated
 */
export const disableMfa = asyncHandler(async (req, res) => {
  const { password, token } = req.body;

  const result = await mfaService.disableMfa({
    userId: req.user._id,
    password,
    token,
    req
  });

  res.status(200).json({
    success: true,
    message: result.message
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
  verifyMfaLogin,
  setupMfa,
  verifyMfaSetup,
  disableMfa,
  logout,
  getMe
};
