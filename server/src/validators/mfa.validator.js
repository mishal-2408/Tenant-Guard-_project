import { z } from 'zod';

export const verifyMfaSetupSchema = z.object({
  body: z.object({
    token: z
      .string({ required_error: 'Verification code is required' })
      .trim()
      .regex(/^[0-9]{6}$/, 'Verification code must be exactly 6 numeric digits')
  }).strict()
});

export const verifyMfaLoginSchema = z.object({
  body: z.object({
    mfaToken: z
      .string({ required_error: 'Pre-authentication token is required' })
      .trim()
      .min(10, 'Invalid pre-authentication token'),
    token: z
      .string({ required_error: 'Verification code is required' })
      .trim()
      .regex(/^[0-9]{6}$/, 'Verification code must be exactly 6 numeric digits')
  }).strict()
});

export const disableMfaSchema = z.object({
  body: z.object({
    password: z
      .string({ required_error: 'Current account password is required' })
      .min(1, 'Password is required'),
    token: z
      .string({ required_error: 'Verification code is required' })
      .trim()
      .regex(/^[0-9]{6}$/, 'Verification code must be exactly 6 numeric digits')
  }).strict()
});

export default {
  verifyMfaSetupSchema,
  verifyMfaLoginSchema,
  disableMfaSchema
};
