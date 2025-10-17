const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`Error in ${req.method} ${req.path}:`, {
    error: err.message,
    stack: err.stack,
    body: req.body,
    userId: req.user?.uid,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Authentication required';
  } else if (err.code === 'auth/id-token-expired') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.code === 'auth/invalid-id-token') {
    statusCode = 401;  
    message = 'Invalid token';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
    message = 'Rate limit exceeded';
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong';
  }

  const errorResponse = {
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err.message 
    })
  };

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;