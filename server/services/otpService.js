const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * OTP Service
 *
 * Generates, stores, and verifies one-time passwords for email-based login.
 *
 * SECURITY:
 * - OTP codes are bcrypt-hashed before storage (DB compromise doesn't leak codes)
 * - 5-minute expiry window
 * - Max 5 verification attempts per code (prevents brute-force)
 * - Old codes for same email are deleted when new one is generated
 * - Codes are 6 digits (000000–999999)
 */

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

const otpService = {
    /**
     * Generate a 6-digit OTP, hash it, store in DB, return plain-text code.
     * Deletes any existing OTPs for this email first (only latest is valid).
     *
     * @param {string} email - User's email address
     * @param {string} purpose - 'login' or 'verify'
     * @returns {string} Plain-text 6-digit OTP code
     */
    async generateAndStore(email, purpose = 'login') {
        // Generate cryptographically secure 6-digit code
        const code = crypto.randomInt(100000, 999999).toString();

        // Hash the code before storing (same approach as passwords)
        const salt = await bcrypt.genSalt(10);
        const codeHash = await bcrypt.hash(code, salt);

        // Calculate expiry timestamp
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Delete any existing OTPs for this email + purpose (only latest is valid)
        await pool.execute(
            'DELETE FROM otp_codes WHERE email = ? AND purpose = ?',
            [email, purpose]
        );

        // Store the hashed code
        await pool.execute(
            'INSERT INTO otp_codes (email, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?)',
            [email, codeHash, purpose, expiresAt]
        );

        logger.info(`OTP generated for ${email.replace(/(.{2}).*(@.*)/, '$1***$2')} (purpose: ${purpose})`);
        return code;
    },

    /**
     * Verify an OTP code against the stored hash.
     *
     * @param {string} email - User's email address
     * @param {string} code - Plain-text OTP code from user input
     * @param {string} purpose - 'login' or 'verify'
     * @returns {{ valid: boolean, reason?: string }}
     */
    async verify(email, code, purpose = 'login') {
        // Find the latest unexpired OTP for this email
        const [rows] = await pool.execute(
            `SELECT id, code_hash, attempts, expires_at 
             FROM otp_codes 
             WHERE email = ? AND purpose = ? AND expires_at > NOW()
             ORDER BY created_at DESC 
             LIMIT 1`,
            [email, purpose]
        );

        if (rows.length === 0) {
            return { valid: false, reason: 'No valid OTP found. Please request a new code.' };
        }

        const otp = rows[0];

        // Check if max attempts exceeded
        if (otp.attempts >= MAX_ATTEMPTS) {
            // Delete the locked OTP
            await pool.execute('DELETE FROM otp_codes WHERE id = ?', [otp.id]);
            return { valid: false, reason: 'Too many failed attempts. Please request a new code.' };
        }

        // Compare the code against the hash
        const isMatch = await bcrypt.compare(code, otp.code_hash);

        if (!isMatch) {
            // Increment attempt counter
            await pool.execute(
                'UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?',
                [otp.id]
            );
            const remaining = MAX_ATTEMPTS - otp.attempts - 1;
            return {
                valid: false,
                reason: remaining > 0
                    ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
                    : 'Too many failed attempts. Please request a new code.',
            };
        }

        // Success — delete the used OTP (single-use)
        await pool.execute('DELETE FROM otp_codes WHERE id = ?', [otp.id]);
        logger.info(`OTP verified for ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}`);

        return { valid: true };
    },

    /**
     * Clean up expired OTPs from the database.
     * Call periodically (e.g., every hour) or on-demand.
     */
    async cleanup() {
        const [result] = await pool.execute(
            'DELETE FROM otp_codes WHERE expires_at < NOW()'
        );
        if (result.affectedRows > 0) {
            logger.info(`Cleaned up ${result.affectedRows} expired OTP(s)`);
        }
    },
};

module.exports = otpService;
