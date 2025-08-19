const { PassengerDiscount } = require('../models/index.model');
const { logger } = require('../config/logger');

/**
 * Helper for passenger type validation and standardization
 */
class PassengerTypeHelper {
    /**
     * Valid passenger types in the system
     */
    static get VALID_TYPES() {
        return [
            'adult',
            'child', 
            'teenager',
            'student',
            'senior',
            'elder'
        ];
    }

    /**
     * Validate if passenger type is valid
     * @param {string} passengerType - Passenger type to validate
     * @returns {boolean} True if valid
     */
    static isValidType(passengerType) {
        if (!passengerType || typeof passengerType !== 'string') {
            return false;
        }
        
        return this.VALID_TYPES.includes(passengerType.toLowerCase());
    }

    /**
     * Normalize passenger type to lowercase
     * @param {string} passengerType - Passenger type to normalize
     * @returns {string} Normalized passenger type
     * @throws {Error} If type is invalid
     */
    static normalize(passengerType) {
        if (!this.isValidType(passengerType)) {
            throw new Error(`Invalid passenger type: ${passengerType}. Valid types are: ${this.VALID_TYPES.join(', ')}`);
        }
        
        return passengerType.toLowerCase();
    }

    /**
     * Determine passenger type based on age
     * @param {number} age - Age in years
     * @returns {string} Determined passenger type
     */
    static determineTypeByAge(age) {
        if (age < 0 || age > 120) {
            throw new Error('Invalid age provided');
        }

        if (age < 12) {
            return 'child';
        } else if (age < 18) {
            return 'teenager';
        } else if (age >= 60) {
            return 'elder';
        } else {
            return 'adult';
        }
    }

    /**
     * Get all available passenger types from database
     * @returns {Promise<Array>} List of passenger types with their discounts
     */
    static async getAvailableTypes() {
        try {
            const discounts = await PassengerDiscount.findAll({
                where: { isActive: true },
                attributes: ['passengerType', 'discountType', 'discountValue', 'description']
            });

            return discounts.map(discount => ({
                type: discount.passengerType,
                discountType: discount.discountType,
                discountValue: parseFloat(discount.discountValue),
                description: discount.description
            }));
        } catch (error) {
            logger.error('Error fetching available passenger types', { error: error.message });
            throw error;
        }
    }

    /**
     * Validate passenger counts object
     * @param {Object} passengerCounts - Object with passenger counts
     * @returns {boolean} True if valid
     */
    static validatePassengerCounts(passengerCounts) {
        if (!passengerCounts || typeof passengerCounts !== 'object') {
            return false;
        }

        const validCountFields = [
            'numAdults', 'numChildren', 'numChild', 'numTeenagers', 'numTeenager', 
            'numStudents', 'numStudent', 'numSeniors', 'numSenior', 'numElders', 'numElder'
        ];

        // Check if at least one valid count field exists and is positive
        const hasValidCounts = validCountFields.some(field => {
            const count = passengerCounts[field];
            return typeof count === 'number' && count > 0;
        });

        return hasValidCounts;
    }
}

module.exports = PassengerTypeHelper;
