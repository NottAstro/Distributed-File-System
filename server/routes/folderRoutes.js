const express = require('express');
const folderController = require('../controllers/folderController');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

// All folder routes require authentication
router.use(authenticate);

// GET /api/folders — Every folder the user owns (flat)
router.get('/', folderController.listAll);

// POST /api/folders — Create a folder { name, parentId? }
router.post('/', folderController.create);

// GET /api/folders/root/contents | /api/folders/:id/contents — Subfolders + files
router.get('/:id/contents', folderController.contents);

// PATCH /api/folders/:id — Rename { name }
router.patch('/:id', folderController.rename);

// DELETE /api/folders/:id — Delete folder and everything inside it
router.delete('/:id', folderController.remove);

module.exports = router;
