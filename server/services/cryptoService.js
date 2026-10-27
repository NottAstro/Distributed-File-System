const crypto = require('crypto');
const config = require('../config');

/**
 * Chunk encryption at rest — AES-256-GCM.
 *
 * Stored chunk layout (self-describing, so a reader never depends on the DB
 * row and the on-disk file changing at exactly the same moment):
 *
 *   "DFSE" | version (1 byte) | IV (12 bytes) | ciphertext | GCM tag (16 bytes)
 *
 * - A fresh random IV per chunk write (never reused with the same key).
 * - Additional authenticated data binds each chunk to its file id and
 *   position, so chunks can't be swapped between files or slots.
 * - GCM authentication detects any tampering or corruption; the chunk is
 *   then treated as unavailable and rebuilt from parity.
 *
 * The key comes from ENCRYPTION_KEY (see config). Chunks written while no
 * key was configured stay plaintext ('none') until migrated.
 */

const SCHEME = 'aes-256-gcm';
const MAGIC = Buffer.from('DFSE');
const VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = MAGIC.length + 1 + IV_LENGTH;
const OVERHEAD = HEADER_LENGTH + TAG_LENGTH; // 33 bytes per chunk

function aad(fileId, chunkIndex) {
    return Buffer.from(`dfs:${fileId}:${chunkIndex}`);
}

const cryptoService = {
    SCHEME,
    OVERHEAD,

    /** True when new chunks will be encrypted. */
    enabled() {
        return Boolean(config.encryptionKey);
    },

    /** The `chunks.encryption` value for a chunk written now. */
    schemeForNewChunks() {
        return this.enabled() ? SCHEME : 'none';
    },

    encrypt(plain, fileId, chunkIndex) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-gcm', config.encryptionKey, iv);
        cipher.setAAD(aad(fileId, chunkIndex));
        const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
        return Buffer.concat([MAGIC, Buffer.from([VERSION]), iv, ciphertext, cipher.getAuthTag()]);
    },

    decrypt(stored, fileId, chunkIndex) {
        if (!config.encryptionKey) {
            throw new Error('chunk is encrypted but ENCRYPTION_KEY is not set');
        }
        const iv = stored.subarray(MAGIC.length + 1, HEADER_LENGTH);
        const tag = stored.subarray(stored.length - TAG_LENGTH);
        const ciphertext = stored.subarray(HEADER_LENGTH, stored.length - TAG_LENGTH);
        const decipher = crypto.createDecipheriv('aes-256-gcm', config.encryptionKey, iv);
        decipher.setAAD(aad(fileId, chunkIndex));
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    },

    /** Does this buffer carry the encrypted-chunk header? */
    looksEncrypted(stored) {
        return (
            stored.length >= OVERHEAD &&
            stored.subarray(0, MAGIC.length).equals(MAGIC) &&
            stored[MAGIC.length] === VERSION
        );
    },

    /**
     * Turn the bytes read from disk back into the chunk's plaintext.
     * Throws if the chunk can't be trusted (tampered, wrong key, or an
     * encrypted chunk whose file was replaced by plaintext).
     */
    decodeChunk(stored, chunk) {
        const marked = chunk.encryption || 'none';
        if (this.looksEncrypted(stored)) {
            try {
                return this.decrypt(stored, chunk.file_id, chunk.chunk_index);
            } catch (err) {
                // A legacy plaintext chunk can, by coincidence, start with the
                // header bytes — the checksum check after this settles it.
                if (marked === 'none') return stored;
                throw new Error(`decryption failed: ${err.message}`);
            }
        }
        if (marked !== 'none') {
            throw new Error('expected an encrypted chunk but found plaintext');
        }
        return stored;
    },

    /** Expected size on disk for a chunk of `plainSize` bytes. */
    storedSize(plainSize, encryption) {
        return (encryption || 'none') === 'none' ? plainSize : plainSize + OVERHEAD;
    },
};

module.exports = cryptoService;
