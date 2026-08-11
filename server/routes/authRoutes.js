const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
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

// --- Routes ---

// POST /api/auth/register — Create a new account
router.post('/register', registerValidation, authController.register);

// POST /api/auth/login — Log in and get a token
router.post('/login', loginValidation, authController.login);

// GET /api/auth/profile — Get current user (protected)
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
