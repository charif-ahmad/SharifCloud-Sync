const express = require('express');
const router = express.Router();
const { uploadSingle, uploadBatch } = require('../middleware/upload');
const photoController = require('../controllers/photoController');
const folderController = require('../controllers/folderController');

// ─── Health & Auth ──────────────────────────────
router.get('/health', photoController.healthCheck);
router.post('/auth', photoController.authenticate);

// ─── Folders ────────────────────────────────────
router.post('/folders', folderController.createFolder);
router.get('/folders', folderController.listFolders);
router.get('/folders/:id', folderController.getFolder);
router.put('/folders/:id', folderController.renameFolder);
router.delete('/folders/:id', folderController.deleteFolder);

// ─── Photos ─────────────────────────────────────
router.post('/photos/upload', (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) return next(err);
    photoController.uploadPhoto(req, res, next);
  });
});

router.post('/photos/batch', (req, res, next) => {
  uploadBatch(req, res, (err) => {
    if (err) return next(err);
    photoController.batchUpload(req, res, next);
  });
});

router.get('/photos', photoController.listPhotos);
router.get('/photos/:id', photoController.getPhoto);
router.delete('/photos/:id', photoController.deletePhoto);
router.put('/photos/:id/move', folderController.movePhoto);

// ─── Storage ────────────────────────────────────
router.get('/storage/stats', photoController.getStorageStats);

module.exports = router;
