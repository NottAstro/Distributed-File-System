const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

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

// Trust reverse proxy (needed for Rate Limiter when hosted on Railway/Vercel)
app.set('trust proxy', 1);

// ---------------------
// Security Middleware
// ---------------------

// Helmet — sets secure HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet());

// HPP — prevents HTTP Parameter Pollution attacks
app.use(hpp());

// CORS — restrict origins in production, allow all localhost in development
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // In development, allow any localhost/127.0.0.1 origin
        if (process.env.NODE_ENV !== 'production') {
            if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                return callback(null, true);
            }
        }

        // NOTE: a blanket `*.vercel.app` allowance used to live here. Anyone can
        // deploy to vercel.app, so it let any site call this API. In production
        // the frontend calls /api on its own origin (proxied), so CORS isn't
        // needed there — list extra origins explicitly in CORS_ORIGIN instead.

        // Check explicit allowlist
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Return false instead of throwing an Error to prevent 500 crashes
        return callback(null, false);
    },
    credentials: true,
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

// Strict rate limit for auth routes: 30 attempts per 15 minutes per IP
// (OTP and password-reset limits are applied in authRoutes.js)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: { message: 'Too many login attempts. Please try again in 15 minutes.' },
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

// Authentication routes (with strict rate limiting)
// NOTE: OTP and reset rate limits are applied directly in authRoutes.js
app.use('/api/auth', authLimiter, authRoutes);

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

