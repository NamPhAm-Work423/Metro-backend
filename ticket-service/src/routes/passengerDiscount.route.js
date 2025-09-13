const express = require('express');
const router = express.Router();
const passengerDiscountController = require('../controllers/passengerDiscount.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// GET /v1/ticket/passengerDiscounts
router.get('/getAllPassengerDiscounts', ...authorizeRoles('staff', 'admin'), passengerDiscountController.getAllPassengerDiscounts);

// GET /v1/ticket/passengerDiscounts/:passengerType
router.get('/getPassengerDiscountByType/:passengerType', ...authorizeRoles('staff', 'admin'), passengerDiscountController.getPassengerDiscountByType);

// POST /v1/ticket/passengerDiscounts
router.post('/createPassengerDiscount', ...authorizeRoles('staff', 'admin'), passengerDiscountController.createPassengerDiscount);

// PUT /v1/ticket/passengerDiscounts/:discountId
router.put('/updatePassengerDiscount/:discountId', ...authorizeRoles('staff', 'admin'), passengerDiscountController.updatePassengerDiscount);

// DELETE /v1/ticket/passengerDiscounts/:discountId
router.delete('/deletePassengerDiscount/:discountId', ...authorizeRoles('staff', 'admin'), passengerDiscountController.deletePassengerDiscount);

// GET /v1/ticket/passengerDiscounts/calculate/:passengerType
router.get('/calculateDiscount/:passengerType', ...authorizeRoles('staff', 'admin'), passengerDiscountController.calculateDiscount);

module.exports = router;
