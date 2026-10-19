import { z } from 'zod';

export const createInvitationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Invitee email is required' })
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
    role: z.enum(['org_admin', 'project_manager', 'member', 'viewer'], {
      required_error: 'Intended role is required'
    })
  }).strict()
});

export const acceptInvitationSchema = z.object({
  body: z.object({
    token: z
      .string({ required_error: 'Invitation token is required' })
      .trim()
      .min(16, 'Invitation token is invalid'),
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(1, 'First name is required')
      .max(50, 'First name cannot exceed 50 characters'),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(1, 'Last name is required')
      .max(50, 'Last name cannot exceed 50 characters'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters')
  }).strict()
});

export default {
  createInvitationSchema,
  acceptInvitationSchema
};
