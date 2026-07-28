const logger = require('../utils/logger');

/**
 * Global Error Handling Middleware
 *
 * Must have EXACTLY 4 parameters — Express uses the param count
 * to identify it as an error handler (not a regular middleware).
 *
 * SECURITY: In production, stack traces are NEVER sent to the client.
 * They could reveal file paths, library versions, and internal logic.
 */
function errorHandler(err, req, res, next) {
    // Log the full error internally (server console only)
    logger.error(`${req.method} ${req.path} — ${err.message}`);

    if (process.env.NODE_ENV === 'development') {
        logger.error(err.stack);
    }

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        error: {
            message: statusCode === 500
                ? 'Internal server error'      // Never leak internal details in production
                : err.message,
            // Stack trace only in development — NEVER in production
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
}

module.exports = errorHandler;
