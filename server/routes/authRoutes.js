const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const oauthController = require('../controllers/oauthController');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

// --- Validation Rules ---
// These run BEFORE the controller and reject bad input early

const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_ ]+$/)
        .withMessage('Username can only contain letters, numbers, underscores, and spaces'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

const googleValidation = [
    body('credential')
        .notEmpty()
        .withMessage('Google credential is required')
        .isString()
        .withMessage('Invalid credential format'),
];

const otpRequestValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
];

const otpVerifyValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('code')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits')
        .isNumeric()
        .withMessage('OTP must contain only numbers'),
];

const forgotPasswordValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
];

const resetPasswordValidation = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required')
        .isLength({ min: 64 })
        .withMessage('Invalid reset token'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
];

// --- Routes ---

// POST /api/auth/register — Create a new account
router.post('/register', registerValidation, authController.register);

// POST /api/auth/login — Log in and get a token
router.post('/login', loginValidation, authController.login);

// GET /api/auth/profile — Get current user (protected)
router.get('/profile', authenticate, authController.getProfile);

// POST /api/auth/google — Google OAuth login (ID token verification)
router.post('/google', googleValidation, oauthController.googleLogin);

// POST /api/auth/otp/request — Request an OTP code via email
router.post('/otp/request', otpRequestValidation, oauthController.requestOtp);

// POST /api/auth/otp/verify — Verify OTP code and login
router.post('/otp/verify', otpVerifyValidation, oauthController.verifyOtp);

// POST /api/auth/forgot-password — Request password reset email
router.post('/forgot-password', forgotPasswordValidation, oauthController.forgotPassword);

// POST /api/auth/reset-password — Reset password with token
router.post('/reset-password', resetPasswordValidation, oauthController.resetPassword);

module.exports = router;
