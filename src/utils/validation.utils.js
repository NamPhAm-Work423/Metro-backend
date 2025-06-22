const { isValidEmail, isValidPhone } = require('./common.utils');

/**
 * Validate user registration data
 * @param {Object} data - User registration data
 * @returns {Object} Validation result
 */
const validateRegistration = (data) => {
  const errors = {};

  if (!data.email || !isValidEmail(data.email)) {
    errors.email = 'Valid email is required';
  }

  if (!data.password || data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long';
  }

  if (!data.name || data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.phone = 'Valid phone number is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate ticket data
 * @param {Object} data - Ticket data
 * @returns {Object} Validation result
 */
const validateTicket = (data) => {
  const errors = {};

  if (!data.routeId) {
    errors.routeId = 'Route ID is required';
  }

  if (!data.passengerId) {
    errors.passengerId = 'Passenger ID is required';
  }

  if (!data.scheduleId) {
    errors.scheduleId = 'Schedule ID is required';
  }

  if (!data.fareId) {
    errors.fareId = 'Fare ID is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate payment data
 * @param {Object} data - Payment data
 * @returns {Object} Validation result
 */
const validatePayment = (data) => {
  const errors = {};

  if (!data.ticketId) {
    errors.ticketId = 'Ticket ID is required';
  }

  if (!data.amount || data.amount <= 0) {
    errors.amount = 'Valid amount is required';
  }

  if (!data.paymentGatewayId) {
    errors.paymentGatewayId = 'Payment gateway ID is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate schedule data
 * @param {Object} data - Schedule data
 * @returns {Object} Validation result
 */
const validateSchedule = (data) => {
  const errors = {};

  if (!data.routeId) {
    errors.routeId = 'Route ID is required';
  }

  if (!data.departureTime) {
    errors.departureTime = 'Departure time is required';
  }

  if (!data.arrivalTime) {
    errors.arrivalTime = 'Arrival time is required';
  }

  if (new Date(data.arrivalTime) <= new Date(data.departureTime)) {
    errors.arrivalTime = 'Arrival time must be after departure time';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate promotion data
 * @param {Object} data - Promotion data
 * @returns {Object} Validation result
 */
const validatePromotion = (data) => {
  const errors = {};

  if (!data.code) {
    errors.code = 'Promotion code is required';
  }

  if (!data.discount || data.discount <= 0 || data.discount > 100) {
    errors.discount = 'Valid discount percentage is required';
  }

  if (!data.startDate) {
    errors.startDate = 'Start date is required';
  }

  if (!data.endDate) {
    errors.endDate = 'End date is required';
  }

  if (new Date(data.endDate) <= new Date(data.startDate)) {
    errors.endDate = 'End date must be after start date';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  validateRegistration,
  validateTicket,
  validatePayment,
  validateSchedule,
  validatePromotion
}; 