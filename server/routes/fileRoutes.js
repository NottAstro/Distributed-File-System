const express = require('express');
const fileController = require('../controllers/fileController');
const authenticate = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

const router = express.Router();

// All file routes require authentication
router.use(authenticate);

// POST /api/files/upload — Upload a file (chunked + distributed)
router.post('/upload', upload.single('file'), fileController.upload);

// GET /api/files — List all user's files
router.get('/', fileController.listFiles);

// GET /api/files/:id — Get file details
router.get('/:id', fileController.getFile);

// GET /api/files/:id/download — Download a file (reassembled)
router.get('/:id/download', fileController.download);

// DELETE /api/files/:id — Delete a file and its chunks
router.delete('/:id', fileController.deleteFile);

module.exports = router;
