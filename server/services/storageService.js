const pool = require('../config/db');
const config = require('../config');

/**
 * Storage Service
 *
 * Manages storage nodes and tracks usage.
 * Provides methods to query node status and calculate storage metrics.
 */
const storageService = {
    /**
     * Get all online storage nodes.
     * @returns {Array} - Array of online storage node records
     */
    async getOnlineNodes() {
        const [nodes] = await pool.execute(
            `SELECT * FROM storage_nodes WHERE status = 'online' ORDER BY id`
        );
        return nodes;
    },

    /**
     * Get all storage nodes with their status.
     * @returns {Array}
     */
    async getAllNodes() {
        const [nodes] = await pool.execute(
            `SELECT * FROM storage_nodes ORDER BY id`
        );
        return nodes;
    },

    /**
     * Update the used_space for a specific node.
     * Recalculates from the chunks table.
     * @param {number} nodeId
     */
    async updateNodeUsage(nodeId) {
        await pool.execute(
            `UPDATE storage_nodes 
             SET used_space = COALESCE((
                SELECT SUM(chunk_size) FROM chunks WHERE node_id = ?
             ), 0)
             WHERE id = ?`,
            [nodeId, nodeId]
        );
    },

    /**
     * Update used_space for all nodes.
     */
    async updateAllNodeUsage() {
        // One statement instead of one query per node
        await pool.execute(
            `UPDATE storage_nodes sn
             SET used_space = COALESCE((SELECT SUM(c.chunk_size) FROM chunks c WHERE c.node_id = sn.id), 0)`
        );
    },

    /**
     * Get total storage usage for a specific user.
     * @param {number} userId
     * @returns {object} - { usedBytes, quotaBytes }
     */
    async getUserStorage(userId) {
        const [rows] = await pool.execute(
            `SELECT COALESCE(SUM(f.file_size), 0) as used_bytes
             FROM files f WHERE f.uploaded_by = ?`,
            [userId]
        );
        return {
            usedBytes: Number(rows[0].used_bytes),
            quotaBytes: config.storageQuotaBytes,
        };
    },
};

module.exports = storageService;
