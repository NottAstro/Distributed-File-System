const app = require('./server/app');
const config = require('./server/config');
const pool = require('./server/config/db');
const logger = require('./server/utils/logger');
const { ensureSchema } = require('./server/config/migrate');
const otpService = require('./server/services/otpService');
const resetService = require('./server/services/resetService');
const chunkService = require('./server/services/chunkService');
const cryptoService = require('./server/services/cryptoService');

async function startServer() {
    try {
        // Verify DB connection before accepting requests
        logger.info('Testing database connection...');
        const connection = await pool.getConnection();
        logger.success('Database connected successfully');
        connection.release();  // Return the connection to the pool

        // Apply any pending schema changes (idempotent)
        await ensureSchema(pool);

        // Purge expired OTPs / reset tokens hourly (cleanup() existed but was never called)
        setInterval(() => {
            otpService.cleanup().catch((e) => logger.warn(`OTP cleanup failed: ${e.message}`));
            resetService.cleanup().catch((e) => logger.warn(`Reset-token cleanup failed: ${e.message}`));
        }, 60 * 60 * 1000).unref();

        // Start listening
        app.listen(config.port, () => {
            logger.success(`DFS Server running on http://localhost:${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`Chunk encryption at rest: ${cryptoService.enabled() ? 'AES-256-GCM' : 'OFF (set ENCRYPTION_KEY)'}`);
            logger.info('Press Ctrl+C to stop\n');

            // Encrypt chunks stored before encryption was enabled, in the
            // background (set ENCRYPT_EXISTING_ON_BOOT=false to skip)
            if (cryptoService.enabled() && process.env.ENCRYPT_EXISTING_ON_BOOT !== 'false') {
                chunkService
                    .encryptExistingChunks(pool)
                    .then((s) => {
                        if (s.encrypted || s.skipped || s.missing || s.failed) {
                            logger.info(`Encrypt migration: ${JSON.stringify(s)}`);
                        }
                    })
                    .catch((e) => logger.error(`Encrypt migration failed: ${e.message}`));
            }
        });

    } catch (error) {
        logger.error('Failed to start server:', error.message);
        logger.error('Is MySQL running? Check your .env file.');
        process.exit(1);
    }
}

startServer();
