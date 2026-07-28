const app = require('./server/app');
const config = require('./server/config');
const pool = require('./server/config/db');
const logger = require('./server/utils/logger');

async function startServer() {
    try {
        // Verify DB connection before accepting requests
        logger.info('Testing database connection...');
        const connection = await pool.getConnection();
        logger.success('Database connected successfully');
        connection.release();  // Return the connection to the pool

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
