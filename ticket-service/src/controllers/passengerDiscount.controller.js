const { PassengerDiscountService } = require('../services/passengerDiscount');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { addCustomSpan } = require('../tracing');

class PassengerDiscountController {
    // GET /v1/ticket/passengerDiscounts
    getAllPassengerDiscounts = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('passengerDiscount.get-all', async (span) => {
            span.setAttributes({ 
                'operation.type': 'read', 
                'operation.entity': 'passenger_discount', 
                'operation.scope': 'all',
                'type': 'all' 
            });
            try {
                const discounts = await addCustomSpan('passengerDiscount.service.get-all', async () => PassengerDiscountService.getAllPassengerDiscounts());
                span.setAttributes({ 
                    'operation.success': true, 
                    'items.count': discounts.length, 
                    'http.status_code': 200 
                });
                return res.status(200).json({
                    success: true,
                    message: 'Passenger discounts retrieved successfully',
                    data: discounts,
                    count: discounts.length
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500 
                });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_GET_ALL_PASSENGER_DISCOUNTS'
                });
            }
        });
    });

    // GET /v1/ticket/passengerDiscounts/:passengerType
    getPassengerDiscountByType = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('passengerDiscount.get-by-type', async (span) => {
            const { passengerType } = req.params;
            span.setAttributes({ 
                'operation.type': 'read', 
                'operation.entity': 'passenger_discount', 
                'passenger.type': passengerType,
                'type': passengerType 
            });
            try {
                const discount = await addCustomSpan('passengerDiscount.service.get-by-type', async () => PassengerDiscountService.getPassengerDiscountByType(passengerType));
                if (!discount) {
                    span.setAttributes({ 
                        'operation.success': false, 
                        'http.status_code': 404,
                        type: passengerType 
                    });
                    return res.status(404).json({ 
                        success: false, 
                        message: `No discount found for passenger type: ${passengerType}`,
                        type: passengerType
                    });
                }
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200,
                    type: passengerType 
                });
                return res.status(200).json({ 
                    success: true, 
                    message: 'Passenger discount retrieved successfully', 
                    data: discount, 
                    type: passengerType 
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500,
                    type: passengerType 
                });
                return res.status(500).json({ 
                    success: false, 
                    message: error.message, 
                    error: 'INTERNAL_ERROR_GET_PASSENGER_DISCOUNT_BY_TYPE', 
                    type: passengerType 
                });
            }
        });
    });

    // POST /v1/ticket/passengerDiscounts
    createPassengerDiscount = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('passengerDiscount.create', async (span) => {
            const discountData = req.body;
            span.setAttributes({ 
                'operation.type': 'create', 
                'operation.entity': 'passenger_discount',
                'type': discountData.passengerType 
            });
            try {
                const discount = await addCustomSpan('passengerDiscount.service.create', async () => PassengerDiscountService.createPassengerDiscount(discountData));
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 201,
                    type: discountData.passengerType 
                });
                return res.status(201).json({ 
                    success: true, 
                    message: 'Passenger discount created successfully', 
                    data: discount, 
                    type: discountData.passengerType 
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500,
                    type: discountData.passengerType 
                });
                return res.status(500).json({ 
                    success: false, 
                    message: error.message, 
                    error: 'INTERNAL_ERROR_CREATE_PASSENGER_DISCOUNT', 
                    type: discountData.passengerType 
                });
            }
        });
    });

    // PUT /v1/ticket/passengerDiscounts/:discountId
    updatePassengerDiscount = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('passengerDiscount.update', async (span) => {
            const { discountId } = req.params;
            const updateData = req.body;
            span.setAttributes({ 
                'operation.type': 'update', 
                'operation.entity': 'passenger_discount', 
                'discount.id': discountId,
                'type': updateData.passengerType 
            });
            try {
                const updatedDiscount = await addCustomSpan('passengerDiscount.service.update', async () => PassengerDiscountService.updatePassengerDiscount(discountId, updateData));
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200,
                    type: updateData.passengerType 
                });
                return res.status(200).json({ 
                    success: true, 
                    message: 'Passenger discount updated successfully', 
                    data: updatedDiscount, 
                    type: updateData.passengerType 
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500,
                    type: updateData.passengerType 
                });
                return res.status(500).json({ 
                    success: false, 
                    message: error.message, 
                    error: 'INTERNAL_ERROR_UPDATE_PASSENGER_DISCOUNT', 
                    type: updateData.passengerType 
                });
            }
        });
    });

    // DELETE /v1/ticket/passengerDiscounts/:discountId
    deletePassengerDiscount = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('passengerDiscount.delete', async (span) => {
            const { discountId } = req.params;
            span.setAttributes({ 
                'operation.type': 'delete', 
                'operation.entity': 'passenger_discount', 
                'discount.id': discountId
            });
            try {
                await addCustomSpan('passengerDiscount.service.delete', async () => PassengerDiscountService.deletePassengerDiscount(discountId));
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200
                });
                return res.status(200).json({ 
                    discountId, 
                    success: true, 
                    message: 'Passenger discount deleted successfully'
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500
                });
                return res.status(500).json({ 
                    success: false, 
                    message: error.message, 
                    error: 'INTERNAL_ERROR_DELETE_PASSENGER_DISCOUNT'
                });
            }
        });
    });

    // GET /v1/ticket/passengerDiscounts/calculate/:passengerType
    calculateDiscount = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('passengerDiscount.calculate', async (span) => {
            const { passengerType } = req.params;
            const { originalPrice } = req.query;
            span.setAttributes({ 
                'operation.type': 'calculate', 
                'operation.entity': 'passenger_discount', 
                'passenger.type': passengerType,
                'type': passengerType 
            });
            try {
                if (!originalPrice) {
                    span.setAttributes({ 
                        'operation.success': false, 
                        'http.status_code': 400,
                        type: passengerType 
                    });
                    return res.status(400).json({ success: false, message: 'Original price is required' });
                }
                const result = await addCustomSpan('passengerDiscount.service.calculate', async () => PassengerDiscountService.calculateDiscount(passengerType, originalPrice));
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200,
                    type: passengerType 
                });
                return res.status(200).json({ 
                    success: true, 
                    message: 'Discount calculation completed', 
                    data: result, 
                    type: passengerType 
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500,
                    type: passengerType 
                });
                return res.status(500).json({ 
                    success: false, 
                    message: error.message, 
                    error: 'INTERNAL_ERROR_CALCULATE_DISCOUNT', 
                    type: passengerType 
                });
            }
        });
    });
}

module.exports = new PassengerDiscountController();
