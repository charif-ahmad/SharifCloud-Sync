const config = require('../config');

/**
 * API Key Authentication Middleware
 * Validates the X-API-Key header against the configured key.
 */
function authMiddleware(req, res, next) {
  // Skip auth for health check endpoint
  // When mounted at /api, req.path is /health (not /api/health)
  if (req.path === '/health') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing API key. Include X-API-Key header.',
      status: 401,
    });
  }

  if (apiKey !== config.auth.apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key.',
      status: 401,
    });
  }

  next();
}

module.exports = authMiddleware;
