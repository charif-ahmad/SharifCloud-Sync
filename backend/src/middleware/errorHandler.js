/**
 * Global Error Handling Middleware
 * Catches all unhandled errors and returns a consistent JSON response.
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'File size exceeds the 25 MB limit.',
      status: 413,
    });
  }

  // Multer invalid file type
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: 'Bad Request',
      message: err.message,
      status: 400,
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong.',
    status: statusCode,
  });
}

module.exports = errorHandler;
