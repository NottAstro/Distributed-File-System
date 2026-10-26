const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');

/**
 * Multer Upload Middleware
 *
 * Handles multipart file uploads. Files are temporarily stored in
 * server/uploads/ before being chunked and distributed to storage nodes.
 *
 * SECURITY:
 * - Max file size: MAX_UPLOAD_BYTES (100MB default)
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
        // Random temp name — the user's filename never touches the filesystem,
        // so long, odd or path-like names can't cause write errors or traversal.
        cb(null, `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.part`);
    },
});

const upload = multer({
    storage,
    // Browsers send filenames as raw UTF-8. Multer's default (latin1) turns
    // "résumé.pdf" or "照片.jpg" into mojibake.
    defParamCharset: 'utf8',
    limits: {
        fileSize: config.maxUploadBytes,
        files: 1,
        fields: 10,
    },
});

module.exports = upload;
