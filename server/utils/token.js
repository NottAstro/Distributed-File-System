const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT helpers shared by every login method.
 *
 * The token carries `tv` (token version). Bumping users.token_version —
 * on password reset or when an account is secured — invalidates every
 * token issued before, i.e. signs the user out everywhere.
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, tv: user.token_version || 0 },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
}

/** The user fields the client is allowed to see — never hashes or tokens. */
function publicUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        authProvider: user.auth_provider || 'local',
        avatarUrl: user.avatar_url || null,
        emailVerified: Boolean(user.email_verified),
    };
}

/** Standard success payload for any login: { user, token }. */
function authPayload(user) {
    return { user: publicUser(user), token: generateToken(user) };
}

module.exports = { generateToken, publicUser, authPayload };
