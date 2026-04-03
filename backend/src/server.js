const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes/api');

const app = express();

// ─────────────────────────────────────
// Security & Middleware
// ─────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
}));
app.use(morgan('dev'));
app.use(express.json());

// ─────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Try again later.',
    status: 429,
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error: 'Too Many Requests',
    message: 'Upload rate limit exceeded.',
    status: 429,
  },
});

app.use('/api', generalLimiter);
app.use('/api/photos/upload', uploadLimiter);
app.use('/api/photos/batch', rateLimit({ windowMs: 60 * 1000, max: 5 }));

// ─────────────────────────────────────
// Authentication
// ─────────────────────────────────────
app.use('/api', authMiddleware);

// ─────────────────────────────────────
// Ensure uploads directory exists
// ─────────────────────────────────────
fs.mkdirSync(config.storage.uploadDir, { recursive: true });

// ─────────────────────────────────────
// Routes
// ─────────────────────────────────────
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'SharifCloud-Sync API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// ─────────────────────────────────────
// Error Handler (must be last)
// ─────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────
// Start Server
// ─────────────────────────────────────
app.listen(config.port, () => {
  console.log('');
  console.log('  ☁️  SharifCloud-Sync API');
  console.log(`  🌍  Environment: ${config.env}`);
  console.log(`  🚀  Server running on: http://localhost:${config.port}`);
  console.log(`  📂  Upload directory: ${config.storage.uploadDir}`);
  console.log('');
});

module.exports = app;
