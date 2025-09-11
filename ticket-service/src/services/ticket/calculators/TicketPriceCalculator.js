const FareService = require('../../fare.service');
const { logger } = require('../../../config/logger');
const { PassengerDiscount, Promotion } = require('../../../models/index.model');
const MultiRouteFareCalculator = require('../../fare/calculators/MultiRouteFareCalculator');
const FareServiceFactory = require('../../fare/FareServiceFactory');

/**
 * Calculator service for estimating ticket prices before creation
 * Used by frontend to display prices before ticket purchase
 */
class TicketPriceCalculator {
    constructor() {
        // Get dependencies from FareServiceFactory
        const fareService = FareServiceFactory.createFareService();
        this.stationService = fareService.stationService;
        this.fareRepository = fareService.fareRepository;
        this.multiRouteCalculator = new MultiRouteFareCalculator(null, this.stationService, this.fareRepository);
    }

    /**
     * Apply promotion to calculated price
     * @param {number} baseFare - Base fare amount
     * @param {Object} promotionData - Promotion data
     * @param {string} passengerType - Passenger type
     * @param {string} tripType - Trip type
     * @returns {Object} Promotion application result
     */
    async applyPromotionToPrice(baseFare, promotionData, passengerType, tripType) {
        try {            
            let finalPrice = baseFare;
            let discountAmount = 0;
            let promotion = null;

            if (promotionData.promotionCode) {
                // Find promotion by code from database
                const promo = await Promotion.findOne({ 
                    where: { promotionCode: promotionData.promotionCode }
                });
                
                if (promo && promo.isCurrentlyValid()) {
                    // Validate promotion applicability
                    const isValidForTicketType = !promo.applicableTicketTypes || 
                        promo.applicableTicketTypes.length === 0 ||
                        promo.applicableTicketTypes.includes(tripType.toLowerCase());
                    
                    const isValidForPassengerType = !promo.applicablePassengerTypes || 
                        promo.applicablePassengerTypes.length === 0 ||
                        promo.applicablePassengerTypes.includes(passengerType.toLowerCase());
                    
                    if (isValidForTicketType && isValidForPassengerType) {
                        discountAmount = promo.calculateDiscount(baseFare);
                        finalPrice = Math.max(0, baseFare - discountAmount);
                        
                        promotion = {
                            promotionId: promo.promotionId,
                            promotionCode: promo.promotionCode,
                            name: promo.name,
                            type: promo.type,
                            value: promo.value,
                            discountAmount
                        };
                    } else {
                        logger.warn('Promotion not applicable', {
                            promotionCode: promotionData.promotionCode,
                            ticketType: tripType,
                            passengerType: passengerType
                        });
                    }
                } else {
                    logger.warn('Invalid or expired promotion', {
                        promotionCode: promotionData.promotionCode
                    });
                }
            }

            return {
                finalPrice,
                discountAmount,
                promotion
            };

        } catch (error) {
            logger.error('Error applying promotion to price', {
                error: error.message,
                promotionData
            });
            throw error;
        }
    }

    /**
     * Calculate total price for multiple passengers with journey planning
     * @param {string} entryStationId - Entry station ID
     * @param {string} exitStationId - Exit station ID
     * @param {string} tripType - Trip type
     * @param {Object} passengerCounts - Passenger counts
     * @param {number} passengerCounts.numAdults - Number of adults
     * @param {number} passengerCounts.numElder - Number of elders
     * @param {number} passengerCounts.numTeenager - Number of teenagers
     * @param {number} passengerCounts.numChild - Number of children
     * @param {Object} promotionData - Optional promotion data
     * @returns {Object} Total price calculation result
     */
    async calculateTotalPriceForPassengers(entryStationId, exitStationId, tripType, passengerCounts, promotionData = null) {
        try {
            // Validate stations: entry and exit must be different
            if (entryStationId && exitStationId && String(entryStationId) === String(exitStationId)) {
                logger.warn('Duplicate station detected for entry and exit', {
                    entryStationId,
                    exitStationId,
                    tripType
                });
                const error = new Error('Entry and exit stations must be different');
                error.code = 'DUPLICATE_STATION';
                throw error;
            }

            logger.info('Calculating total price for passengers', {
                entryStationId,
                exitStationId,
                tripType,
                passengerCounts,
                promotionData
            });

            // Step 1: Use MultiRouteFareCalculator to get journey details and base pricing
            const journeyFareResult = await this.multiRouteCalculator.calculateJourneyFareForMultiplePassengers(
                entryStationId,
                exitStationId,
                passengerCounts,
                tripType
            );

            let totalPrice = journeyFareResult.totalPrice;
            let totalDiscountAmount = 0;
            let appliedPromotion = null;

            // Step 2: Apply promotion if available
            if (promotionData && (promotionData.promotionCode || promotionData.promotionId)) {
                const promotionResult = await this.applyPromotionToPrice(
                    totalPrice,
                    promotionData,
                    'adult', // Use adult as base for promotion calculation
                    tripType
                );

                totalPrice = promotionResult.finalPrice;
                totalDiscountAmount = promotionResult.discountAmount;
                appliedPromotion = promotionResult.promotion;
            }

            // Step 3: Prepare detailed response with all journey and pricing information
            return {
                success: true,
                message: 'Price calculation completed successfully',
                data: {
                    totalPrice,
                    totalOriginalPrice: journeyFareResult.totalPrice,
                    totalDiscountAmount,
                    appliedPromotion,
                    currency: journeyFareResult.currency,
                    totalPassengers: journeyFareResult.totalPassengers,
                    
                    // Journey details
                    journeyDetails: {
                        isDirectJourney: journeyFareResult.journeyDetails.isDirectJourney,
                        totalRoutes: journeyFareResult.journeyDetails.totalRoutes,
                        totalStations: journeyFareResult.journeyDetails.totalStations,
                        routeSegments: journeyFareResult.journeyDetails.routeSegments,
                        connectionPoints: journeyFareResult.journeyDetails.connectionPoints
                    },
                    
                    // Pricing breakdown
                    passengerBreakdown: journeyFareResult.passengerBreakdown,
                    segmentFares: journeyFareResult.segmentFares,
                    fareAnalysis: journeyFareResult.fareAnalysis,
                    
                    // Additional details
                    tripType,
                    entryStationId,
                    exitStationId,
                    calculationTimestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            logger.error('Error calculating total price for passengers', {
                error: error.message,
                entryStationId,
                exitStationId,
                tripType,
                passengerCounts,
                promotionData
            });
            throw error;
        }
    }
}

module.exports = new TicketPriceCalculator();
