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

const googleAuthService = {
    /**
     * Verify a Google ID token and extract user information.
     *
     * @param {string} idToken - The ID token from Google Sign-In (credential)
     * @returns {{ googleId: string, email: string, name: string, picture: string, emailVerified: boolean }}
     * @throws {Error} If token is invalid, expired, or audience doesn't match
     */
    async verifyIdToken(idToken) {
        try {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: config.google.clientId,  // Ensures token was issued for our app
            });

            const payload = ticket.getPayload();

            // Double-check audience (defense in depth)
            if (payload.aud !== config.google.clientId) {
                throw new Error('Token audience mismatch');
            }

            // Verify issuer
            if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
                throw new Error('Token issuer mismatch');
            }

            logger.info(`Google token verified for ${payload.email}`);

            return {
                googleId: payload.sub,              // Unique Google user ID
                email: payload.email,               // User's email
                name: payload.name || payload.email, // Display name (fallback to email)
                picture: payload.picture || null,    // Profile picture URL
                emailVerified: payload.email_verified || false,
            };
        } catch (error) {
            logger.error('Google token verification failed:', error.message);
            throw new Error('Invalid Google credentials. Please try again.');
        }
    },
};

module.exports = googleAuthService;
