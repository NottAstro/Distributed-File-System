const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Multer Upload Middleware
 *
 * Handles multipart file uploads. Files are temporarily stored in
 * server/uploads/ before being chunked and distributed to storage nodes.
 *
 * SECURITY:
 * - Max file size: 100MB
 * - uploads/ directory is gitignored
 * - Files are deleted after chunking (not kept in uploads/)
 */

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Unique filename: timestamp_randomstring_originalname
        const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        cb(null, `${uniqueSuffix}_${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
    },
});

module.exports = upload;
