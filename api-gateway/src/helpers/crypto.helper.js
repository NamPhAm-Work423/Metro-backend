const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function createAPIToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token, secret) {
    return crypto.createHash('sha256', secret).update(token).digest('hex');
}

// SHA256 hash function for password reset tokens (without secret)
function sha256(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Generate secure random token for password reset
function generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

function validateToken(inputToken, storedHashedToken, secret) {
    return hashToken(inputToken, secret) === storedHashedToken;
}

module.exports = { createAPIToken, hashToken, validateToken, sha256, generateResetToken };