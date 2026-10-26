const app = require('./server/app');
const config = require('./server/config');
const pool = require('./server/config/db');
const logger = require('./server/utils/logger');
const { ensureSchema } = require('./server/config/migrate');
const otpService = require('./server/services/otpService');
const resetService = require('./server/services/resetService');

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
            logger.info('Press Ctrl+C to stop\n');
        });

    } catch (error) {
        logger.error('Failed to start server:', error.message);
        logger.error('Is MySQL running? Check your .env file.');
        process.exit(1);
    }
}

startServer();
