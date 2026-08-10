const pool = require('../config/db');
const chunkService = require('../services/chunkService');
const storageService = require('../services/storageService');
const logger = require('../utils/logger');

const fileController = {
    /**
     * POST /api/files/upload
     * Upload a file — chunks it, distributes across nodes.
     */
    async upload(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'No file provided.' },
                });
            }

            const { originalname, size, mimetype, path: filePath } = req.file;
            const userId = req.user.id;

            logger.info(`Upload started: ${originalname} (${size} bytes) by user ${userId}`);

            // 1. Create file record in database (status: uploading)
            const [fileResult] = await pool.execute(
                `INSERT INTO files (original_name, file_size, mime_type, total_chunks, status, uploaded_by)
                 VALUES (?, ?, ?, 0, 'uploading', ?)`,
                [originalname, size, mimetype, userId]
            );
            const fileId = fileResult.insertId;

            // 2. Get online storage nodes
            const nodes = await storageService.getOnlineNodes();
            if (nodes.length === 0) {
                return res.status(503).json({
                    success: false,
                    error: { message: 'No storage nodes available.' },
                });
            }

            // 3. Split file into chunks and distribute
            const chunks = await chunkService.splitAndDistribute(filePath, fileId, nodes, pool);

            // 4. Update file record with chunk count and status
            await pool.execute(
                `UPDATE files SET total_chunks = ?, status = 'complete' WHERE id = ?`,
                [chunks.length, fileId]
            );

            // 5. Update node usage
            await storageService.updateAllNodeUsage();

            logger.success(`Upload complete: ${originalname} → ${chunks.length} chunks`);

            // 6. Return file info
            const [fileRows] = await pool.execute(
                `SELECT * FROM files WHERE id = ?`, [fileId]
            );

            res.status(201).json({
                success: true,
                message: 'File uploaded and distributed successfully',
                data: {
                    file: {
                        id: fileId,
                        name: originalname,
                        size,
                        type: mimetype,
                        totalChunks: chunks.length,
                        nodesUsed: [...new Set(chunks.map(c => c.node_name))].length,
                        status: 'complete',
                        uploadedAt: fileRows[0].created_at,
                    },
                },
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/files
     * List all files for the authenticated user.
     */
    async listFiles(req, res, next) {
        try {
            const userId = req.user.id;

            const [files] = await pool.execute(
                `SELECT f.*, 
                    (SELECT COUNT(DISTINCT c.node_id) FROM chunks c WHERE c.file_id = f.id) as nodes_used
                 FROM files f 
                 WHERE f.uploaded_by = ? 
                 ORDER BY f.created_at DESC`,
                [userId]
            );

            res.status(200).json({
                success: true,
                data: {
                    files: files.map(f => ({
                        id: String(f.id),
                        name: f.original_name,
                        size: Number(f.file_size),
                        type: f.original_name.split('.').pop() || '',
                        uploadedAt: f.created_at,
                        status: f.status === 'complete' ? 'distributed' : f.status,
                        chunks: f.total_chunks,
                        nodes: f.nodes_used || 0,
                        encryption: 'AES-256-CBC',
                    })),
                },
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/files/:id
     * Get details of a specific file.
     */
    async getFile(req, res, next) {
        try {
            const fileId = req.params.id;
            const userId = req.user.id;

            const [files] = await pool.execute(
                `SELECT * FROM files WHERE id = ? AND uploaded_by = ?`,
                [fileId, userId]
            );

            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'File not found.' },
                });
            }

            const [chunks] = await pool.execute(
                `SELECT c.*, sn.node_name 
                 FROM chunks c 
                 JOIN storage_nodes sn ON c.node_id = sn.id 
                 WHERE c.file_id = ? 
                 ORDER BY c.chunk_index`,
                [fileId]
            );

            res.status(200).json({
                success: true,
                data: {
                    file: files[0],
                    chunks,
                },
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
            const fileId = req.params.id;
            const userId = req.user.id;

            // Verify file belongs to user
            const [files] = await pool.execute(
                `SELECT * FROM files WHERE id = ? AND uploaded_by = ?`,
                [fileId, userId]
            );

            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'File not found.' },
                });
            }

            const file = files[0];

            // Get all chunks ordered by index
            const [chunks] = await pool.execute(
                `SELECT * FROM chunks WHERE file_id = ? ORDER BY chunk_index`,
                [fileId]
            );

            if (chunks.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'File chunks not found.' },
                });
            }

            logger.info(`Download: reassembling ${chunks.length} chunks for "${file.original_name}"`);

            // Reassemble chunks (with integrity verification)
            const fileBuffer = await chunkService.reassemble(chunks);

            // Send file to client
            res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
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
            const fileId = req.params.id;
            const userId = req.user.id;

            // Verify file belongs to user
            const [files] = await pool.execute(
                `SELECT * FROM files WHERE id = ? AND uploaded_by = ?`,
                [fileId, userId]
            );

            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'File not found.' },
                });
            }

            // Get chunks for cleanup
            const [chunks] = await pool.execute(
                `SELECT * FROM chunks WHERE file_id = ?`, [fileId]
            );

            // Delete chunks from disk
            await chunkService.deleteChunks(chunks);

            // Delete from database (CASCADE will handle chunks table)
            await pool.execute(`DELETE FROM files WHERE id = ?`, [fileId]);

            // Update node usage
            await storageService.updateAllNodeUsage();

            logger.success(`Deleted file ${fileId} and ${chunks.length} chunks`);

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
     * Get all storage nodes and their status.
     */
    async getNodes(req, res, next) {
        try {
            const nodes = await storageService.getAllNodes();
            res.status(200).json({
                success: true,
                data: { nodes },
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = fileController;
