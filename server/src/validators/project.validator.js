import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Project name is required' })
      .trim()
      .min(2, 'Project name must be at least 2 characters')
      .max(100, 'Project name cannot exceed 100 characters'),
    key: z
      .string({ required_error: 'Project key is required' })
      .trim()
      .toUpperCase()
      .min(2, 'Project key must be at least 2 characters')
      .max(10, 'Project key cannot exceed 10 characters')
      .regex(/^[A-Z0-9]+$/, 'Project key must only contain uppercase alphanumeric characters'),
    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional()
      .default(''),
    status: z
      .enum(['planning', 'active', 'on_hold', 'completed', 'archived'])
      .optional()
      .default('planning'),
    members: z
      .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid member ID format'))
      .optional()
      .default([]),
    startDate: z.string().datetime().nullable().optional(),
    targetDate: z.string().datetime().nullable().optional()
  }).strict()
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Project name must be at least 2 characters')
      .max(100, 'Project name cannot exceed 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),
    status: z
      .enum(['planning', 'active', 'on_hold', 'completed', 'archived'])
      .optional(),
    members: z
      .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid member ID format'))
      .optional(),
    startDate: z.string().datetime().nullable().optional(),
    targetDate: z.string().datetime().nullable().optional()
  }).strict()
});

export default {
  createProjectSchema,
  updateProjectSchema
};
