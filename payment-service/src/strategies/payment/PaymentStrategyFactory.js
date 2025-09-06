const PayPalPaymentStrategy = require('./PayPalPaymentStrategy');
const DefaultPaymentStrategy = require('./DefaultPaymentStrategy');
const SepayPaymentStrategy = require('./SepayPaymentStrategy');
const { logger } = require('../../config/logger');

/**
 * Payment Strategy Factory
 * Creates appropriate payment strategy based on payment method
 * Follows Factory Pattern and Dependency Inversion Principle
 */
class PaymentStrategyFactory {
    constructor() {
        this.strategies = new Map();
        this.initializeStrategies();
    }

    /**
     * Initialize available payment strategies
     */
    initializeStrategies() {
        this.strategies.set('paypal', new PayPalPaymentStrategy());
        this.strategies.set('default', new DefaultPaymentStrategy());
        this.strategies.set('sepay', new SepayPaymentStrategy());
        
        logger.info('Payment strategies initialized', {
            availableStrategies: Array.from(this.strategies.keys())
        });
    }

    /**
     * Get payment strategy for given payment method
     * @param {string} paymentMethod - Payment method name
     * @returns {IPaymentStrategy} Payment strategy instance
     */
    getStrategy(paymentMethod) {
        const normalizedMethod = paymentMethod?.toLowerCase();
        
        if (!normalizedMethod) {
            logger.warn('No payment method specified, using default strategy');
            return this.strategies.get('default');
        }

        const strategy = this.strategies.get(normalizedMethod);
        
        if (!strategy) {
            logger.warn(`Unknown payment method: ${paymentMethod}, using default strategy`);
            return this.strategies.get('default');
        }

        logger.debug(`Selected payment strategy: ${normalizedMethod}`);
        return strategy;
    }

    /**
     * Register a new payment strategy
     * @param {string} methodName - Payment method name
     * @param {IPaymentStrategy} strategy - Strategy instance
     */
    registerStrategy(methodName, strategy) {
        if (!methodName || !strategy) {
            throw new Error('Method name and strategy are required');
        }

        if (typeof strategy.processPayment !== 'function') {
            throw new Error('Strategy must implement processPayment method');
        }

        this.strategies.set(methodName.toLowerCase(), strategy);
        logger.info(`Registered new payment strategy: ${methodName}`);
    }

    /**
     * Get all available payment methods
     * @returns {Array<string>} List of available payment methods
     */
    getAvailableMethods() {
        return Array.from(this.strategies.keys());
    }

    /**
     * Check if payment method is supported
     * @param {string} paymentMethod - Payment method to check
     * @returns {boolean} True if supported, false otherwise
     */
    isMethodSupported(paymentMethod) {
        return this.strategies.has(paymentMethod?.toLowerCase());
    }
}

// Export singleton instance
module.exports = new PaymentStrategyFactory();
