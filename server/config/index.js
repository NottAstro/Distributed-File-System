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

const isProduction = process.env.NODE_ENV === 'production';

// Refuse to run in production with the public fallback secret — anyone
// could forge a JWT for any user id with it.
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

/**
 * ENCRYPTION_KEY: 32 random bytes as 64 hex chars (or base64).
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * Losing this key makes every encrypted chunk unreadable — back it up.
 */
function parseEncryptionKey(raw) {
  if (!raw) return null;
  const value = raw.trim();
  const key = /^[0-9a-fA-F]{64}$/.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64)');
  }
  return key;
}

const encryptionKey = parseEncryptionKey(process.env.ENCRYPTION_KEY);
if (isProduction && !encryptionKey) {
  throw new Error('ENCRYPTION_KEY must be set in production (files are encrypted at rest)');
}

const list = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

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

  // Email delivery. RESEND_API_KEY (HTTPS API) is preferred: many hosts,
  // including Railway below the Pro plan, block outbound SMTP ports.
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
  },

  // SMTP Email settings (fallback when no RESEND_API_KEY)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '"upLoader" <noreply@uploader.app>',
  },

  // Per-user storage quota (default 10 GB)
  storageQuotaBytes: Number(process.env.STORAGE_QUOTA_BYTES) || 10 * 1024 * 1024 * 1024,

  // Max single upload size (default 100 MB)
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 100 * 1024 * 1024,

  // Frontend URL (for reset links, OAuth redirects)
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),

  // Browser origins allowed to call the API (comma-separated). FRONTEND_URL
  // is always allowed. CORS_ORIGIN_REGEX can allow preview deployments, e.g.
  // ^https://distributed-file-system-[a-z0-9]+-nottastro\.vercel\.app$
  cors: {
    origins: list(process.env.CORS_ORIGIN),
    originRegex: process.env.CORS_ORIGIN_REGEX ? new RegExp(process.env.CORS_ORIGIN_REGEX) : null,
  },

  // Number of reverse proxies in front of the app (Railway/Render/Fly = 1).
  // Needed so rate limits see the real client IP.
  trustProxy: process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : 1,

  // AES-256-GCM key for chunks at rest (null = store plaintext; dev only)
  encryptionKey,
};
