const { PassengerDiscountService } = require('../services/passengerDiscount');
const { logger } = require('../config/logger');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

class PassengerDiscountController {
    // GET /v1/ticket/passengerDiscounts
    getAllPassengerDiscounts = asyncErrorHandler(async (req, res, next) => {
        try {
            const discounts = await PassengerDiscountService.getAllPassengerDiscounts();
            res.json({
                success: true,
                message: 'Passenger discounts retrieved successfully',
                data: discounts,
                count: discounts.length
            });
        } catch (error) {
            logger.error('Error retrieving passenger discounts', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve passenger discounts',
                error: error.message
            });
        }
    });

    // GET /v1/ticket/passengerDiscounts/:passengerType
    getPassengerDiscountByType = asyncErrorHandler(async (req, res, next) => {
        try {
            const { passengerType } = req.params;
            const discount = await PassengerDiscountService.getPassengerDiscountByType(passengerType);
            if (!discount) {
                return res.status(404).json({
                    success: false,
                    message: `No discount found for passenger type: ${passengerType}`
                });
            }
            res.json({
                success: true,
                message: 'Passenger discount retrieved successfully',
                data: discount
            });
        } catch (error) {
            logger.error('Error retrieving passenger discount', { error: error.message, passengerType: req.params.passengerType });
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve passenger discount',
                error: error.message
            });
        }
    });

    // POST /v1/ticket/passengerDiscounts
    createPassengerDiscount = asyncErrorHandler(async (req, res, next) => {
        try {
            const discountData = req.body;
            const discount = await PassengerDiscountService.createPassengerDiscount(discountData);
            logger.info('Passenger discount created', {
                discountId: discount.discountId,
                passengerType: discount.passengerType,
                discountType: discount.discountType,
                discountValue: discount.discountValue
            });
            res.status(201).json({
                success: true,
                message: 'Passenger discount created successfully',
                data: discount
            });
        } catch (error) {
            logger.error('Error creating passenger discount', { error: error.message, discountData: req.body });
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create passenger discount',
                error: error.message
            });
        }
    });

    // PUT /v1/ticket/passengerDiscounts/:discountId
    updatePassengerDiscount = asyncErrorHandler(async (req, res, next) => {
        try {
            const { discountId } = req.params;
            const updateData = req.body;
            const updatedDiscount = await PassengerDiscountService.updatePassengerDiscount(discountId, updateData);
            logger.info('Passenger discount updated', {
                discountId: updatedDiscount.discountId,
                passengerType: updatedDiscount.passengerType,
                discountValue: updatedDiscount.discountValue
            });
            res.json({
                success: true,
                message: 'Passenger discount updated successfully',
                data: updatedDiscount
            });
        } catch (error) {
            logger.error('Error updating passenger discount', { error: error.message, discountId: req.params.discountId });
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update passenger discount',
                error: error.message
            });
        }
    });

    // DELETE /v1/ticket/passengerDiscounts/:discountId
    deletePassengerDiscount = asyncErrorHandler(async (req, res, next) => {
        try {
            const { discountId } = req.params;
            await PassengerDiscountService.deletePassengerDiscount(discountId);
            logger.info('Passenger discount deleted', {
                discountId
            });
            res.json({
                success: true,
                message: 'Passenger discount deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting passenger discount', { error: error.message, discountId: req.params.discountId });
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete passenger discount',
                error: error.message
            });
        }
    });

    // GET /v1/ticket/passengerDiscounts/calculate/:passengerType
    calculateDiscount = asyncErrorHandler(async (req, res, next) => {
        try {
            const { passengerType } = req.params;
            const { originalPrice } = req.query;
            if (!originalPrice) {
                return res.status(400).json({
                    success: false,
                    message: 'Original price is required'
                });
            }
            const result = await PassengerDiscountService.calculateDiscount(passengerType, originalPrice);
            res.json({
                success: true,
                message: 'Discount calculation completed',
                data: result
            });
        } catch (error) {
            logger.error('Error calculating passenger discount', { error: error.message, passengerType: req.params.passengerType });
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to calculate passenger discount',
                error: error.message
            });
        }
    });
}

module.exports = new PassengerDiscountController();
