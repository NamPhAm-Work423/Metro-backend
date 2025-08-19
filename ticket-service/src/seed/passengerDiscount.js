const { PassengerDiscount } = require('../models/index.model');
const { logger } = require('../config/logger');

const seedPassengerDiscounts = async () => {
    try {
        // Default passenger discount configurations
        const defaultDiscounts = [
            {
                passengerType: 'child',
                discountType: 'free',
                discountValue: 100,
                description: 'Children travel free'
            },
            {
                passengerType: 'senior',
                discountType: 'percentage',
                discountValue: 0,
                description: 'Seniors get 0% discount'
            },
            {
                passengerType: 'student',
                discountType: 'percentage',
                discountValue: 50,
                description: 'Students get 50% discount'
            },
            {
                passengerType: 'adult',
                discountType: 'percentage',
                discountValue: 0,
                description: 'Adults get 0% discount'
            },
            {
                passengerType: 'elder',
                discountType: 'free',
                discountValue: 100,
                description: 'Elders travel free'
            },
            {
                passengerType: 'teenager',
                discountType: 'percentage',
                discountValue: 15,
                description: 'Teenagers get 15% discount'
            }
        ];

        // Create default discounts if they don't exist
        for (const defaultDiscount of defaultDiscounts) {
            const existing = await PassengerDiscount.findOne({
                where: { passengerType: defaultDiscount.passengerType }
            });
            
            if (!existing) {
                await PassengerDiscount.create(defaultDiscount);
                logger.info('Created default passenger discount', {
                    passengerType: defaultDiscount.passengerType,
                    discountType: defaultDiscount.discountType,
                    discountValue: defaultDiscount.discountValue
                });
            } else {
                logger.info('Passenger discount already exists', {
                    passengerType: defaultDiscount.passengerType
                });
            }
        }
        
        logger.info('Seeded default passenger discounts');
    } catch (error) {
        logger.error('Error seeding passenger discounts:', error);
        throw error;
    }
};

module.exports = seedPassengerDiscounts;
