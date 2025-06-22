const crypto = require('crypto');

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the random string
 * @returns {string} Random string
 */
const generateRandomString = (length = 10) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Format date to ISO string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  return new Date(date).toISOString();
};

/**
 * Calculate time difference in minutes
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @returns {number} Time difference in minutes
 */
const calculateTimeDifference = (startTime, endTime) => {
  return Math.abs(new Date(endTime) - new Date(startTime)) / (1000 * 60);
};

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether phone number is valid
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Paginate array of items
 * @param {Array} items - Array to paginate
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated result
 */
const paginate = (items, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const totalPages = Math.ceil(items.length / limit);

  return {
    items: items.slice(startIndex, endIndex),
    currentPage: page,
    totalPages,
    totalItems: items.length,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
};

module.exports = {
  generateRandomString,
  formatDate,
  calculateTimeDifference,
  generateUniqueId,
  formatCurrency,
  isValidEmail,
  isValidPhone,
  paginate
}; 