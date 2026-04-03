const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
// .env is at backend/.env → from src/config/ go up 2 levels

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'sharifcloud',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
  },

  auth: {
    apiKey: process.env.API_KEY || 'sharif-cloud-secret-key-2026',
  },

  storage: {
    uploadDir: path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 25 * 1024 * 1024, // 25MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  },

  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CORS_ORIGIN || 'http://localhost:5173'
      : true, // Allow all origins in development (LAN access)
  },
};

module.exports = config;
