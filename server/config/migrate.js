const logger = require('../utils/logger');

/**
 * Startup Migrations
 *
 * Brings an existing database up to date with the current schema.
 * Every step is idempotent, so this runs safely on every boot — no
 * manual SQL needed after deploying to Railway (or anywhere else).
 */

async function columnExists(pool, table, column) {
    const [rows] = await pool.execute(
        `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    return rows[0].n > 0;
}

async function ensureSchema(pool) {
    // v3: folders
    await pool.query(`
        CREATE TABLE IF NOT EXISTS folders (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            name            VARCHAR(255) NOT NULL,
            parent_id       INT          NOT NULL DEFAULT 0,
            owner_id        INT          NOT NULL,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_folder_name (owner_id, parent_id, name),
            INDEX idx_folders_parent (owner_id, parent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    if (!(await columnExists(pool, 'files', 'folder_id'))) {
        logger.info('Migrating: adding files.folder_id');
        await pool.query(`ALTER TABLE files ADD COLUMN folder_id INT NULL AFTER id`);
        await pool.query(`ALTER TABLE files ADD INDEX idx_files_folder (uploaded_by, folder_id)`);
        await pool.query(
            `ALTER TABLE files ADD CONSTRAINT fk_files_folder
             FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE`
        );
    }
}

module.exports = { ensureSchema };
