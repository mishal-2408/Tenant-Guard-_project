/**
 * Centralized Error-Handling Middleware
 * Sanitizes errors and returns consistent, safe JSON error envelopes.
 * Prevents raw MongoDB internals or stack traces from leaking to clients in production.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal error occurred.';
  let details = err.details || [];

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed for one or more fields.';
    details = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
      kind: val.kind
    }));
  }

  // Mongoose Invalid ObjectId CastError
  else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = `Invalid resource identifier format: '${err.value}'.`;
    details = [{ field: err.path, value: err.value }];
  }

  // MongoDB Duplicate Key Error (Code 11000)
  else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    const duplicateFields = Object.keys(err.keyValue || {});
    message = `A record with the given ${duplicateFields.join(', ')} already exists.`;
    details = err.keyValue;
  }

  // JSON Parse Error (e.g. malformed JSON in request body)
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Request body contains malformed JSON syntax.';
  }

  // Log error details server-side (safe from client view)
  if (statusCode >= 500) {
    console.error(`[Server Error] [${req.method} ${req.originalUrl}]:`, err);
  }

  const responsePayload = {
    success: false,
    error: {
      code,
      message,
      ...(details && (Array.isArray(details) ? details.length > 0 : Object.keys(details).length > 0) && { details })
    }
  };

  // Only expose stack traces in explicit development mode
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    responsePayload.error.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};

export default errorHandler;
