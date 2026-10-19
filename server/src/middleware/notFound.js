/**
 * Centralized 404 Not Found Middleware
 * Invoked when no matching route is found in the Express router
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`
    }
  });
};

export default notFoundHandler;
