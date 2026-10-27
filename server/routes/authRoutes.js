const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const oauthController = require('../controllers/oauthController');
const authenticate = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// --- Rate Limiters (route-specific, per IP) ---

const limiter = (max, message) =>
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: { message } },
    });

// Login / register attempts
const credentialLimiter = limiter(30, 'Too many sign-in attempts. Please try again in 15 minutes.');
// Sending email (codes, reset links) — kept separate from checking codes, so
// a couple of typos can't block someone from requesting a new code
const sendEmailLimiter = limiter(5, 'Too many emails requested. Please try again in 15 minutes.');
const otpVerifyLimiter = limiter(15, 'Too many code attempts. Please try again in 15 minutes.');
const resetLimiter = limiter(10, 'Too many reset attempts. Please try again in 15 minutes.');

// --- Validation Rules ---
// These run BEFORE the controller and reject bad input early.
// Emails are trimmed + lowercased only (see User.normalizeEmail) — the
// validator's normalizeEmail() would strip dots from Gmail addresses,
// which Google sign-in keeps.

const emailRule = () =>
    body('email')
        .isString()
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .isLength({ max: 100 })
        .withMessage('Email is too long')
        .customSanitizer(User.normalizeEmail);

const newPasswordRule = (field = 'password') =>
    body(field)
        .isString()
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be 8–128 characters');

const registerValidation = [
    body('username')
        .isString()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    emailRule(),
    newPasswordRule(),
];

const loginValidation = [
    emailRule(),
    body('password').isString().notEmpty().withMessage('Password is required'),
];

const googleValidation = [
    body('credential')
        .isString()
        .withMessage('Invalid credential format')
        .notEmpty()
        .withMessage('Google credential is required'),
];

const otpVerifyValidation = [
    emailRule(),
    body('code')
        .isString()
        .trim()
        .matches(/^\d{6}$/)
        .withMessage('Code must be 6 digits'),
];

const resetPasswordValidation = [
    body('token')
        .isString()
        .matches(/^[0-9a-f]{128}$/)
        .withMessage('Invalid or expired reset link. Please request a new one.'),
    newPasswordRule(),
];

// --- Routes ---

// GET /api/auth/config — which sign-in methods this server supports (public)
router.get('/config', authController.getConfig);

// POST /api/auth/register — Create a new account
router.post('/register', credentialLimiter, registerValidation, authController.register);

// POST /api/auth/login — Log in and get a token
router.post('/login', credentialLimiter, loginValidation, authController.login);

// GET /api/auth/profile — Get current user (protected; also validates the session)
router.get('/profile', authenticate, authController.getProfile);

// POST /api/auth/google — Google sign-in (ID token verification)
router.post('/google', credentialLimiter, googleValidation, oauthController.googleLogin);

// POST /api/auth/otp/request — Email a one-time login code
router.post('/otp/request', sendEmailLimiter, [emailRule()], oauthController.requestOtp);

// POST /api/auth/otp/verify — Verify the code and log in
router.post('/otp/verify', otpVerifyLimiter, otpVerifyValidation, oauthController.verifyOtp);

// POST /api/auth/forgot-password — Email a password-reset link
router.post('/forgot-password', sendEmailLimiter, [emailRule()], oauthController.forgotPassword);

// POST /api/auth/reset-password — Set a new password with the emailed token
router.post('/reset-password', resetLimiter, resetPasswordValidation, oauthController.resetPassword);

module.exports = router;
