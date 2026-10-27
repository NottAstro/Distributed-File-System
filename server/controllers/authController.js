const User = require('../models/User');
const config = require('../config');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { authPayload, publicUser } = require('../utils/token');
const { rejectInvalid } = require('../utils/validation');

const authController = {
    /**
     * GET /api/auth/config
     * Tells the frontend which sign-in methods work on this server, so it
     * can hide a Google button or email-code tab that would only fail.
     * The Google client ID is public by design (it ships in every page).
     */
    getConfig(req, res) {
        res.status(200).json({
            success: true,
            data: {
                googleClientId: config.google.clientId || null,
                emailEnabled: emailService.isConfigured(),
            },
        });
    },

    /**
     * POST /api/auth/register
     * Creates a new account and returns a JWT.
     */
    async register(req, res, next) {
        try {
            if (rejectInvalid(req, res)) return;

            const { username, email, password } = req.body;

            if (await User.findByEmail(email)) {
                return res.status(409).json({
                    success: false,
                    error: { message: 'An account with this email already exists. Try signing in instead.' },
                });
            }

            const user = await User.create(username, email, password);
            logger.success(`New user registered: ${user.username} (id ${user.id})`);

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: authPayload(user),
            });

        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    error: { message: 'An account with this email already exists. Try signing in instead.' },
                });
            }
            next(error);
        }
    },

    /**
     * POST /api/auth/login
     * Authenticates with email + password and returns a JWT.
     */
    async login(req, res, next) {
        try {
            if (rejectInvalid(req, res)) return;

            const { email, password } = req.body;
            const user = await User.findByEmail(email);

            // Same message whether the email or the password is wrong
            // (prevents email enumeration). Google-only accounts have no
            // password, so they land here too instead of crashing bcrypt.
            if (!user || !(await User.comparePassword(password, user.password_hash))) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Incorrect email or password.' },
                });
            }

            logger.info(`User logged in: id ${user.id}`);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: authPayload(user),
            });

        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/auth/profile
     * The current user. The frontend calls this on load to confirm the
     * stored session is still valid.
     */
    getProfile(req, res) {
        res.status(200).json({
            success: true,
            data: { user: publicUser(req.user) },
        });
    },
};

module.exports = authController;
