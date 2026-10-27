const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const config = require('./config');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const folderRoutes = require('./routes/folderRoutes');
const authenticate = require('./middleware/authMiddleware');
const fileController = require('./controllers/fileController');

// Create Express app
const app = express();

// Trust the hosting platform's reverse proxy so rate limits see the real
// client IP (TRUST_PROXY = number of proxy hops, default 1)
app.set('trust proxy', config.trustProxy);

// ---------------------
// Security Middleware
// ---------------------

// Helmet — sets secure HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.)
// crossOriginResourcePolicy is relaxed so the frontend (a different origin)
// can read download responses.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// HPP — prevents HTTP Parameter Pollution attacks
app.use(hpp());

// CORS — the frontend calls this API directly (VITE_API_URL), so its origin
// must be allowed: FRONTEND_URL, CORS_ORIGIN (list) and CORS_ORIGIN_REGEX.
// (A blanket *.vercel.app allowance used to live here; anyone can deploy to
// vercel.app, so it let any site call this API.)
const allowedOrigins = new Set([config.frontendUrl, ...config.cors.origins]);

function isAllowedOrigin(origin) {
    if (allowedOrigins.has(origin)) return true;
    if (config.cors.originRegex && config.cors.originRegex.test(origin)) return true;
    // In development, allow any localhost/127.0.0.1 origin
    return config.nodeEnv !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

app.use(cors({
    // No Origin header = same-origin, curl or server-to-server: allowed.
    // Returning false (not an Error) avoids turning a bad origin into a 500.
    origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)),
    // Auth uses the Authorization header, not cookies
    credentials: false,
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
    maxAge: 600,
}));

// ---------------------
// Rate Limiting
// ---------------------

// Global rate limit: 600 requests per 15 minutes per IP.
// (100 was low enough that browsing a few folders and uploading a small
// folder locked people out.) Uploads have their own per-user limit.
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'POST' && req.path === '/files/upload',
    message: {
        success: false,
        error: { message: 'Too many requests. Please try again later.' },
    },
});

// Apply global rate limit to all API routes
app.use('/api', globalLimiter);

// ---------------------
// Body Parsing
// ---------------------

// Parse JSON request bodies (req.body will contain parsed JSON)
// Small limit: no JSON endpoint needs more (files go through multer)
app.use(express.json({ limit: '100kb' }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Log every HTTP request to the console
// 'dev' format: GET /api/health 200 3.451 ms
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// ---------------------
// Routes
// ---------------------

// Health check — useful for monitoring and deployment verification
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'DFS Server is running',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
    });
});

// Authentication routes (each route has its own rate limit — see authRoutes.js)
app.use('/api/auth', authRoutes);

// File management routes (upload rate limit lives in fileRoutes.js — it
// must run BEFORE the upload handler, which a separate app.post() after the
// router never did)
app.use('/api/files', fileRoutes);

// Folder routes
app.use('/api/folders', folderRoutes);

// Storage and node routes (protected)
app.get('/api/storage', authenticate, fileController.getStorage);
app.get('/api/nodes', authenticate, fileController.getNodes);

// ---------------------
// 404 Handler
// ---------------------
// If no route matched, this runs
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { message: `Route ${req.method} ${req.path} not found` },
    });
});

// ---------------------
// Error Handler (must be LAST)
// ---------------------
app.use(errorHandler);

module.exports = app;

