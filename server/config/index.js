/**
 * Centralized Configuration Loader
 *
 * Reads environment variables from .env file and exports
 * a clean configuration object. Every module imports config
 * from here instead of reading process.env directly.
 *
 * WHY: Centralization prevents typos (process.env.DB_HOXT),
 * provides defaults, and makes it easy to see every config
 * value the app uses in one place.
 */
require('dotenv').config();

module.exports = {
  // Server settings
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database settings
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT, 10) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'distributed_fs',
  },

  // JWT settings
  jwt: {
    secret:    process.env.JWT_SECRET    || 'fallback_secret_not_for_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};
