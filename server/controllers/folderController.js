const pool = require('../config/db');
const folderService = require('../services/folderService');
const chunkService = require('../services/chunkService');
const storageService = require('../services/storageService');
const { serializeFile, FILE_SELECT } = require('./fileController');
const logger = require('../utils/logger');

const folderController = {
    /**
     * GET /api/folders
     * Every folder the user owns (flat list) — used for search and pickers.
     */
    async listAll(req, res, next) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM folders WHERE owner_id = ? ORDER BY name',
                [req.user.id]
            );
            res.status(200).json({
                success: true,
                data: { folders: rows.map(folderService.serializeFolder) },
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/folders/root/contents
     * GET /api/folders/:id/contents
     * One folder's subfolders + files, and the breadcrumb path to it.
     */
    async contents(req, res, next) {
        try {
            const userId = req.user.id;
            const folderId = folderService.parseFolderId(req.params.id);

            let folder = null;
            let path = [];
            if (folderId) {
                folder = await folderService.getOwned(userId, folderId);
                path = await folderService.breadcrumbs(userId, folderId);
            }

            const folders = await folderService.listChildren(userId, folderId);
            const [files] = await pool.execute(
                `${FILE_SELECT}
                 WHERE f.uploaded_by = ? AND ${folderId ? 'f.folder_id = ?' : 'f.folder_id IS NULL'}
                 ORDER BY f.created_at DESC`,
                folderId ? [userId, folderId] : [userId]
            );

            res.status(200).json({
                success: true,
                data: {
                    folder: folder && folderService.serializeFolder(folder),
                    path,
                    folders: folders.map(folderService.serializeFolder),
                    files: files.map(serializeFile),
                },
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/folders  { name, parentId? }
     */
    async create(req, res, next) {
        try {
            const parentId = folderService.parseFolderId(req.body.parentId);
            const folder = await folderService.create(req.user.id, parentId, req.body.name);
            logger.info(`Folder created: "${folder.name}" (id ${folder.id}) by user ${req.user.id}`);
            res.status(201).json({
                success: true,
                data: { folder: folderService.serializeFolder({ ...folder, item_count: 0, total_size: 0 }) },
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * PATCH /api/folders/:id  { name }
     */
    async rename(req, res, next) {
        try {
            const folderId = folderService.parseFolderId(req.params.id);
            if (!folderId) throw folderService.clientError('Cannot rename the root folder.');
            const folder = await folderService.rename(req.user.id, folderId, req.body.name);
            res.status(200).json({
                success: true,
                data: { folder: folderService.serializeFolder(folder) },
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /api/folders/:id
     * Deletes the folder, every subfolder, and every file inside them.
     */
    async remove(req, res, next) {
        try {
            const userId = req.user.id;
            const folderId = folderService.parseFolderId(req.params.id);
            if (!folderId) throw folderService.clientError('Cannot delete the root folder.');
            await folderService.getOwned(userId, folderId);

            const ids = await folderService.descendantIds(userId, folderId);
            const placeholders = ids.map(() => '?').join(',');

            const [chunks] = await pool.query(
                `SELECT c.* FROM chunks c JOIN files f ON f.id = c.file_id
                 WHERE f.uploaded_by = ? AND f.folder_id IN (${placeholders})`,
                [userId, ...ids]
            );
            const [[{ fileCount }]] = await pool.query(
                `SELECT COUNT(*) AS fileCount FROM files WHERE uploaded_by = ? AND folder_id IN (${placeholders})`,
                [userId, ...ids]
            );

            // DB first (FK cascades remove files + chunk rows), then disk
            await pool.query(
                `DELETE FROM folders WHERE owner_id = ? AND id IN (${placeholders})`,
                [userId, ...ids]
            );
            await chunkService.deleteChunks(chunks);
            await storageService.updateAllNodeUsage();

            logger.success(`Deleted folder ${folderId}: ${ids.length} folder(s), ${fileCount} file(s)`);

            res.status(200).json({
                success: true,
                message: 'Folder deleted',
                data: { folders: ids.length, files: Number(fileCount) },
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = folderController;
