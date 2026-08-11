const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * User Model
 *
 * Handles all database operations for users.
 * Pattern: Fat Model, Thin Controller — keeps DB logic here,
 * controllers just call these methods and send responses.
 *
 * SECURITY:
 * - Passwords hashed with bcrypt (10 salt rounds)
 * - All queries use pool.execute() (parameterized — prevents SQL injection)
 * - findById() never returns password_hash
 */
const User = {
    /**
     * Create a new user with hashed password.
     * @param {string} username
     * @param {string} email
     * @param {string} password - plain text (will be hashed)
     * @returns {object} - { id, username, email } (no password)
     */
    async create(username, email, password) {
        // Hash the password with 10 salt rounds
        // 10 rounds ≈ 100ms — good balance of security vs speed
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        // Return user WITHOUT password hash
        return { id: result.insertId, username, email };
    },

    /**
     * Create a new user from Google OAuth (no password required).
     * @param {string} googleId - Google's unique user ID (sub claim)
     * @param {string} email
     * @param {string} name - Display name from Google profile
     * @param {string|null} avatarUrl - Profile picture URL
     * @returns {object} - { id, username, email, google_id, auth_provider, avatar_url }
     */
    async createFromGoogle(googleId, email, name, avatarUrl) {
        const [result] = await pool.execute(
            `INSERT INTO users (username, email, google_id, auth_provider, avatar_url, password_hash) 
             VALUES (?, ?, ?, 'google', ?, NULL)`,
            [name, email, googleId, avatarUrl]
        );

        return {
            id: result.insertId,
            username: name,
            email,
            google_id: googleId,
            auth_provider: 'google',
            avatar_url: avatarUrl,
        };
    },

    /**
     * Link a Google account to an existing local user.
     * Used when a user with an existing email signs in with Google.
     * @param {number} userId
     * @param {string} googleId
     * @param {string|null} avatarUrl
     */
    async linkGoogleAccount(userId, googleId, avatarUrl) {
        await pool.execute(
            `UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?`,
            [googleId, avatarUrl, userId]
        );
    },

    /**
     * Find user by email (for login).
     * INCLUDES password_hash — only used internally for comparison.
     * @param {string} email
     * @returns {object|null}
     */
    async findByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Find user by Google ID (for Google OAuth login).
     * @param {string} googleId
     * @returns {object|null}
     */
    async findByGoogleId(googleId) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE google_id = ?',
            [googleId]
        );
        return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Find user by ID (for auth middleware).
     * EXCLUDES password_hash — this result can safely be sent to the client.
     * @param {number} id
     * @returns {object|null}
     */
    async findById(id) {
        const [rows] = await pool.execute(
            'SELECT id, username, email, google_id, auth_provider, avatar_url, created_at, updated_at FROM users WHERE id = ?',
            [id]
        );
        return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Update user's password (for password reset).
     * @param {number} userId
     * @param {string} newPassword - Plain text (will be hashed)
     */
    async updatePassword(userId, newPassword) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, userId]
        );
    },

    /**
     * Compare plain-text password against stored bcrypt hash.
     * @param {string} password - plain text from user input
     * @param {string} hash - stored bcrypt hash from database
     * @returns {boolean}
     */
    async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    },
};

module.exports = User;
