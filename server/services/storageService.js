const pool = require('../config/db');

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
        const nodes = await this.getAllNodes();
        for (const node of nodes) {
            await this.updateNodeUsage(node.id);
        }
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
            quotaBytes: 10 * 1024 * 1024 * 1024, // 10 GB default quota
        };
    },
};

module.exports = storageService;
