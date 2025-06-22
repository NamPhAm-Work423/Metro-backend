const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function createAPIToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token, secret) {
    return crypto.createHash('sha256', secret).update(token).digest('hex');
}

function validateToken(inputToken, storedHashedToken, secret) {
    return hashToken(inputToken, secret) === storedHashedToken;
}

module.exports = { createAPIToken, hashToken, validateToken };