const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Chunk Service
 *
 * Handles the core DFS operations:
 * - Splitting files into chunks
 * - Distributing chunks across storage nodes (round-robin)
 * - Reassembling chunks back into the original file
 * - Calculating SHA-256 checksums for integrity verification
 *
 * CHUNK SIZE: 2.5MB (2,621,440 bytes)
 * A 10MB file → 4 chunks, distributed across 3 nodes
 */

const CHUNK_SIZE = 2.5 * 1024 * 1024; // 2.5 MB

const chunkService = {
    /**
     * Split a file into chunks and distribute across storage nodes.
     *
     * @param {string} filePath - Path to the uploaded file
     * @param {number} fileId - Database ID of the file record
     * @param {Array} nodes - Array of storage node records from DB
     * @param {object} pool - MySQL connection pool
     * @returns {Array} - Array of chunk records
     */
    async splitAndDistribute(filePath, fileId, nodes, pool) {
        const fileBuffer = fs.readFileSync(filePath);
        const totalSize = fileBuffer.length;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
        const chunks = [];

        logger.info(`Splitting file into ${totalChunks} chunks (${CHUNK_SIZE} bytes each)`);

        for (let i = 0; i < totalChunks; i++) {
            // Extract chunk from file buffer
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, totalSize);
            const chunkBuffer = fileBuffer.slice(start, end);

            // Calculate SHA-256 checksum for integrity
            const checksum = crypto.createHash('sha256').update(chunkBuffer).digest('hex');

            // Round-robin distribution: chunk 0 → node 0, chunk 1 → node 1, etc.
            const nodeIndex = i % nodes.length;
            const node = nodes[nodeIndex];

            // Create storage directory if it doesn't exist
            const chunkDir = path.join(node.storage_path, `file_${fileId}`);
            if (!fs.existsSync(chunkDir)) {
                fs.mkdirSync(chunkDir, { recursive: true });
            }

            // Write chunk to disk
            const chunkFileName = `chunk_${i}.bin`;
            const chunkPath = path.join(chunkDir, chunkFileName);
            fs.writeFileSync(chunkPath, chunkBuffer);

            // Save chunk metadata to database
            const [result] = await pool.execute(
                `INSERT INTO chunks (file_id, chunk_index, chunk_size, checksum, node_id, storage_path)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [fileId, i, chunkBuffer.length, checksum, node.id, chunkPath]
            );

            chunks.push({
                id: result.insertId,
                chunk_index: i,
                chunk_size: chunkBuffer.length,
                checksum,
                node_id: node.id,
                node_name: node.node_name,
                storage_path: chunkPath,
            });

            logger.info(`  Chunk ${i} → ${node.node_name} (${chunkBuffer.length} bytes, checksum: ${checksum.slice(0, 12)}...)`);
        }

        // Clean up the original uploaded file
        fs.unlinkSync(filePath);
        logger.success(`File split into ${totalChunks} chunks across ${nodes.length} nodes`);

        return chunks;
    },

    /**
     * Reassemble chunks back into the original file.
     *
     * @param {Array} chunks - Ordered array of chunk records from DB
     * @returns {Buffer} - The reassembled file buffer
     */
    async reassemble(chunks) {
        const buffers = [];

        for (const chunk of chunks) {
            // Read chunk from disk
            if (!fs.existsSync(chunk.storage_path)) {
                throw new Error(`Chunk ${chunk.chunk_index} missing at ${chunk.storage_path}`);
            }

            const chunkBuffer = fs.readFileSync(chunk.storage_path);

            // Verify checksum integrity
            const checksum = crypto.createHash('sha256').update(chunkBuffer).digest('hex');
            if (checksum !== chunk.checksum) {
                throw new Error(
                    `Integrity check failed for chunk ${chunk.chunk_index}. ` +
                    `Expected: ${chunk.checksum}, Got: ${checksum}`
                );
            }

            buffers.push(chunkBuffer);
        }

        return Buffer.concat(buffers);
    },

    /**
     * Delete all chunks for a file from disk.
     *
     * @param {Array} chunks - Array of chunk records from DB
     */
    async deleteChunks(chunks) {
        for (const chunk of chunks) {
            try {
                if (fs.existsSync(chunk.storage_path)) {
                    fs.unlinkSync(chunk.storage_path);
                }
                // Try to remove the file directory if empty
                const dir = path.dirname(chunk.storage_path);
                if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
                    fs.rmdirSync(dir);
                }
            } catch (err) {
                logger.warn(`Failed to delete chunk ${chunk.chunk_index}: ${err.message}`);
            }
        }
    },
};

module.exports = chunkService;
