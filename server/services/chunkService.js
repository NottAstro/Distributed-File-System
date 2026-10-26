const fs = require('fs');
const fsp = require('fs/promises');
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
 * LAYOUT: every file becomes exactly 3 chunks — two halves of the data
 * plus an XOR parity chunk — so any single node can be lost and the file
 * can still be rebuilt (2+1 erasure coding).
 */

const chunkService = {
    /**
     * Split a file into exactly 2 data chunks and 1 parity chunk (XOR).
     */
    async splitAndDistribute(filePath, fileId, nodes, pool) {
        if (nodes.length < 3) {
            throw new Error("Erasure coding (2+1) requires at least 3 online storage nodes");
        }

        // Async read so a large upload doesn't block every other request.
        const fileBuffer = await fsp.readFile(filePath);
        const totalSize = fileBuffer.length;

        // Split exactly in half
        const data1Size = Math.ceil(totalSize / 2);
        const data1Buffer = fileBuffer.subarray(0, data1Size);
        const data2Buffer = fileBuffer.subarray(data1Size);

        // Compute XOR parity
        const parityBuffer = Buffer.alloc(data1Size);
        for (let i = 0; i < data1Size; i++) {
            parityBuffer[i] = data1Buffer[i] ^ (data2Buffer[i] || 0);
        }

        // Rotate which node gets which role so parity (and its write load)
        // is spread across nodes instead of always landing on the third one.
        const offset = fileId % nodes.length;
        const pick = (i) => nodes[(offset + i) % nodes.length];

        const chunksToProcess = [
            { buffer: data1Buffer, node: pick(0), index: 0, desc: "Data1" },
            { buffer: data2Buffer, node: pick(1), index: 1, desc: "Data2" },
            { buffer: parityBuffer, node: pick(2), index: 2, desc: "Parity" }
        ];

        const chunks = [];
        logger.info(`Erasure Coding: Split file into 2 data + 1 parity chunk`);

        for (const item of chunksToProcess) {
            const checksum = crypto.createHash('sha256').update(item.buffer).digest('hex');

            const chunkDir = path.join(item.node.storage_path, `file_${fileId}`);
            await fsp.mkdir(chunkDir, { recursive: true });

            const chunkPath = path.join(chunkDir, `chunk_${item.index}.bin`);
            await fsp.writeFile(chunkPath, item.buffer);

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

        // The temp upload is removed by the controller (in a finally block),
        // so it is cleaned up even when distribution fails part-way.
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
                const chunkBuffer = await fsp.readFile(chunk.storage_path);
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
                await fsp.rm(chunk.storage_path, { force: true });
                const dir = path.dirname(chunk.storage_path);
                if (fs.existsSync(dir) && (await fsp.readdir(dir)).length === 0) {
                    await fsp.rmdir(dir);
                }
            } catch (err) {
                logger.warn(`Failed to delete chunk ${chunk.chunk_index}: ${err.message}`);
            }
        }
    },
};

module.exports = chunkService;
