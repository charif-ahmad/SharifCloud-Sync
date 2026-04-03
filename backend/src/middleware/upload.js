const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Creates date-based upload directory: uploads/YYYY/MM/DD/
 */
function getUploadDir() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const dir = path.join(config.storage.uploadDir, String(year), month, day);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Multer storage configuration
 * Saves files with UUID names in date-organized folders
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getUploadDir();
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

/**
 * File filter — only allow image types
 */
function fileFilter(req, file, cb) {
  if (config.storage.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      `Invalid file type: ${file.mimetype}. Allowed: ${config.storage.allowedMimeTypes.join(', ')}`
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
}

// Single file upload
const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.storage.maxFileSize },
}).single('photo');

// Multiple file upload (for batch sync)
const uploadBatch = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.storage.maxFileSize },
}).array('photos', 10); // Max 10 files per batch

module.exports = { uploadSingle, uploadBatch };
