const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

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
// Global Middleware
// ---------------------

// Parse JSON request bodies (req.body will contain parsed JSON)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all origins (restrict to specific origins in production)
app.use(cors());

// Log every HTTP request to the console
// 'dev' format: GET /api/health 200 3.451 ms
app.use(morgan('dev'));

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

// Authentication routes
app.use('/api/auth', authRoutes);

// File management routes
app.use('/api/files', fileRoutes);

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
