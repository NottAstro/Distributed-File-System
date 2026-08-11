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

  // Google OAuth settings
  google: {
    clientId:     process.env.GOOGLE_CLIENT_ID     || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  // SMTP Email settings
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '"upLoader" <noreply@uploader.app>',
  },

  // Frontend URL (for reset links, OAuth redirects)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
