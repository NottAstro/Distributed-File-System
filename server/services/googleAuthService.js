const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Google Auth Service
 *
 * Verifies Google ID tokens server-side using Google's official library.
 * This is the ONLY secure way to handle Google sign-in — never trust
 * the client-side payload alone.
 *
 * SECURITY:
 * - Validates token signature (not tampered)
 * - Checks `aud` (audience) matches our Client ID
 * - Checks `iss` (issuer) is Google
 * - Checks token expiration
 * - Extracts verified user info (sub, email, name, picture)
 *
 * SETUP:
 * 1. Go to https://console.cloud.google.com/apis/credentials
 * 2. Create OAuth 2.0 Client ID (Web application)
 * 3. Add authorized JavaScript origins (your frontend URL)
 * 4. Copy Client ID to GOOGLE_CLIENT_ID in .env
 */

const client = new OAuth2Client(config.google.clientId);

function httpError(message, statusCode) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.expose = true; // message is meant for the user
    return err;
}

const googleAuthService = {
    /**
     * Verify a Google ID token and extract user information.
     *
     * @param {string} idToken - The ID token from Google Sign-In (credential)
     * @returns {{ googleId: string, email: string, name: string, picture: string, emailVerified: boolean }}
     * @throws 503 if Google sign-in isn't configured, 401 if the token is invalid
     */
    async verifyIdToken(idToken) {
        if (!config.google.clientId) {
            throw httpError('Google sign-in is not configured on this server.', 503);
        }

        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: config.google.clientId,  // Ensures token was issued for our app
            });
            payload = ticket.getPayload();
        } catch (error) {
            // Expired token, wrong audience (frontend and backend use different
            // client IDs), clock skew, tampering…
            logger.warn('Google token verification failed:', error.message);
            throw httpError('Google sign-in could not be verified. Please try again.', 401);
        }

        // Verify issuer (defense in depth — the library checks it too)
        if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
            throw httpError('Google sign-in could not be verified. Please try again.', 401);
        }

        return {
            googleId: payload.sub,                // Unique Google user ID
            email: payload.email,                 // User's email
            name: payload.name || payload.email,  // Display name (fallback to email)
            picture: payload.picture || null,     // Profile picture URL
            emailVerified: payload.email_verified === true,
        };
    },
};

module.exports = googleAuthService;
