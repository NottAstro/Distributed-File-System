const crypto = require('crypto');
const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Password Reset Service
 *
 * Generates and verifies password-reset tokens.
 *
 * SECURITY:
 * - Tokens are crypto-random (64 bytes, hex-encoded = 128 chars)
 * - Stored as SHA-256 hash (fast lookup, still secure since tokens are high-entropy)
 * - 15-minute expiry
 * - Single-use (marked as `used` after consumption)
 * - Previous tokens for same user are invalidated when a new one is created
 */

const RESET_EXPIRY_MINUTES = 15;

const resetService = {
    /**
     * Create a password-reset token for a user.
     * Invalidates any existing tokens for this user.
     *
     * @param {number} userId - The user's database ID
     * @returns {string} Plain-text reset token (to be included in email link)
     */
    async createResetToken(userId) {
        // Generate a cryptographically secure random token
        const token = crypto.randomBytes(64).toString('hex');

        // Hash the token before storing (SHA-256 is fine here — tokens are high-entropy)
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Calculate expiry
        const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

        // Invalidate any existing tokens for this user
        await pool.execute(
            'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE',
            [userId]
        );

        // Store the hashed token
        await pool.execute(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
            [userId, tokenHash, expiresAt]
        );

        logger.info(`Password reset token created for user ID ${userId}`);
        return token;
    },

    /**
     * Verify a reset token and return the associated user_id.
     * Marks the token as used (single-use).
     *
     * @param {string} token - Plain-text token from the reset URL
     * @returns {{ valid: boolean, userId?: number, reason?: string }}
     */
    async verifyAndConsume(token) {
        // Hash the incoming token to match against DB
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find matching, unexpired, unused token
        const [rows] = await pool.execute(
            `SELECT id, user_id, expires_at 
             FROM password_reset_tokens 
             WHERE token_hash = ? AND used = FALSE AND expires_at > NOW()
             LIMIT 1`,
            [tokenHash]
        );

        if (rows.length === 0) {
            return { valid: false, reason: 'Invalid or expired reset link. Please request a new one.' };
        }

        const resetToken = rows[0];

        // Mark as used (single-use)
        await pool.execute(
            'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
            [resetToken.id]
        );

        logger.info(`Password reset token consumed for user ID ${resetToken.user_id}`);
        return { valid: true, userId: resetToken.user_id };
    },

    /**
     * Clean up expired/used tokens from the database.
     */
    async cleanup() {
        const [result] = await pool.execute(
            'DELETE FROM password_reset_tokens WHERE used = TRUE OR expires_at < NOW()'
        );
        if (result.affectedRows > 0) {
            logger.info(`Cleaned up ${result.affectedRows} expired/used reset token(s)`);
        }
    },
};

module.exports = resetService;
