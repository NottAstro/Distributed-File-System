const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

/**
 * JWT Authentication Middleware
 *
 * Expects: Authorization: Bearer <token>
 * Sets:    req.user = { id, username, email, ... }
 *
 * SECURITY:
 * - Verifies token signature (not tampered)
 * - Checks token expiration
 * - Confirms user still exists in DB (handles deleted accounts)
 * - Rejects tokens revoked by a password reset (token_version)
 * - Never reveals whether email or token format is the issue
 */
async function authenticate(req, res, next) {
    try {
        // Step 1: Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ') || !authHeader.slice(7).trim()) {
            return res.status(401).json({
                success: false,
                error: { message: 'Access denied. No token provided.' },
            });
        }

        // "Bearer eyJhbGciOi..." → "eyJhbGciOi..."
        const token = authHeader.split(' ')[1];

        // Step 2: Verify the token (checks signature + expiration)
        const decoded = jwt.verify(token, config.jwt.secret);

        // Step 3: Confirm user still exists in DB
        // (in case the user was deleted after the token was issued)
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { message: 'User no longer exists.' },
            });
        }

        // Step 3b: Reject tokens issued before a password reset / account
        // lock-down (token_version is bumped then; old tokens carry the old one)
        if ((decoded.tv || 0) !== (user.token_version || 0)) {
            return res.status(401).json({
                success: false,
                error: { message: 'Your session has ended. Please sign in again.' },
            });
        }

        // Step 4: Attach user to the request object
        req.user = user;

        // Step 5: Continue to the next middleware/route handler
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: { message: 'Your session has expired. Please sign in again.' },
            });
        }
        return res.status(401).json({
            success: false,
            error: { message: 'Invalid session. Please sign in again.' },
        });
    }
}

module.exports = authenticate;
