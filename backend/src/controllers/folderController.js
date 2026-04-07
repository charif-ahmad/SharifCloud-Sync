const pool = require('../config/db');

/**
 * POST /api/folders
 * Create a new folder
 */
async function createFolder(req, res, next) {
  try {
    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Folder name is required.',
        status: 400,
      });
    }

    const folderName = name.trim();

    // Validate folder name (no slashes or special chars that break filesystem)
    if (/[<>:"/\\|?*]/.test(folderName)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Folder name contains invalid characters.',
        status: 400,
      });
    }

    // If parentId provided, verify it exists
    if (parentId) {
      const parentCheck = await pool.query('SELECT id FROM folders WHERE id = $1', [parentId]);
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Parent folder not found.',
          status: 404,
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO folders (name, parent_id)
       VALUES ($1, $2)
       RETURNING id, name, parent_id, created_at`,
      [folderName, parentId || null]
    );

    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      parentId: result.rows[0].parent_id,
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    // Duplicate folder name in same parent
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A folder with this name already exists in the same location.',
        status: 409,
      });
    }
    next(error);
  }
}

/**
 * GET /api/folders
 * List all folders, optionally filtered by parentId
 */
async function listFolders(req, res, next) {
  try {
    const { parentId } = req.query;

    let query, params;

    if (parentId === 'root' || parentId === '') {
      // Get root-level folders (no parent)
      query = `
        SELECT f.id, f.name, f.parent_id, f.created_at,
               COUNT(p.id) AS photo_count,
               (SELECT COUNT(*) FROM folders cf WHERE cf.parent_id = f.id) AS subfolder_count
        FROM folders f
        LEFT JOIN photos p ON p.folder_id = f.id
        WHERE f.parent_id IS NULL
        GROUP BY f.id
        ORDER BY f.name ASC
      `;
      params = [];
    } else if (parentId) {
      // Get children of a specific folder
      query = `
        SELECT f.id, f.name, f.parent_id, f.created_at,
               COUNT(p.id) AS photo_count,
               (SELECT COUNT(*) FROM folders cf WHERE cf.parent_id = f.id) AS subfolder_count
        FROM folders f
        LEFT JOIN photos p ON p.folder_id = f.id
        WHERE f.parent_id = $1
        GROUP BY f.id
        ORDER BY f.name ASC
      `;
      params = [parentId];
    } else {
      // Get all folders
      query = `
        SELECT f.id, f.name, f.parent_id, f.created_at,
               COUNT(p.id) AS photo_count,
               (SELECT COUNT(*) FROM folders cf WHERE cf.parent_id = f.id) AS subfolder_count
        FROM folders f
        LEFT JOIN photos p ON p.folder_id = f.id
        GROUP BY f.id
        ORDER BY f.name ASC
      `;
      params = [];
    }

    const result = await pool.query(query, params);

    res.json({
      folders: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        parentId: row.parent_id,
        photoCount: parseInt(row.photo_count, 10),
        subfolderCount: parseInt(row.subfolder_count, 10),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/folders/:id
 * Get a specific folder with its path (breadcrumb)
 */
async function getFolder(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT f.id, f.name, f.parent_id, f.created_at,
              COUNT(p.id) AS photo_count
       FROM folders f
       LEFT JOIN photos p ON p.folder_id = f.id
       WHERE f.id = $1
       GROUP BY f.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Folder not found.',
        status: 404,
      });
    }

    // Build breadcrumb path
    const breadcrumb = [];
    let currentId = id;
    while (currentId) {
      const folder = await pool.query('SELECT id, name, parent_id FROM folders WHERE id = $1', [currentId]);
      if (folder.rows.length === 0) break;
      breadcrumb.unshift({ id: folder.rows[0].id, name: folder.rows[0].name });
      currentId = folder.rows[0].parent_id;
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      photoCount: parseInt(row.photo_count, 10),
      breadcrumb,
      createdAt: row.created_at,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/folders/:id
 * Rename a folder
 */
async function renameFolder(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New folder name is required.',
        status: 400,
      });
    }

    const folderName = name.trim();

    if (/[<>:"/\\|?*]/.test(folderName)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Folder name contains invalid characters.',
        status: 400,
      });
    }

    const result = await pool.query(
      `UPDATE folders SET name = $1 WHERE id = $2
       RETURNING id, name, parent_id, created_at`,
      [folderName, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Folder not found.',
        status: 404,
      });
    }

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      parentId: result.rows[0].parent_id,
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A folder with this name already exists in the same location.',
        status: 409,
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/folders/:id
 * Delete a folder (Cascade delete: deletes all subfolders, and physically deletes all photos inside)
 */
async function deleteFolder(req, res, next) {
  const client = await pool.connect();
  const fs = require('fs');
  const path = require('path');
  const config = require('../config');

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Check folder exists
    const check = await client.query('SELECT id FROM folders WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Not Found',
        message: 'Folder not found.',
        status: 404,
      });
    }

    // CTE to recursively find all subfolders
    const allFoldersQuery = `
      WITH RECURSIVE folder_tree AS (
        SELECT id FROM folders WHERE id = $1
        UNION ALL
        SELECT f.id FROM folders f
        INNER JOIN folder_tree ft ON f.parent_id = ft.id
      )
      SELECT id FROM folder_tree
    `;
    const folderResult = await client.query(allFoldersQuery, [id]);
    const folderIds = folderResult.rows.map(row => row.id);

    // Get all photos in these folders
    const photosQuery = `SELECT id, file_path FROM photos WHERE folder_id = ANY($1::uuid[])`;
    const photosResult = await client.query(photosQuery, [folderIds]);
    
    // Delete physical files
    for (const photo of photosResult.rows) {
      const absolutePath = path.join(config.storage.uploadDir, photo.file_path);
      if (fs.existsSync(absolutePath)) {
        try {
          fs.unlinkSync(absolutePath);
        } catch (e) {
          console.error(`Failed to delete physical file: ${absolutePath}`, e);
        }
      }
    }

    // Delete photos from DB
    if (photosResult.rows.length > 0) {
      await client.query(`DELETE FROM photos WHERE folder_id = ANY($1::uuid[])`, [folderIds]);
    }

    // Delete folder (subfolders cascade due to ON DELETE CASCADE)
    await client.query('DELETE FROM folders WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ deleted: true, id, photosDeleted: photosResult.rows.length });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * PUT /api/photos/:id/move
 * Move a photo to a different folder
 */
async function movePhoto(req, res, next) {
  try {
    const { id } = req.params;
    const { folderId } = req.body;

    // If folderId is null, move to root (unassigned)
    if (folderId) {
      const folderCheck = await pool.query('SELECT id FROM folders WHERE id = $1', [folderId]);
      if (folderCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Target folder not found.',
          status: 404,
        });
      }
    }

    const result = await pool.query(
      `UPDATE photos SET folder_id = $1 WHERE id = $2
       RETURNING id, folder_id`,
      [folderId || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Photo not found.',
        status: 404,
      });
    }

    res.json({
      id: result.rows[0].id,
      folderId: result.rows[0].folder_id,
      message: folderId ? 'Photo moved to folder.' : 'Photo moved to root.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/folders/:id/move
 * Move a folder to a new parent folder or root
 */
async function moveFolder(req, res, next) {
  try {
    const { id } = req.params;
    const { parentId } = req.body;

    // Prevent moving folder into itself
    if (id === parentId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot move a folder into itself.',
        status: 400,
      });
    }

    // CTE to recursively find all subfolders (to prevent circular loops)
    if (parentId) {
      const allFoldersQuery = `
        WITH RECURSIVE folder_tree AS (
          SELECT id FROM folders WHERE id = $1
          UNION ALL
          SELECT f.id FROM folders f
          INNER JOIN folder_tree ft ON f.parent_id = ft.id
        )
        SELECT id FROM folder_tree
      `;
      const folderResult = await pool.query(allFoldersQuery, [id]);
      const subfolderIds = folderResult.rows.map(row => row.id);

      if (subfolderIds.includes(parentId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Cannot move a folder into one of its own subfolders.',
          status: 400,
        });
      }

      // Check if target parent exists
      const parentCheck = await pool.query('SELECT id FROM folders WHERE id = $1', [parentId]);
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Target parent folder not found.',
          status: 404,
        });
      }
    }

    const result = await pool.query(
      `UPDATE folders SET parent_id = $1 WHERE id = $2
       RETURNING id, name, parent_id`,
      [parentId || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Folder not found.',
        status: 404,
      });
    }

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      parentId: result.rows[0].parent_id,
      message: parentId ? 'Folder moved successfully.' : 'Folder moved to root.',
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A folder with this name already exists in the destination.',
        status: 409,
      });
    }
    next(error);
  }
}

module.exports = {
  createFolder,
  listFolders,
  getFolder,
  renameFolder,
  deleteFolder,
  movePhoto,
  moveFolder,
};
