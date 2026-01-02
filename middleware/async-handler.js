/**
 * Async handler wrapper for Express routes
 * Catches async errors and forwards them to Express error handling
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
