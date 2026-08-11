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
const authenticate = require('./middleware/authMiddleware');
const fileController = require('./controllers/fileController');

// Create Express app
const app = express();

// ---------------------
// Security Middleware
// ---------------------

// Helmet — sets secure HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet());

// HPP — prevents HTTP Parameter Pollution attacks
app.use(hpp());

// CORS — restrict origins in production, allow all in development
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// ---------------------
// Rate Limiting
// ---------------------

// Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: { message: 'Too many requests. Please try again later.' },
    },
});

// Strict rate limit for auth routes: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: { message: 'Too many login attempts. Please try again in 15 minutes.' },
    },
});

// Upload rate limit: 20 uploads per 15 minutes per IP
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: { message: 'Upload limit reached. Please try again later.' },
    },
});

// Apply global rate limit to all API routes
app.use('/api', globalLimiter);

// ---------------------
// Body Parsing
// ---------------------

// Parse JSON request bodies (req.body will contain parsed JSON)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/auth', authLimiter, authRoutes);

// File management routes (upload route gets its own rate limit)
app.use('/api/files', fileRoutes);
app.post('/api/files/upload', uploadLimiter); // Additional rate limit on uploads

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

