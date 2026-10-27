/**
 * Encrypt existing plaintext chunks at rest.
 *
 * Run with: npm run encrypt:existing   (needs ENCRYPTION_KEY and DB settings)
 *
 * The server also does this automatically in the background on start-up;
 * this script is for running it on demand. Safe to re-run and to interrupt.
 */
const pool = require('../server/config/db');
const { ensureSchema } = require('../server/config/migrate');
const chunkService = require('../server/services/chunkService');
const cryptoService = require('../server/services/cryptoService');

(async () => {
    if (!cryptoService.enabled()) {
        console.error('❌ ENCRYPTION_KEY is not set — nothing to do.');
        process.exit(1);
    }
    try {
        await ensureSchema(pool);
        const stats = await chunkService.encryptExistingChunks(pool);
        console.log('✅ Done:', stats);
        process.exitCode = stats.failed ? 1 : 0;
    } catch (err) {
        console.error('❌ Failed:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
