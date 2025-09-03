const { PassengerDiscountService } = require('../services/passengerDiscount');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

class PassengerDiscountController {
    // GET /v1/ticket/passengerDiscounts
    getAllPassengerDiscounts = asyncErrorHandler(async (req, res, next) => {
        try {
            const discounts = await PassengerDiscountService.getAllPassengerDiscounts();
            return res.status(200).json({
                success: true,
                message: 'Passenger discounts retrieved successfully',
                data: discounts,
                count: discounts.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ALL_PASSENGER_DISCOUNTS'
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
            return res.status(200).json({
                success: true,
                message: 'Passenger discount retrieved successfully',
                data: discount
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_PASSENGER_DISCOUNT_BY_TYPE'
            });
        }
    });

    // POST /v1/ticket/passengerDiscounts
    createPassengerDiscount = asyncErrorHandler(async (req, res, next) => {
        try {
            const discountData = req.body;
            const discount = await PassengerDiscountService.createPassengerDiscount(discountData);
            return res.status(201).json({
                success: true,
                message: 'Passenger discount created successfully',
                data: discount
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CREATE_PASSENGER_DISCOUNT'
            });
        }
    });

    // PUT /v1/ticket/passengerDiscounts/:discountId
    updatePassengerDiscount = asyncErrorHandler(async (req, res, next) => {
        try {
            const { discountId } = req.params;
            const updateData = req.body;
            const updatedDiscount = await PassengerDiscountService.updatePassengerDiscount(discountId, updateData);
            return res.status(200).json({
                success: true,
                message: 'Passenger discount updated successfully',
                data: updatedDiscount
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_PASSENGER_DISCOUNT'
            });
        }

    });

    // DELETE /v1/ticket/passengerDiscounts/:discountId
    deletePassengerDiscount = asyncErrorHandler(async (req, res, next) => {
        try {
            const { discountId } = req.params;
            await PassengerDiscountService.deletePassengerDiscount(discountId);
            return res.status(200).json({
                discountId,
                success: true,
                message: 'Passenger discount deleted successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_DELETE_PASSENGER_DISCOUNT'
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
            return res.status(200).json({
                success: true,
                message: 'Discount calculation completed',
                data: result
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CALCULATE_DISCOUNT'
            });
        }
    });
}

module.exports = new PassengerDiscountController();
