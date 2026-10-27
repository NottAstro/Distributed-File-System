const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const cryptoService = require('./cryptoService');

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
 *
 * ENCRYPTION: each chunk (including parity) is encrypted at rest with
 * AES-256-GCM before it is written (see cryptoService). Checksums are of the
 * plaintext, so integrity is checked after decryption.
 */

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

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
        const encryption = cryptoService.schemeForNewChunks();
        logger.info(`Erasure Coding: Split file into 2 data + 1 parity chunk (encryption: ${encryption})`);

        for (const item of chunksToProcess) {
            const checksum = sha256(item.buffer);
            const stored = encryption === 'none'
                ? item.buffer
                : cryptoService.encrypt(item.buffer, fileId, item.index);

            const chunkDir = path.join(item.node.storage_path, `file_${fileId}`);
            await fsp.mkdir(chunkDir, { recursive: true });

            const chunkPath = path.join(chunkDir, `chunk_${item.index}.bin`);
            await fsp.writeFile(chunkPath, stored);

            const [result] = await pool.execute(
                `INSERT INTO chunks (file_id, chunk_index, chunk_size, checksum, encryption, node_id, storage_path)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [fileId, item.index, item.buffer.length, checksum, encryption, item.node.id, chunkPath]
            );

            chunks.push({
                id: result.insertId,
                chunk_index: item.index,
                chunk_size: item.buffer.length,
                checksum,
                encryption,
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
                const stored = await fsp.readFile(chunk.storage_path);
                // Decrypt (GCM rejects tampering), then verify the plaintext
                const chunkBuffer = cryptoService.decodeChunk(stored, chunk);
                if (sha256(chunkBuffer) !== chunk.checksum) {
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
     * Encrypt chunks that were stored before encryption existed (or while no
     * key was configured). Safe to run while the app is serving traffic and
     * to interrupt: each chunk is re-written atomically (temp file + rename)
     * and only then marked encrypted, and readers detect the format from the
     * file itself. Corrupted chunks are left alone so parity can still
     * rebuild them on download.
     *
     * @returns {{ encrypted: number, skipped: number, missing: number, failed: number }}
     */
    async encryptExistingChunks(pool) {
        const stats = { encrypted: 0, skipped: 0, missing: 0, failed: 0 };
        if (!cryptoService.enabled()) return stats;

        let lastId = 0;
        for (;;) {
            const [rows] = await pool.query(
                `SELECT id, file_id, chunk_index, checksum, encryption, storage_path
                 FROM chunks WHERE encryption = 'none' AND id > ? ORDER BY id LIMIT 100`,
                [lastId]
            );
            if (rows.length === 0) break;

            for (const chunk of rows) {
                lastId = chunk.id;
                try {
                    const stored = await fsp.readFile(chunk.storage_path);

                    // Already encrypted (e.g. by another instance) — just record it
                    if (cryptoService.looksEncrypted(stored)) {
                        try {
                            if (sha256(cryptoService.decrypt(stored, chunk.file_id, chunk.chunk_index)) === chunk.checksum) {
                                await pool.execute(`UPDATE chunks SET encryption = ? WHERE id = ?`, [cryptoService.SCHEME, chunk.id]);
                                stats.encrypted++;
                                continue;
                            }
                        } catch {
                            /* plaintext that happens to start with the header bytes */
                        }
                    }

                    if (sha256(stored) !== chunk.checksum) {
                        logger.warn(`Encrypt migration: chunk ${chunk.id} fails its checksum — left as is`);
                        stats.skipped++;
                        continue;
                    }

                    const tmpPath = `${chunk.storage_path}.enc-tmp`;
                    await fsp.writeFile(tmpPath, cryptoService.encrypt(stored, chunk.file_id, chunk.chunk_index));

                    // The file may have been deleted while we worked
                    const [still] = await pool.execute('SELECT id FROM chunks WHERE id = ?', [chunk.id]);
                    if (still.length === 0) {
                        await fsp.rm(tmpPath, { force: true });
                        continue;
                    }

                    await fsp.rename(tmpPath, chunk.storage_path);
                    const [updated] = await pool.execute(
                        `UPDATE chunks SET encryption = ? WHERE id = ?`,
                        [cryptoService.SCHEME, chunk.id]
                    );
                    if (updated.affectedRows === 0) {
                        await fsp.rm(chunk.storage_path, { force: true }); // deleted mid-flight
                        continue;
                    }
                    stats.encrypted++;
                } catch (err) {
                    if (err.code === 'ENOENT') {
                        stats.missing++;
                    } else {
                        stats.failed++;
                        logger.warn(`Encrypt migration: chunk ${chunk.id} failed: ${err.message}`);
                    }
                }
            }
        }
        return stats;
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
