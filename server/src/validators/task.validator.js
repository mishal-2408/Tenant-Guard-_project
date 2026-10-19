import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    projectId: z
      .string({ required_error: 'Parent project ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID format'),
    title: z
      .string({ required_error: 'Task title is required' })
      .trim()
      .min(2, 'Task title must be at least 2 characters')
      .max(200, 'Task title cannot exceed 200 characters'),
    description: z
      .string()
      .trim()
      .max(10000, 'Description cannot exceed 10000 characters')
      .optional()
      .default(''),
    status: z
      .enum(['todo', 'in_progress', 'in_review', 'done'])
      .optional()
      .default('todo'),
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'])
      .optional()
      .default('medium'),
    assignedTo: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid assignee ID format')
      .nullable()
      .optional()
      .default(null),
    dueDate: z.string().datetime().nullable().optional(),
    tags: z.array(z.string().trim().max(30)).optional().default([])
  }).strict()
});

export const updateTaskSchema = z.object({
  body: z.object({
    projectId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID format')
      .optional(),
    title: z
      .string()
      .trim()
      .min(2, 'Task title must be at least 2 characters')
      .max(200, 'Task title cannot exceed 200 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(10000, 'Description cannot exceed 10000 characters')
      .optional(),
    status: z
      .enum(['todo', 'in_progress', 'in_review', 'done'])
      .optional(),
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'])
      .optional(),
    assignedTo: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid assignee ID format')
      .nullable()
      .optional(),
    dueDate: z.string().datetime().nullable().optional(),
    tags: z.array(z.string().trim().max(30)).optional()
  }).strict()
});

export default {
  createTaskSchema,
  updateTaskSchema
};
