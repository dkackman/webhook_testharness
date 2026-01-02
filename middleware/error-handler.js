/**
 * Express error handling middleware
 */

import createError from 'http-errors';

/**
 * 404 Not Found handler
 * Converts unmatched routes to 404 errors
 */
export function notFoundHandler(req, res, next) {
  next(createError(404));
}

/**
 * Global error handler
 * Renders error page with appropriate status and message
 */
export function errorHandler(err, req, res, _next) {
  // Set locals for error template
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
}
