/**
 * Express error handling middleware
 */

import createError from 'http-errors';

/**
 * Custom API error class for consistent error responses
 */
export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.isApiError = true;
  }
}

/**
 * 404 Not Found handler
 * Converts unmatched routes to 404 errors
 */
export function notFoundHandler(req, res, next) {
  next(createError(404));
}

/**
 * Determines if request expects JSON response
 * @param {Request} req - Express request
 * @returns {boolean}
 */
function wantsJson(req) {
  // API routes or explicit JSON accept header
  return (
    req.path.startsWith('/proxy') ||
    req.path.startsWith('/sync') ||
    req.path.startsWith('/sage_hook') ||
    req.xhr ||
    req.accepts('json', 'html') === 'json'
  );
}

/**
 * Global error handler
 * Returns JSON for API routes, renders HTML for view routes
 */
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const isDev = req.app.get('env') === 'development';

  // Log error in development
  if (isDev) {
    console.error('Error:', err);
  }

  // Return JSON for API routes
  if (wantsJson(req)) {
    const response = {
      error: err.message || 'Internal server error',
    };

    if (err.details) {
      response.details = err.details;
    }

    if (isDev && err.stack) {
      response.stack = err.stack;
    }

    return res.status(status).json(response);
  }

  // Render HTML for view routes
  res.locals.message = err.message;
  res.locals.error = isDev ? err : {};
  res.status(status);
  res.render('error');
}
