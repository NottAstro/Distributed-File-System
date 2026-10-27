const nodemailer = require('nodemailer');
const dns = require('dns');
const config = require('../config');
const logger = require('../utils/logger');

// Force Node.js to resolve IPv4 addresses first.
// This prevents ENETUNREACH SMTP errors on hosts that don't route IPv6.
dns.setDefaultResultOrder('ipv4first');

/**
 * Email Service
 *
 * Sends OTP codes and password-reset emails. Delivery, in order of preference:
 *   1. Resend HTTPS API (RESEND_API_KEY) — works on hosts that block SMTP
 *      ports (e.g. Railway below the Pro plan)
 *   2. SMTP (SMTP_USER + SMTP_PASS)
 *   3. Development only: an Ethereal test inbox (preview links in the log)
 */

function httpError(message, statusCode) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.expose = true; // message is meant for the user
    return err;
}

const UNAVAILABLE = 'Email delivery is not available right now. Please use another sign-in method or try again later.';

let transporter = null;

async function getTransporter() {
    if (transporter) return transporter;

    // Attempt to use real SMTP if credentials exist
    if (config.smtp.user && config.smtp.pass) {
        const realTransporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.port === 465,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
            family: 4,
        });

        try {
            await realTransporter.verify();
            logger.info('SMTP email service connected');
            transporter = realTransporter;
            return transporter;
        } catch (err) {
            logger.error('SMTP connection failed:', err.message);
            if (config.nodeEnv === 'production') {
                throw httpError(UNAVAILABLE, 503);
            }
        }
    }

    // Fallback to Ethereal Email for local development
    if (config.nodeEnv !== 'production') {
        logger.info('Provisioning Ethereal test account for local email testing...');
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        logger.info('Ethereal test account ready. Emails will generate preview links.');
        return transporter;
    }

    throw httpError(UNAVAILABLE, 503);
}

/** Send through Resend's HTTPS API (no SDK needed). */
async function sendViaResend({ to, subject, html, text }) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.resend.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: config.smtp.from, to: [to], subject, html, text }),
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Resend API ${res.status}: ${detail.slice(0, 300)}`);
    }
}

/** Deliver one message with whichever transport is configured. */
async function deliver(message, label) {
    const to = message.to.replace(/(.{2}).*(@.*)/, '$1***$2');
    try {
        if (config.resend.apiKey) {
            await sendViaResend(message);
        } else {
            const mailTransporter = await getTransporter();
            const info = await mailTransporter.sendMail({ from: config.smtp.from, ...message });
            if (config.nodeEnv !== 'production' && nodemailer.getTestMessageUrl(info)) {
                logger.info(`Email Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }
        }
        logger.info(`${label} email sent to ${to}`);
    } catch (error) {
        logger.error(`Failed to send ${label} email to ${to}:`, error.message);
        throw error.statusCode ? error : httpError(UNAVAILABLE, 503);
    }
}

const emailService = {
    /** True when this server can actually deliver email. */
    isConfigured() {
        return Boolean(config.resend.apiKey || (config.smtp.user && config.smtp.pass) || config.nodeEnv !== 'production');
    },

    /** Throw a clear 503 instead of failing later (or silently). */
    assertConfigured() {
        if (!this.isConfigured()) throw httpError(UNAVAILABLE, 503);
    },

    async sendOtpEmail(to, otpCode) {
        const mailOptions = {
            to,
            subject: 'Your upLoader Login Code',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0b14; border-radius: 12px; border: 1px solid #1a1b2e;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">upLoader</h1>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Distributed File Storage</p>
                    </div>
                    <div style="background: #111227; border-radius: 8px; padding: 24px; text-align: center; border: 1px solid #1e1f3a;">
                        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 16px 0;">Your one-time login code is:</p>
                        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #818cf8; font-family: 'Courier New', monospace; padding: 12px 0;">
                            ${otpCode}
                        </div>
                        <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0 0;">This code expires in <strong style="color: #9ca3af;">5 minutes</strong></p>
                    </div>
                    <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
                        If you didn't request this code, you can safely ignore this email.
                    </p>
                </div>
            `,
            text: `Your upLoader login code is: ${otpCode}\n\nThis code expires in 5 minutes.\nIf you didn't request this, ignore this email.`,
        };

        await deliver(mailOptions, 'Login code');
    },

    async sendPasswordResetEmail(to, resetToken) {
        const resetUrl = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

        const mailOptions = {
            to,
            subject: 'Reset Your upLoader Password',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0b14; border-radius: 12px; border: 1px solid #1a1b2e;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">upLoader</h1>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Password Reset</p>
                    </div>
                    <div style="background: #111227; border-radius: 8px; padding: 24px; text-align: center; border: 1px solid #1e1f3a;">
                        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 20px 0;">
                            We received a request to reset your password. Click the button below to choose a new password:
                        </p>
                        <a href="${resetUrl}" 
                           style="display: inline-block; background: #818cf8; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            Reset Password
                        </a>
                        <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0 0;">
                            This link expires in <strong style="color: #9ca3af;">15 minutes</strong>
                        </p>
                    </div>
                    <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
                        If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.
                    </p>
                    <p style="color: #4b5563; font-size: 11px; text-align: center; margin-top: 12px; word-break: break-all;">
                        Link not working? Copy and paste this URL into your browser:<br/>
                        <span style="color: #6b7280;">${resetUrl}</span>
                    </p>
                </div>
            `,
            text: `Reset your upLoader password\n\nVisit this link to reset your password:\n${resetUrl}\n\nThis link expires in 15 minutes.\nIf you didn't request this, ignore this email.`,
        };

        await deliver(mailOptions, 'Password reset');
    },
};

module.exports = emailService;
