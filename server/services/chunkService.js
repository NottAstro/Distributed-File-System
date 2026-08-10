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
     * Split a file into exactly 2 data chunks and 1 parity chunk (XOR).
     */
    async splitAndDistribute(filePath, fileId, nodes, pool) {
        const fileBuffer = fs.readFileSync(filePath);
        const totalSize = fileBuffer.length;
        
        if (nodes.length < 3) {
            throw new Error("Erasure coding (2+1) requires exactly 3 online storage nodes");
        }

        // Split exactly in half
        const data1Size = Math.ceil(totalSize / 2);
        const data1Buffer = fileBuffer.slice(0, data1Size);
        const data2Buffer = fileBuffer.slice(data1Size);

        // Compute XOR parity
        const parityBuffer = Buffer.alloc(data1Size);
        for (let i = 0; i < data1Size; i++) {
            parityBuffer[i] = data1Buffer[i] ^ (data2Buffer[i] || 0);
        }

        const chunksToProcess = [
            { buffer: data1Buffer, node: nodes[0], index: 0, desc: "Data1" },
            { buffer: data2Buffer, node: nodes[1], index: 1, desc: "Data2" },
            { buffer: parityBuffer, node: nodes[2], index: 2, desc: "Parity" }
        ];

        const chunks = [];
        logger.info(`Erasure Coding: Split file into 2 data + 1 parity chunk`);

        for (const item of chunksToProcess) {
            const checksum = crypto.createHash('sha256').update(item.buffer).digest('hex');

            const chunkDir = path.join(item.node.storage_path, `file_${fileId}`);
            if (!fs.existsSync(chunkDir)) {
                fs.mkdirSync(chunkDir, { recursive: true });
            }

            const chunkPath = path.join(chunkDir, `chunk_${item.index}.bin`);
            fs.writeFileSync(chunkPath, item.buffer);

            const [result] = await pool.execute(
                `INSERT INTO chunks (file_id, chunk_index, chunk_size, checksum, node_id, storage_path)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [fileId, item.index, item.buffer.length, checksum, item.node.id, chunkPath]
            );

            chunks.push({
                id: result.insertId,
                chunk_index: item.index,
                chunk_size: item.buffer.length,
                checksum,
                node_id: item.node.id,
                node_name: item.node.node_name,
                storage_path: chunkPath,
            });

            logger.info(`  ${item.desc} (Index ${item.index}) → ${item.node.node_name} (${item.buffer.length} bytes)`);
        }

        fs.unlinkSync(filePath);
        logger.success(`File successfully erasure-coded and distributed to 3 nodes`);

        return chunks;
    },

    /**
     * Reassemble chunks with automatic XOR recovery if 1 node fails.
     */
    async reassemble(chunks, originalSize) {
        let data1 = null, data2 = null, parity = null;

        for (const chunk of chunks) {
            try {
                if (!fs.existsSync(chunk.storage_path)) {
                    throw new Error("File not on disk");
                }
                const chunkBuffer = fs.readFileSync(chunk.storage_path);
                const checksum = crypto.createHash('sha256').update(chunkBuffer).digest('hex');
                if (checksum !== chunk.checksum) {
                    throw new Error("Checksum mismatch (corrupted)");
                }

                if (chunk.chunk_index === 0) data1 = chunkBuffer;
                if (chunk.chunk_index === 1) data2 = chunkBuffer;
                if (chunk.chunk_index === 2) parity = chunkBuffer;
            } catch (err) {
                logger.warn(`Chunk ${chunk.chunk_index} is unavailable: ${err.message}`);
            }
        }

        // Happy path: Both data chunks are available
        if (data1 && data2) {
            return Buffer.concat([data1, data2]);
        }

        // Recovery path: Data2 missing
        if (data1 && parity && !data2) {
            logger.info("Data2 missing! Reconstructing from Data1 and Parity...");
            const data2Size = originalSize - data1.length;
            data2 = Buffer.alloc(data2Size);
            for (let i = 0; i < data2Size; i++) {
                data2[i] = data1[i] ^ parity[i];
            }
            logger.success("Data2 successfully reconstructed.");
            return Buffer.concat([data1, data2]);
        }

        // Recovery path: Data1 missing
        if (data2 && parity && !data1) {
            logger.info("Data1 missing! Reconstructing from Data2 and Parity...");
            data1 = Buffer.alloc(parity.length);
            for (let i = 0; i < parity.length; i++) {
                data1[i] = (data2[i] || 0) ^ parity[i];
            }
            logger.success("Data1 successfully reconstructed.");
            return Buffer.concat([data1, data2]);
        }

        throw new Error("Critical failure: 2 or more chunks are missing. Cannot reconstruct file.");
    },

    /**
     * Delete all chunks for a file from disk.
     */
    async deleteChunks(chunks) {
        for (const chunk of chunks) {
            try {
                if (fs.existsSync(chunk.storage_path)) {
                    fs.unlinkSync(chunk.storage_path);
                }
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
