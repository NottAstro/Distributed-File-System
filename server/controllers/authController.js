const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Generate a signed JWT.
 * Payload contains only id + username — never secrets.
 * JWTs are base64-encoded (readable by anyone), not encrypted.
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
}

const authController = {
    /**
     * POST /api/auth/register
     * Creates a new user account and returns a JWT.
     */
    async register(req, res, next) {
        try {
            // Check for validation errors (from express-validator in routes)
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Validation failed', details: errors.array() },
                });
            }

            const { username, email, password } = req.body;

            // Check if email already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: { message: 'An account with this email already exists.' },
                });
            }

            // Create the user (password is hashed inside User.create)
            const user = await User.create(username, email, password);
            logger.success(`New user registered: ${username} (${email})`);

            // Generate JWT
            const token = generateToken(user);

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: {
                    user: { id: user.id, username: user.username, email: user.email },
                    token,
                },
            });

        } catch (error) {
            // Handle duplicate username (MySQL error code ER_DUP_ENTRY)
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    error: { message: 'Username or email already taken.' },
                });
            }
            next(error);  // Pass to global error handler
        }
    },

    /**
     * POST /api/auth/login
     * Authenticates a user and returns a JWT.
     */
    async login(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Validation failed', details: errors.array() },
                });
            }

            const { email, password } = req.body;

            // Find user by email
            const user = await User.findByEmail(email);
            if (!user) {
                // SECURITY: Same error message whether email or password is wrong
                // Prevents attackers from enumerating valid email addresses
                return res.status(401).json({
                    success: false,
                    error: { message: 'Invalid email or password.' },
                });
            }

            // Compare passwords
            const isMatch = await User.comparePassword(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Invalid email or password.' },
                });
            }

            logger.info(`User logged in: ${user.username}`);

            // Generate JWT
            const token = generateToken(user);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: { id: user.id, username: user.username, email: user.email },
                    token,
                },
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/auth/profile
     * Returns the current user's profile (protected route).
     * req.user is set by the authenticate middleware.
     */
    async getProfile(req, res, next) {
        try {
            res.status(200).json({
                success: true,
                data: { user: req.user },
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = authController;
