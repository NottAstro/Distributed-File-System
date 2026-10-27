const User = require('../models/User');
const logger = require('../utils/logger');
const googleAuthService = require('../services/googleAuthService');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const resetService = require('../services/resetService');
const { authPayload } = require('../utils/token');
const { rejectInvalid } = require('../utils/validation');

const mask = (email) => email.replace(/(.{2}).*(@.*)/, '$1***$2');

const oauthController = {
    // ─────────────────────────────────────────────────
    // GOOGLE
    // ─────────────────────────────────────────────────

    /**
     * POST /api/auth/google
     * Receives a Google ID token from Google Identity Services, verifies it
     * server-side, finds/links/creates the user, and returns a JWT.
     */
    async googleLogin(req, res, next) {
        try {
            if (rejectInvalid(req, res)) return;

            const googleUser = await googleAuthService.verifyIdToken(req.body.credential);

            if (!googleUser.emailVerified) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Your Google account email is not verified.' },
                });
            }

            // 1. Already linked
            let user = await User.findByGoogleId(googleUser.googleId);

            if (!user) {
                const existing = await User.findByEmail(googleUser.email);
                if (existing) {
                    // 2. Same email as an existing account → link (see the
                    //    pre-hijacking protection in User.linkGoogleAccount)
                    const { securedUnverifiedAccount } = await User.linkGoogleAccount(
                        existing,
                        googleUser.googleId,
                        googleUser.picture
                    );
                    if (securedUnverifiedAccount) {
                        logger.warn(`Google linked to unverified account ${existing.id}: password cleared, sessions revoked`);
                    } else {
                        logger.info(`Google account linked to existing user ${existing.id}`);
                    }
                    user = await User.findById(existing.id);
                } else {
                    // 3. New user
                    user = await User.createFromGoogle(
                        googleUser.googleId,
                        googleUser.email,
                        googleUser.name,
                        googleUser.picture
                    );
                    logger.success(`New Google user registered: id ${user.id}`);
                }
            }

            res.status(200).json({
                success: true,
                message: 'Google login successful',
                data: authPayload(user),
            });

        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    error: { message: 'This Google account is already linked to another user.' },
                });
            }
            next(error);
        }
    },

    // ─────────────────────────────────────────────────
    // EMAIL CODE (OTP)
    // ─────────────────────────────────────────────────

    /**
     * POST /api/auth/otp/request
     * Emails a 6-digit code. Always answers the same way whether or not the
     * account exists (prevents email enumeration). Fails loudly (503) only
     * when email delivery itself is broken, so users aren't left waiting.
     */
    async requestOtp(req, res, next) {
        try {
            if (rejectInvalid(req, res)) return;
            emailService.assertConfigured();

            const { email } = req.body;
            const user = await User.findByEmail(email);

            if (user) {
                // Codes are stored against the account's stored address so
                // verify (which looks the user up the same way) matches.
                const code = await otpService.generateAndStore(user.email, 'login');
                await emailService.sendOtpEmail(email, code);
            } else {
                logger.info(`OTP requested for unknown email: ${mask(email)}`);
            }

            res.status(200).json({
                success: true,
                message: 'If an account exists for this email, a login code has been sent.',
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/auth/otp/verify
     * Verifies the code and returns a JWT. A correct code proves the user
     * controls the inbox, so the address becomes verified.
     */
    async verifyOtp(req, res, next) {
        try {
            if (rejectInvalid(req, res)) return;

            const { email, code } = req.body;
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'That code is invalid or has expired. Please request a new one.' },
                });
            }

            const result = await otpService.verify(user.email, code, 'login');
            if (!result.valid) {
                return res.status(401).json({
                    success: false,
                    error: { message: result.reason },
                });
            }

            await User.markEmailVerified(user.id);
            logger.info(`User logged in via email code: id ${user.id}`);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: authPayload(await User.findById(user.id)),
            });

        } catch (error) {
            next(error);
        }
    },

    // ─────────────────────────────────────────────────
    // FORGOT / RESET PASSWORD
    // ─────────────────────────────────────────────────

    /**
     * POST /api/auth/forgot-password
     * Emails a reset link. Same response whether or not the account exists.
     * Google-only accounts get a link too: it lets them add a password.
     */
    async forgotPassword(req, res, next) {
        try {
            if (rejectInvalid(req, res)) return;
            emailService.assertConfigured();

            const { email } = req.body;
            const user = await User.findByEmail(email);

            if (user) {
                const token = await resetService.createResetToken(user.id);
                await emailService.sendPasswordResetEmail(email, token);
            } else {
                logger.info(`Password reset requested for unknown email: ${mask(email)}`);
            }

            res.status(200).json({
                success: true,
                message: 'If an account exists for this email, a password reset link has been sent.',
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/auth/reset-password
     * Consumes the single-use token, sets the new password, signs out every
     * other session, and returns a fresh JWT.
     */
    async resetPassword(req, res, next) {
        try {
            if (rejectInvalid(req, res)) return;

            const { token, password } = req.body;
            const result = await resetService.verifyAndConsume(token);

            if (!result.valid) {
                return res.status(401).json({
                    success: false,
                    error: { message: result.reason },
                });
            }

            await User.resetPassword(result.userId, password);
            const user = await User.findById(result.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'This account no longer exists.' },
                });
            }

            logger.success(`Password reset for user ${user.id}; other sessions revoked`);

            res.status(200).json({
                success: true,
                message: 'Password updated. You are now signed in.',
                data: authPayload(user),
            });

        } catch (error) {
            next(error);
        }
    },
};

module.exports = oauthController;
