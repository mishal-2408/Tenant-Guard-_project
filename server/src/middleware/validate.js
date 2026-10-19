import { ZodError } from 'zod';

/**
 * Reusable middleware that validates inbound request properties against a Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    const validated = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params
    });

    // Replace request parts with sanitized & validated versions
    if (validated.body) req.body = validated.body;
    if (validated.query) req.query = validated.query;
    if (validated.params) req.params = validated.params;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.slice(1).join('.'), // Strip 'body' or 'query' prefix
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request input validation failed.',
          details: formattedErrors
        }
      });
    }

    next(error);
  }
};

export default validate;
