const fsp = require('fs/promises');
const pool = require('../config/db');
const chunkService = require('../services/chunkService');
const storageService = require('../services/storageService');
const folderService = require('../services/folderService');
const logger = require('../utils/logger');

const CHUNK_ROLES = ['Data 1', 'Data 2', 'Parity'];

function extensionOf(name) {
    const parts = String(name).split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : 'file';
}

/** DB status → API status. 'uploading' rows must map to something the UI knows. */
function apiStatus(status) {
    if (status === 'complete') return 'distributed';
    if (status === 'uploading') return 'processing';
    return 'failed';
}

/** Shape a `files` row for the client. Never includes server paths. */
function serializeFile(f) {
    return {
        id: String(f.id),
        folderId: f.folder_id ? String(f.folder_id) : null,
        name: f.original_name,
        size: Number(f.file_size),
        type: extensionOf(f.original_name),
        mimeType: f.mime_type || 'application/octet-stream',
        uploadedAt: f.created_at,
        status: apiStatus(f.status),
        chunks: f.total_chunks,
        nodes: Number(f.nodes_used || 0),
        redundancy: '2+1 XOR parity',
    };
}

const FILE_SELECT = `
    SELECT f.*,
        (SELECT COUNT(DISTINCT c.node_id) FROM chunks c WHERE c.file_id = f.id) AS nodes_used
    FROM files f`;

/** Remove a file's chunks from disk and its DB rows. Used for cleanup on failure. */
async function purgeFile(fileId) {
    const [chunks] = await pool.execute('SELECT * FROM chunks WHERE file_id = ?', [fileId]);
    await pool.execute('DELETE FROM files WHERE id = ?', [fileId]);
    await chunkService.deleteChunks(chunks);
}

const fileController = {
    serializeFile,
    FILE_SELECT,

    /**
     * POST /api/files/upload
     * Upload a file — chunks it, distributes across nodes.
     *
     * Optional multipart fields:
     *   folderId     — destination folder (omit for root)
     *   relativePath — path inside a dropped folder, e.g. "Photos/2024/a.jpg";
     *                  missing folders are created under folderId.
     */
    async upload(req, res, next) {
        const tempPath = req.file?.path;
        let fileId = null;

        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'No file provided.' },
                });
            }

            const { originalname, size, mimetype } = req.file;
            const userId = req.user.id;

            // 1. Check capacity BEFORE writing anything, so a failure here
            //    can't leave a half-created record behind.
            const nodes = await storageService.getOnlineNodes();
            if (nodes.length < 3) {
                return res.status(503).json({
                    success: false,
                    error: { message: 'Not enough storage nodes online (need 3).' },
                });
            }

            const usage = await storageService.getUserStorage(userId);
            if (usage.usedBytes + size > usage.quotaBytes) {
                return res.status(413).json({
                    success: false,
                    error: { message: 'Storage quota exceeded.' },
                });
            }

            // 2. Resolve (and create, for folder uploads) the destination folder
            const baseFolderId = folderService.parseFolderId(req.body.folderId);
            const folderId = await folderService.resolveUploadTarget(userId, baseFolderId, req.body.relativePath);

            logger.info(`Upload started: ${originalname} (${size} bytes) by user ${userId}`);

            // 3. Create file record (status: uploading)
            const [fileResult] = await pool.execute(
                `INSERT INTO files (folder_id, original_name, file_size, mime_type, total_chunks, status, uploaded_by)
                 VALUES (?, ?, ?, ?, 0, 'uploading', ?)`,
                [folderId || null, originalname, size, mimetype, userId]
            );
            fileId = fileResult.insertId;

            // 4. Split file into chunks and distribute
            const chunks = await chunkService.splitAndDistribute(tempPath, fileId, nodes, pool);

            // 5. Mark complete
            await pool.execute(
                `UPDATE files SET total_chunks = ?, status = 'complete' WHERE id = ?`,
                [chunks.length, fileId]
            );

            await storageService.updateAllNodeUsage();
            logger.success(`Upload complete: ${originalname} → ${chunks.length} chunks`);

            const [fileRows] = await pool.execute(`${FILE_SELECT} WHERE f.id = ?`, [fileId]);

            res.status(201).json({
                success: true,
                message: 'File uploaded and distributed successfully',
                data: { file: serializeFile(fileRows[0]) },
            });

        } catch (error) {
            // Don't leave an 'uploading' row or stray chunks behind
            if (fileId) {
                await purgeFile(fileId).catch((e) => logger.error(`Cleanup failed for file ${fileId}: ${e.message}`));
            }
            next(error);
        } finally {
            if (tempPath) await fsp.rm(tempPath, { force: true }).catch(() => {});
        }
    },

    /**
     * GET /api/files
     * List all files for the authenticated user (every folder).
     */
    async listFiles(req, res, next) {
        try {
            const [files] = await pool.execute(
                `${FILE_SELECT} WHERE f.uploaded_by = ? ORDER BY f.created_at DESC`,
                [req.user.id]
            );

            res.status(200).json({
                success: true,
                data: { files: files.map(serializeFile) },
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/files/:id
     * File details plus where each chunk lives and whether it's present.
     */
    async getFile(req, res, next) {
        try {
            const [files] = await pool.execute(
                `${FILE_SELECT} WHERE f.id = ? AND f.uploaded_by = ?`,
                [req.params.id, req.user.id]
            );

            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'File not found.' },
                });
            }

            const [chunks] = await pool.execute(
                `SELECT c.*, sn.node_name, sn.status AS node_status
                 FROM chunks c
                 JOIN storage_nodes sn ON c.node_id = sn.id
                 WHERE c.file_id = ?
                 ORDER BY c.chunk_index`,
                [files[0].id]
            );

            const chunkInfo = await Promise.all(chunks.map(async (c) => {
                const stat = await fsp.stat(c.storage_path).catch(() => null);
                return {
                    index: c.chunk_index,
                    role: CHUNK_ROLES[c.chunk_index] || `Chunk ${c.chunk_index}`,
                    size: c.chunk_size,
                    node: c.node_name,
                    nodeStatus: c.node_status,
                    checksum: c.checksum,
                    healthy: Boolean(stat && stat.size === c.chunk_size),
                };
            }));

            const path = files[0].folder_id
                ? await folderService.breadcrumbs(req.user.id, files[0].folder_id)
                : [];

            res.status(200).json({
                success: true,
                data: { file: serializeFile(files[0]), chunks: chunkInfo, path },
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/files/:id/download
     * Download a file — reassembles chunks from storage nodes.
     */
    async download(req, res, next) {
        try {
            const [files] = await pool.execute(
                `SELECT * FROM files WHERE id = ? AND uploaded_by = ? AND status = 'complete'`,
                [req.params.id, req.user.id]
            );

            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'File not found.' },
                });
            }

            const file = files[0];

            const [chunks] = await pool.execute(
                `SELECT * FROM chunks WHERE file_id = ? ORDER BY chunk_index`,
                [file.id]
            );

            if (chunks.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'File chunks not found.' },
                });
            }

            logger.info(`Download: reassembling ${chunks.length} chunks for "${file.original_name}"`);

            // Reassemble chunks (with automatic XOR parity recovery if needed)
            const fileBuffer = await chunkService.reassemble(chunks, Number(file.file_size));

            // res.attachment() emits an RFC 6266 header with a UTF-8 filename*,
            // so names with quotes, emoji or non-Latin text don't break the response.
            res.attachment(file.original_name);
            res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
            res.setHeader('Content-Length', fileBuffer.length);
            res.send(fileBuffer);

            logger.success(`Download complete: ${file.original_name}`);

        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /api/files/:id
     * Delete a file and all its chunks.
     */
    async deleteFile(req, res, next) {
        try {
            const [files] = await pool.execute(
                `SELECT id FROM files WHERE id = ? AND uploaded_by = ?`,
                [req.params.id, req.user.id]
            );

            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'File not found.' },
                });
            }

            const [chunks] = await pool.execute(
                `SELECT * FROM chunks WHERE file_id = ?`, [files[0].id]
            );

            // Database first: if this fails nothing is lost. A leftover chunk
            // on disk is harmless; a DB row pointing at deleted chunks is not.
            await pool.execute(`DELETE FROM files WHERE id = ?`, [files[0].id]);
            await chunkService.deleteChunks(chunks);
            await storageService.updateAllNodeUsage();

            logger.success(`Deleted file ${files[0].id} and ${chunks.length} chunks`);

            res.status(200).json({
                success: true,
                message: 'File deleted successfully',
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/storage
     * Get storage usage for the authenticated user.
     */
    async getStorage(req, res, next) {
        try {
            const usage = await storageService.getUserStorage(req.user.id);
            res.status(200).json({
                success: true,
                data: usage,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/nodes
     * Storage nodes and their status. Server paths are not exposed.
     */
    async getNodes(req, res, next) {
        try {
            const nodes = await storageService.getAllNodes();
            res.status(200).json({
                success: true,
                data: {
                    nodes: nodes.map((n) => ({
                        id: String(n.id),
                        name: n.node_name,
                        status: n.status,
                        usedBytes: Number(n.used_space),
                        totalBytes: Number(n.total_space),
                        lastHeartbeat: n.last_heartbeat,
                    })),
                },
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = fileController;
