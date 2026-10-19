import teamService from '../services/team.service.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listMembers = asyncHandler(async (req, res) => {
  const { search, role, status, page, limit } = req.query;

  const result = await teamService.listMembers({
    organizationId: req.organizationId,
    search,
    role,
    status,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    data: result.members,
    pagination: result.pagination
  });
});

export const getMember = asyncHandler(async (req, res) => {
  const member = await teamService.getMemberById({
    organizationId: req.organizationId,
    memberId: req.params.id,
    req
  });

  if (!member) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'MEMBER_NOT_FOUND',
        message: 'The requested team member was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    data: member
  });
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const member = await teamService.updateMemberRole({
    organizationId: req.organizationId,
    memberId: req.params.id,
    newRole: req.body.role,
    actor: req.user,
    req
  });

  if (!member) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'MEMBER_NOT_FOUND',
        message: 'The requested team member was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    data: member,
    message: 'Member role updated successfully. Active sessions will require re-authentication.'
  });
});

export const updateMemberStatus = asyncHandler(async (req, res) => {
  const member = await teamService.updateMemberStatus({
    organizationId: req.organizationId,
    memberId: req.params.id,
    newStatus: req.body.status,
    actor: req.user,
    req
  });

  if (!member) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'MEMBER_NOT_FOUND',
        message: 'The requested team member was not found.'
      }
    });
  }

  res.status(200).json({
    success: true,
    data: member,
    message: `Member status updated to ${req.body.status}.`
  });
});

export default {
  listMembers,
  getMember,
  updateMemberRole,
  updateMemberStatus
};
