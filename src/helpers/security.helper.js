const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Hash password
 * @param {string} password - Password to hash
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 * @param {string} password - Password to compare
 * @param {string} hash - Hash to compare with
 * @returns {Promise<boolean>} Whether password matches hash
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = '1d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify JWT token
 * @param {string} token - Token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Generate random token
 * @param {number} length - Token length
 * @returns {string} Random token
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate password reset token
 * @returns {Object} Reset token and expiry
 */
const generatePasswordResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const tokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  return {
    resetToken,
    hashedToken,
    tokenExpiry
  };
};

/**
 * Sanitize user data
 * @param {Object} user - User object
 * @returns {Object} Sanitized user object
 */
const sanitizeUser = (user) => {
  const sanitized = { ...user };
  delete sanitized.password;
  delete sanitized.resetPasswordToken;
  delete sanitized.resetPasswordExpires;
  return sanitized;
};

/**
 * Check if user has required role
 * @param {Object} user - User object
 * @param {string|Array} roles - Required role(s)
 * @returns {boolean} Whether user has required role
 */
const hasRole = (user, roles) => {
  if (!user || !user.role) return false;
  if (Array.isArray(roles)) {
    return roles.includes(user.role);
  }
  return user.role === roles;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateRandomToken,
  generatePasswordResetToken,
  sanitizeUser,
  hasRole
}; 