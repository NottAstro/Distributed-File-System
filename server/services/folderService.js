const pool = require('../config/db');

/**
 * Folder Service
 *
 * Folders are a per-user tree stored in the `folders` table.
 * parent_id = 0 means "root" in the database; the API exposes that as null.
 *
 * All lookups are scoped by owner_id so one user can never read or write
 * another user's folders, even by guessing IDs.
 */

const MAX_NAME_LENGTH = 255;
const MAX_DEPTH = 32;

/** Thrown for bad user input — errorHandler turns statusCode into the HTTP status. */
function clientError(message, statusCode = 400) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}

/**
 * Validate and normalise a single folder name.
 * Rejects path separators and dot-names so a name can never act as a path.
 */
function cleanName(raw) {
    const name = String(raw ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim();
    if (!name) throw clientError('Folder name is required.');
    if (name.length > MAX_NAME_LENGTH) throw clientError(`Folder name must be at most ${MAX_NAME_LENGTH} characters.`);
    if (/[\\/]/.test(name)) throw clientError('Folder name cannot contain / or \\.');
    if (name === '.' || name === '..') throw clientError('Invalid folder name.');
    return name;
}

/** Parse a folder id from user input. Returns 0 for root ('', null, 'root'). */
function parseFolderId(raw) {
    if (raw === undefined || raw === null || raw === '' || raw === 'root' || raw === 'null') return 0;
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 0) throw clientError('Invalid folder id.');
    return id;
}

function serializeFolder(row) {
    return {
        id: String(row.id),
        name: row.name,
        parentId: row.parent_id ? String(row.parent_id) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...(row.item_count !== undefined && { itemCount: Number(row.item_count) }),
        ...(row.total_size !== undefined && { size: Number(row.total_size) }),
    };
}

const folderService = {
    clientError,
    cleanName,
    parseFolderId,
    serializeFolder,

    /** Fetch a folder owned by the user, or throw 404. */
    async getOwned(userId, folderId) {
        const [rows] = await pool.execute(
            'SELECT * FROM folders WHERE id = ? AND owner_id = ?',
            [folderId, userId]
        );
        if (rows.length === 0) throw clientError('Folder not found.', 404);
        return rows[0];
    },

    /** Ancestor chain from root down to (and including) the folder. */
    async breadcrumbs(userId, folderId) {
        const path = [];
        let current = folderId;
        while (current && path.length < MAX_DEPTH + 1) {
            const folder = await this.getOwned(userId, current);
            path.unshift({ id: String(folder.id), name: folder.name });
            current = folder.parent_id;
        }
        return path;
    },

    /** Depth of a folder (root children are depth 1). */
    async depth(userId, folderId) {
        return (await this.breadcrumbs(userId, folderId)).length;
    },

    /**
     * Create a folder, or return the existing one with the same name.
     * INSERT … ON DUPLICATE KEY UPDATE makes this race-free: parallel uploads
     * from the same dropped folder all resolve to one row.
     */
    async findOrCreate(userId, parentId, rawName) {
        const name = cleanName(rawName);
        const [result] = await pool.execute(
            `INSERT INTO folders (name, parent_id, owner_id) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
            [name, parentId, userId]
        );
        return result.insertId;
    },

    /** Create a new folder; 409 if the name is already taken in that parent. */
    async create(userId, parentId, rawName) {
        const name = cleanName(rawName);
        if (parentId) {
            await this.getOwned(userId, parentId);
            if ((await this.depth(userId, parentId)) >= MAX_DEPTH) {
                throw clientError('Folders cannot be nested that deeply.');
            }
        }
        try {
            const [result] = await pool.execute(
                'INSERT INTO folders (name, parent_id, owner_id) VALUES (?, ?, ?)',
                [name, parentId, userId]
            );
            const [rows] = await pool.execute('SELECT * FROM folders WHERE id = ?', [result.insertId]);
            return rows[0];
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') throw clientError(`A folder named "${name}" already exists here.`, 409);
            throw err;
        }
    },

    async rename(userId, folderId, rawName) {
        const folder = await this.getOwned(userId, folderId);
        const name = cleanName(rawName);
        try {
            await pool.execute('UPDATE folders SET name = ? WHERE id = ?', [name, folder.id]);
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') throw clientError(`A folder named "${name}" already exists here.`, 409);
            throw err;
        }
        return { ...folder, name };
    },

    /**
     * Resolve the destination folder for an upload.
     * `relativePath` comes from a folder upload (e.g. "Photos/2024/beach.jpg");
     * every directory segment is found-or-created under `baseFolderId`.
     */
    async resolveUploadTarget(userId, baseFolderId, relativePath) {
        let parentId = baseFolderId;
        if (parentId) await this.getOwned(userId, parentId);

        if (!relativePath) return parentId;
        const segments = String(relativePath).split(/[\\/]+/).filter(Boolean);
        segments.pop(); // last segment is the file name itself
        if (segments.length > MAX_DEPTH) throw clientError('Folder structure is nested too deeply.');

        for (const segment of segments) {
            parentId = await this.findOrCreate(userId, parentId, segment);
        }
        return parentId;
    },

    /** IDs of a folder and every folder beneath it. */
    async descendantIds(userId, folderId) {
        const [rows] = await pool.execute(
            'SELECT id, parent_id FROM folders WHERE owner_id = ?',
            [userId]
        );
        const children = new Map();
        for (const row of rows) {
            if (!children.has(row.parent_id)) children.set(row.parent_id, []);
            children.get(row.parent_id).push(row.id);
        }
        const ids = [];
        const stack = [folderId];
        while (stack.length) {
            const id = stack.pop();
            ids.push(id);
            stack.push(...(children.get(id) || []));
        }
        return ids;
    },

    /** Immediate subfolders with item counts and total (recursive-free) size. */
    async listChildren(userId, parentId) {
        const [rows] = await pool.execute(
            `SELECT fo.*,
                (SELECT COUNT(*) FROM folders c WHERE c.parent_id = fo.id AND c.owner_id = fo.owner_id)
                  + (SELECT COUNT(*) FROM files f WHERE f.folder_id = fo.id) AS item_count,
                (SELECT COALESCE(SUM(f.file_size), 0) FROM files f WHERE f.folder_id = fo.id) AS total_size
             FROM folders fo
             WHERE fo.owner_id = ? AND fo.parent_id = ?
             ORDER BY fo.name`,
            [userId, parentId]
        );
        return rows;
    },
};

module.exports = folderService;
