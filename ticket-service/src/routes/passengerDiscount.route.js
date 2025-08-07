const express = require('express');
const router = express.Router();
const passengerDiscountController = require('../controllers/passengerDiscount.controller');

// GET /v1/ticket/passengerDiscounts
router.get('/getAllPassengerDiscounts', passengerDiscountController.getAllPassengerDiscounts);

// GET /v1/ticket/passengerDiscounts/:passengerType
router.get('/getPassengerDiscountByType/:passengerType', passengerDiscountController.getPassengerDiscountByType);

// POST /v1/ticket/passengerDiscounts
router.post('/createPassengerDiscount', passengerDiscountController.createPassengerDiscount);

// PUT /v1/ticket/passengerDiscounts/:discountId
router.put('/updatePassengerDiscount/:discountId', passengerDiscountController.updatePassengerDiscount);

// DELETE /v1/ticket/passengerDiscounts/:discountId
router.delete('/deletePassengerDiscount/:discountId', passengerDiscountController.deletePassengerDiscount);

// GET /v1/ticket/passengerDiscounts/calculate/:passengerType
router.get('/calculateDiscount/:passengerType', passengerDiscountController.calculateDiscount);

module.exports = router;
