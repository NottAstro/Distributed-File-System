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

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Normalise an email the same way for every login method: trim + lowercase.
 * (express-validator's default normalizeEmail() also strips dots and
 * +tags from Gmail addresses, but Google sign-in reports the address with
 * its dots — so the same person could end up with two accounts, or be
 * unable to get an email code.)
 */
function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

/**
 * The form older versions stored for Gmail addresses: dots and +tag removed,
 * googlemail.com → gmail.com. Used only as a lookup fallback so accounts
 * created before the normalisation fix keep working.
 */
function legacyGmailForm(email) {
    const [local, domain] = normalizeEmail(email).split('@');
    if (!local || !GMAIL_DOMAINS.has(domain)) return null;
    return `${local.split('+')[0].replace(/\./g, '')}@gmail.com`;
}

const PUBLIC_COLUMNS =
    'id, username, email, google_id, auth_provider, avatar_url, email_verified, token_version, created_at, updated_at';

const User = {
    normalizeEmail,

    /**
     * Create a new user with hashed password.
     * @returns {object} - user row without password hash
     */
    async create(username, email, password) {
        // 10 rounds ≈ 100ms — good balance of security vs speed
        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, normalizeEmail(email), passwordHash]
        );

        return this.findById(result.insertId);
    },

    /**
     * Create a new user from Google OAuth (no password).
     * Google has verified the address, so email_verified starts TRUE.
     */
    async createFromGoogle(googleId, email, name, avatarUrl) {
        const [result] = await pool.execute(
            `INSERT INTO users (username, email, google_id, auth_provider, avatar_url, password_hash, email_verified)
             VALUES (?, ?, ?, 'google', ?, NULL, TRUE)`,
            [name.slice(0, 50), normalizeEmail(email), googleId, avatarUrl]
        );

        return this.findById(result.insertId);
    },

    /**
     * Link a Google account to an existing user.
     *
     * SECURITY (account pre-hijacking): sign-up never verifies email, so an
     * attacker could register the victim's address with a password first.
     * If the existing account was never verified, Google is the first proof
     * of ownership — so drop the unverified password and sign out every
     * existing session. The real owner keeps Google / email-code login and
     * can set a password via "Forgot password".
     */
    async linkGoogleAccount(user, googleId, avatarUrl) {
        const wasVerified = Boolean(user.email_verified);
        await pool.execute(
            `UPDATE users SET
                google_id = ?,
                avatar_url = COALESCE(avatar_url, ?),
                email_verified = TRUE,
                password_hash = IF(?, password_hash, NULL),
                token_version = token_version + IF(?, 0, 1)
             WHERE id = ?`,
            [googleId, avatarUrl, wasVerified, wasVerified, user.id]
        );
        return { securedUnverifiedAccount: !wasVerified && Boolean(user.password_hash) };
    },

    /**
     * Find user by email (for login). INCLUDES password_hash — internal only.
     * Falls back to the legacy Gmail form for accounts created before the
     * normalisation fix.
     */
    async findByEmail(email) {
        const normalized = normalizeEmail(email);
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [normalized]);
        if (rows.length > 0) return rows[0];

        const legacy = legacyGmailForm(normalized);
        if (legacy && legacy !== normalized) {
            const [legacyRows] = await pool.execute('SELECT * FROM users WHERE email = ?', [legacy]);
            if (legacyRows.length > 0) return legacyRows[0];
        }
        return null;
    },

    /** Find user by Google ID (for Google OAuth login). */
    async findByGoogleId(googleId) {
        const [rows] = await pool.execute('SELECT * FROM users WHERE google_id = ?', [googleId]);
        return rows.length > 0 ? rows[0] : null;
    },

    /**
     * Find user by ID (for auth middleware).
     * EXCLUDES password_hash.
     */
    async findById(id) {
        const [rows] = await pool.execute(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);
        return rows.length > 0 ? rows[0] : null;
    },

    /** Proving control of the inbox (email code, reset link) verifies it. */
    async markEmailVerified(userId) {
        await pool.execute('UPDATE users SET email_verified = TRUE WHERE id = ?', [userId]);
    },

    /**
     * Set a new password and sign out every existing session.
     * Used by password reset — the reset link also proves email ownership.
     */
    async resetPassword(userId, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            `UPDATE users SET password_hash = ?, email_verified = TRUE, token_version = token_version + 1
             WHERE id = ?`,
            [passwordHash, userId]
        );
    },

    /** Compare plain-text password against stored bcrypt hash. */
    async comparePassword(password, hash) {
        if (!hash) return false; // Google-only accounts have no password
        return bcrypt.compare(password, hash);
    },
};

module.exports = User;
