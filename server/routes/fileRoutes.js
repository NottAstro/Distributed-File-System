const express = require('express');
const rateLimit = require('express-rate-limit');
const fileController = require('../controllers/fileController');
const authenticate = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

const router = express.Router();

// All file routes require authentication
router.use(authenticate);

// Upload rate limit: 300 files per 15 minutes per USER (not IP — behind the
// Vercel proxy every user can share an IP). Folder uploads send one request
// per file, so this has to be generous.
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `user:${req.user.id}`,
    message: {
        success: false,
        error: { message: 'Upload limit reached. Please try again later.' },
    },
});

// POST /api/files/upload — Upload a file (chunked + distributed)
// Optional fields: folderId, relativePath (for folder uploads)
router.post('/upload', uploadLimiter, upload.single('file'), fileController.upload);

// GET /api/files — List all user's files
router.get('/', fileController.listFiles);

// GET /api/files/:id — Get file details
router.get('/:id', fileController.getFile);

// GET /api/files/:id/download — Download a file (reassembled)
router.get('/:id/download', fileController.download);

// DELETE /api/files/:id — Delete a file and its chunks
router.delete('/:id', fileController.deleteFile);

module.exports = router;
