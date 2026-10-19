import { z } from 'zod';

export const updateAlertStatusSchema = z.object({
  body: z.object({
    status: z.enum(['open', 'acknowledged', 'resolved'], {
      required_error: 'Alert status is required'
    })
  }).strict()
});

export const updateMfaPolicySchema = z.object({
  body: z.object({
    enforceMfa: z.boolean({
      required_error: 'enforceMfa boolean flag is required'
    })
  }).strict()
});

export default {
  updateAlertStatusSchema,
  updateMfaPolicySchema
};
