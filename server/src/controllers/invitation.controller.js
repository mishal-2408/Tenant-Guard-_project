import invitationService from '../services/invitation.service.js';
import { setAuthCookies } from '../utils/cookie.util.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createInvitation = asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  const result = await invitationService.createInvitation({
    organizationId: req.organizationId,
    actor: req.user,
    email,
    role,
    req
  });

  res.status(201).json({
    success: true,
    data: {
      invitation: result.invitation,
      rawToken: result.rawToken,
      invitationUrl: `/accept-invitation?token=${result.rawToken}`
    },
    message: 'Invitation generated successfully.'
  });
});

export const listInvitations = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await invitationService.listInvitations({
    organizationId: req.organizationId,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    data: result.invitations,
    pagination: result.pagination
  });
});

export const revokeInvitation = asyncHandler(async (req, res) => {
  const invitation = await invitationService.revokeInvitation({
    organizationId: req.organizationId,
    invitationId: req.params.id,
    req
  });

  if (!invitation) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'INVITATION_NOT_FOUND',
        message: 'The requested invitation was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    data: invitation,
    message: 'Invitation revoked successfully.'
  });
});

export const verifyInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const result = await invitationService.verifyInvitationToken(token);

  if (!result.valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVITATION_INVALID',
        message: result.message
      }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      email: result.email,
      role: result.role,
      organizationName: result.organizationName,
      organizationSlug: result.organizationSlug
    }
  });
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const { token, firstName, lastName, password } = req.body;

  const result = await invitationService.acceptInvitation({
    token,
    firstName,
    lastName,
    password,
    req
  });

  // Attach session cookies so user is automatically authenticated
  setAuthCookies(res, result.token);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      organization: result.organization
    },
    message: 'Invitation accepted and account activated successfully.'
  });
});

export default {
  createInvitation,
  listInvitations,
  revokeInvitation,
  verifyInvitation,
  acceptInvitation
};
