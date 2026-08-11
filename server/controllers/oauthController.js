const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const config = require('../config');
const logger = require('../utils/logger');
const googleAuthService = require('../services/googleAuthService');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const resetService = require('../services/resetService');

/**
 * Generate a signed JWT.
 * Payload contains only id + username — never secrets.
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
}

const oauthController = {
    // ─────────────────────────────────────────────────
    // GOOGLE OAUTH
    // ─────────────────────────────────────────────────

    /**
     * POST /api/auth/google
     * Receives a Google ID token from the frontend, verifies it server-side,
     * creates or finds the user, and returns a JWT.
     *
     * Flow:
     * 1. Frontend uses Google Identity Services → gets credential (ID token)
     * 2. Frontend sends ID token to this endpoint
     * 3. We verify it with Google's servers (signature, audience, issuer)
     * 4. If email exists with local auth → auto-link Google account
     * 5. If new email → create new user
     * 6. Return JWT
     */
    async googleLogin(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Validation failed', details: errors.array() },
                });
            }

            const { credential } = req.body;

            // Step 1: Verify the ID token with Google
            const googleUser = await googleAuthService.verifyIdToken(credential);

            if (!googleUser.emailVerified) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Google email is not verified.' },
                });
            }

            // Step 2: Check if user exists by Google ID
            let user = await User.findByGoogleId(googleUser.googleId);

            if (!user) {
                // Step 3: Check if email already exists (local account)
                const existingUser = await User.findByEmail(googleUser.email);

                if (existingUser) {
                    // Auto-link Google to existing local account
                    await User.linkGoogleAccount(existingUser.id, googleUser.googleId, googleUser.picture);
                    user = await User.findById(existingUser.id);
                    logger.info(`Google account linked to existing user: ${existingUser.username}`);
                } else {
                    // Create a new user from Google profile
                    user = await User.createFromGoogle(
                        googleUser.googleId,
                        googleUser.email,
                        googleUser.name,
                        googleUser.picture
                    );
                    logger.success(`New Google user registered: ${googleUser.name} (${googleUser.email})`);
                }
            }

            // Step 4: Generate JWT
            const token = generateToken(user);

            res.status(200).json({
                success: true,
                message: 'Google login successful',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        authProvider: user.auth_provider,
                        avatarUrl: user.avatar_url,
                    },
                    token,
                },
            });

        } catch (error) {
            // Handle duplicate key errors gracefully
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    error: { message: 'An account with this email already exists.' },
                });
            }
            next(error);
        }
    },

    // ─────────────────────────────────────────────────
    // OTP LOGIN
    // ─────────────────────────────────────────────────

    /**
     * POST /api/auth/otp/request
     * Generates a 6-digit OTP, stores it (hashed), and emails it.
     *
     * SECURITY: Always returns success — does NOT reveal whether email exists.
     * This prevents email enumeration attacks.
     */
    async requestOtp(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Validation failed', details: errors.array() },
                });
            }

            const { email } = req.body;

            // Check if user exists — but don't reveal this to the client
            const user = await User.findByEmail(email);

            if (user) {
                // User exists → generate and send OTP
                const code = await otpService.generateAndStore(email, 'login');
                await emailService.sendOtpEmail(email, code);
            } else {
                // User doesn't exist — still return success (anti-enumeration)
                logger.info(`OTP requested for non-existent email: ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}`);
            }

            // SECURITY: Same response regardless of email existence
            res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a login code has been sent.',
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/auth/otp/verify
     * Verifies the OTP code and returns a JWT if valid.
     */
    async verifyOtp(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Validation failed', details: errors.array() },
                });
            }

            const { email, code } = req.body;

            // Verify the OTP
            const result = await otpService.verify(email, code, 'login');

            if (!result.valid) {
                return res.status(401).json({
                    success: false,
                    error: { message: result.reason },
                });
            }

            // OTP is valid — find the user and issue JWT
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Account not found.' },
                });
            }

            logger.info(`User logged in via OTP: ${user.username}`);
            const token = generateToken(user);

            res.status(200).json({
                success: true,
                message: 'OTP login successful',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        authProvider: user.auth_provider,
                        avatarUrl: user.avatar_url,
                    },
                    token,
                },
            });

        } catch (error) {
            next(error);
        }
    },

    // ─────────────────────────────────────────────────
    // FORGOT PASSWORD / RESET PASSWORD
    // ─────────────────────────────────────────────────

    /**
     * POST /api/auth/forgot-password
     * Generates a reset token and sends a reset link via email.
     *
     * SECURITY: Always returns success — does NOT reveal whether email exists.
     */
    async forgotPassword(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Validation failed', details: errors.array() },
                });
            }

            const { email } = req.body;
            const user = await User.findByEmail(email);

            if (user) {
                // Check if user has a password (Google-only users can't reset)
                if (user.auth_provider === 'google' && !user.password_hash) {
                    // Still return success (anti-enumeration), but log it
                    logger.info(`Password reset attempted for Google-only user: ${email}`);
                } else {
                    const token = await resetService.createResetToken(user.id);
                    await emailService.sendPasswordResetEmail(email, token);
                }
            } else {
                logger.info(`Password reset requested for non-existent email: ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}`);
            }

            // SECURITY: Same response regardless
            res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.',
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/auth/reset-password
     * Verifies the reset token and updates the user's password.
     * Returns a fresh JWT so the user is logged in after reset.
     */
    async resetPassword(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Validation failed', details: errors.array() },
                });
            }

            const { token, password } = req.body;

            // Verify and consume the reset token (single-use)
            const result = await resetService.verifyAndConsume(token);

            if (!result.valid) {
                return res.status(401).json({
                    success: false,
                    error: { message: result.reason },
                });
            }

            // Update the password
            await User.updatePassword(result.userId, password);

            // Fetch user for JWT
            const user = await User.findById(result.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'User not found.' },
                });
            }

            logger.success(`Password reset successful for user: ${user.username}`);
            const jwtToken = generateToken(user);

            res.status(200).json({
                success: true,
                message: 'Password reset successful. You are now logged in.',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        authProvider: user.auth_provider,
                        avatarUrl: user.avatar_url,
                    },
                    token: jwtToken,
                },
            });

        } catch (error) {
            next(error);
        }
    },
};

module.exports = oauthController;
