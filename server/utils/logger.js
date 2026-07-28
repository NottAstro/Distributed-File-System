/**
 * Logger Utility
 *
 * Wraps console methods with timestamps and colored labels.
 * WHY: So we can swap to Winston/Pino later without changing every file.
 */
const colors = {
    reset:  '\x1b[0m',
    red:    '\x1b[31m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
};

const timestamp = () => new Date().toISOString();

const logger = {
    info:    (msg, ...a) => console.log(`${colors.cyan}[${timestamp()}] INFO:${colors.reset}`, msg, ...a),
    success: (msg, ...a) => console.log(`${colors.green}[${timestamp()}] ✅${colors.reset}`, msg, ...a),
    warn:    (msg, ...a) => console.warn(`${colors.yellow}[${timestamp()}] WARN:${colors.reset}`, msg, ...a),
    error:   (msg, ...a) => console.error(`${colors.red}[${timestamp()}] ERROR:${colors.reset}`, msg, ...a),
};

module.exports = logger;
