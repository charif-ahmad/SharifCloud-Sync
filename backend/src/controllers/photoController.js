const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const config = require('../config');

/**
 * GET /api/health
 * Server health check (used by client heartbeat)
 */
async function healthCheck(req, res) {
  try {
    // Quick DB check
    await pool.query('SELECT 1');

    res.json({
      status: 'online',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      message: 'Database connection issue',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * POST /api/auth
 * Validate API key (simple check — auth is done via middleware)
 */
function authenticate(req, res) {
  res.json({
    authenticated: true,
    message: 'Welcome back, Sharif ☁️',
  });
}

/**
 * POST /api/photos/upload
 * Upload a single photo
 */
async function uploadPhoto(req, res, next) {
  const client = await pool.connect();

  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No photo file provided.',
        status: 400,
      });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;
    const clientHash = req.body.hash;
    const takenAt = req.body.takenAt || null;
    const folderId = req.body.folderId || null;

    // Generate server-side hash for verification
    const fileBuffer = fs.readFileSync(filePath);
    const serverHash = 'sha256:' + crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Use client hash if provided, otherwise use server-generated hash
    const hash = clientHash || serverHash;

    // Compute relative path for portability
    const relativePath = path.relative(config.storage.uploadDir, filePath).split(path.sep).join('/');

    await client.query('BEGIN');

    // Check for duplicates
    const dupCheck = await client.query(
      'SELECT id FROM photos WHERE hash = $1',
      [hash]
    );

    if (dupCheck.rows.length > 0) {
      // Delete the uploaded file since it's a duplicate
      fs.unlinkSync(filePath);
      await client.query('ROLLBACK');

      return res.status(409).json({
        error: 'Duplicate',
        message: 'Photo with this hash already exists.',
        existingId: dupCheck.rows[0].id,
      });
    }

    // Insert metadata
    const result = await client.query(
      `INSERT INTO photos (file_name, original_name, file_path, file_size, mime_type, hash, folder_id, taken_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, file_name, file_path, file_size, mime_type, hash, folder_id, uploaded_at`,
      [filename, originalname, relativePath, size, mimetype, hash, folderId, takenAt]
    );

    await client.query('COMMIT');

    res.status(201).json({
      id: result.rows[0].id,
      fileName: result.rows[0].file_name,
      originalName: originalname,
      filePath: result.rows[0].file_path,
      fileSize: result.rows[0].file_size,
      mimeType: result.rows[0].mime_type,
      hash: result.rows[0].hash,
      folderId: result.rows[0].folder_id,
      uploadedAt: result.rows[0].uploaded_at,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    next(error);
  } finally {
    client.release();
  }
}

/**
 * POST /api/photos/batch
 * Upload multiple photos (for offline sync queue drain)
 */
async function batchUpload(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No photo files provided.',
        status: 400,
      });
    }

    let metadataArray = [];
    if (req.body.metadata) {
      try {
        metadataArray = JSON.parse(req.body.metadata);
      } catch {
        metadataArray = [];
      }
    }

    const results = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const meta = metadataArray[i] || {};
      const client = await pool.connect();

      try {
        const fileBuffer = fs.readFileSync(file.path);
        const serverHash = 'sha256:' + crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const hash = meta.hash || serverHash;
        const relativePath = path.relative(config.storage.uploadDir, file.path).split(path.sep).join('/');

        await client.query('BEGIN');

        // Check duplicate
        const dupCheck = await client.query('SELECT id FROM photos WHERE hash = $1', [hash]);

        if (dupCheck.rows.length > 0) {
          fs.unlinkSync(file.path);
          await client.query('ROLLBACK');
          results.push({ index: i, status: 'duplicate', existingId: dupCheck.rows[0].id });
          continue;
        }

        const result = await client.query(
          `INSERT INTO photos (file_name, original_name, file_path, file_size, mime_type, hash, folder_id, taken_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [file.filename, file.originalname, relativePath, file.size, file.mimetype, hash, meta.folderId || null, meta.takenAt || null]
        );

        await client.query('COMMIT');
        results.push({ index: i, status: 'created', id: result.rows[0].id });
      } catch (error) {
        await client.query('ROLLBACK');
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        results.push({ index: i, status: 'failed', error: error.message });
      } finally {
        client.release();
      }
    }

    res.json({
      total: req.files.length,
      successful: results.filter((r) => r.status === 'created').length,
      duplicates: results.filter((r) => r.status === 'duplicate').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/photos
 * List photos with pagination
 */
async function listPhotos(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const sort = ['uploaded_at', 'file_size', 'file_name'].includes(req.query.sort)
      ? req.query.sort
      : 'uploaded_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;
    const { folderId } = req.query;

    // Build WHERE clause based on folder filter
    let whereClause = '';
    let countParams = [];
    let queryParams = [limit, offset];

    if (folderId === 'root') {
      // Photos not in any folder
      whereClause = 'WHERE folder_id IS NULL';
    } else if (folderId) {
      // Photos in a specific folder
      whereClause = 'WHERE folder_id = $3';
      countParams = [folderId];
      queryParams = [limit, offset, folderId];
    }

    const countQuery = folderId === 'root'
      ? 'SELECT COUNT(*) FROM photos WHERE folder_id IS NULL'
      : folderId
        ? 'SELECT COUNT(*) FROM photos WHERE folder_id = $1'
        : 'SELECT COUNT(*) FROM photos';

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT id, file_name, original_name, file_size, mime_type, folder_id, uploaded_at
       FROM photos
       ${whereClause}
       ORDER BY ${sort} ${order}
       LIMIT $1 OFFSET $2`,
      queryParams
    );

    res.json({
      photos: result.rows.map((row) => ({
        id: row.id,
        fileName: row.file_name,
        originalName: row.original_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        folderId: row.folder_id,
        uploadedAt: row.uploaded_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/photos/:id
 * Download a specific photo
 */
async function getPhoto(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT file_name, file_path, mime_type FROM photos WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Photo not found.',
        status: 404,
      });
    }

    const photo = result.rows[0];
    const absolutePath = path.join(config.storage.uploadDir, photo.file_path);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Photo file not found on disk.',
        status: 404,
      });
    }

    res.setHeader('Content-Type', photo.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${photo.file_name}"`);
    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/photos/:id
 * Delete a photo and its file
 */
async function deletePhoto(req, res, next) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const result = await client.query(
      'SELECT file_path FROM photos WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Not Found',
        message: 'Photo not found.',
        status: 404,
      });
    }

    const filePath = path.join(config.storage.uploadDir, result.rows[0].file_path);

    // Delete from database
    await client.query('DELETE FROM photos WHERE id = $1', [id]);

    // Delete file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await client.query('COMMIT');

    res.json({ deleted: true, id });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * GET /api/storage/stats
 * Get storage usage statistics
 */
async function getStorageStats(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM storage_stats');
    const stats = result.rows[0];

    res.json({
      totalPhotos: parseInt(stats.total_photos, 10),
      totalFolders: parseInt(stats.total_folders, 10),
      totalSize: stats.total_size_human,
      totalSizeBytes: parseInt(stats.total_size_bytes, 10),
      firstUpload: stats.first_upload,
      lastUpload: stats.last_upload,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  healthCheck,
  authenticate,
  uploadPhoto,
  batchUpload,
  listPhotos,
  getPhoto,
  deletePhoto,
  getStorageStats,
};
