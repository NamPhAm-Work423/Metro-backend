/**
 * PayPal Services Index
 * Centralized exports for PayPal webhook services
 * Following modular architecture for easy extension
 */

const PayPalSignatureService = require('./paypal.signature.service');

module.exports = {
    PayPalSignatureService
    // Future PayPal services can be added here:
    // PayPalEventMapper,
    // PayPalValidationService,
    // PayPalRetryService, etc.
};
