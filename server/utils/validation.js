const { validationResult } = require('express-validator');

/**
 * If express-validator found problems, send a 400 whose message is the
 * first concrete problem (shown to the user as-is) and return true.
 */
function rejectInvalid(req, res) {
    const errors = validationResult(req);
    if (errors.isEmpty()) return false;
    const details = errors.array();
    res.status(400).json({
        success: false,
        error: { message: details[0]?.msg || 'Invalid request', details },
    });
    return true;
}

module.exports = { rejectInvalid };
