import { z } from 'zod';

export const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['org_admin', 'project_manager', 'member', 'viewer'], {
      required_error: 'Role is required'
    })
  }).strict()
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'suspended'], {
      required_error: 'Status is required'
    })
  }).strict()
});

export default {
  updateRoleSchema,
  updateStatusSchema
};
