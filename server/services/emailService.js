const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Email Service
 *
 * Sends OTP codes and password-reset emails via SMTP.
 * In development, if real SMTP is unconfigured or fails, it automatically
 * provisions an Ethereal Email test account to safely preview emails.
 */

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
        });

        try {
            await realTransporter.verify();
            logger.info('SMTP email service connected');
            transporter = realTransporter;
            return transporter;
        } catch (err) {
            logger.error('SMTP connection failed:', err.message);
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

    throw new Error('Email service is not configured');
}

// Fire-and-forget initialization on startup
getTransporter().catch(err => logger.error(err.message));

const emailService = {
    async sendOtpEmail(to, otpCode) {
        const mailOptions = {
            from: config.smtp.from,
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

        try {
            const mailTransporter = await getTransporter();
            const info = await mailTransporter.sendMail(mailOptions);
            logger.info(`OTP email sent to ${to.replace(/(.{2}).*(@.*)/, '$1***$2')}`);
            
            // Log Ethereal preview URL in development
            if (config.nodeEnv !== 'production' && nodemailer.getTestMessageUrl(info)) {
                logger.info(`Email Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }
        } catch (error) {
            logger.error('Failed to send OTP email:', error.message);
            throw new Error('Failed to send email. Please try again.');
        }
    },

    async sendPasswordResetEmail(to, resetToken) {
        const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: config.smtp.from,
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

        try {
            const mailTransporter = await getTransporter();
            const info = await mailTransporter.sendMail(mailOptions);
            logger.info(`Password reset email sent to ${to.replace(/(.{2}).*(@.*)/, '$1***$2')}`);

            if (config.nodeEnv !== 'production' && nodemailer.getTestMessageUrl(info)) {
                logger.info(`Email Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }
        } catch (error) {
            logger.error('Failed to send reset email:', error.message);
            throw new Error('Failed to send email. Please try again.');
        }
    },
};

module.exports = emailService;
