const express = require('express');
const router = express.Router();
const passengerController = require('../controllers/passenger.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Admin/Staff management routes
router.get('/getallPassengers', ...authorizeRoles('staff','admin'), passengerController.getAllPassengers);
router.get('/getPassengerById/:id', ...authorizeRoles('staff','admin'), passengerController.getPassengerById);
router.post('/createPassenger', ...authorizeRoles('staff','admin'), passengerController.createPassenger);
router.put('/updatePassenger/:id', ...authorizeRoles('staff','admin'), passengerController.updatePassenger);
router.delete('/deletePassenger/:id', ...authorizeRoles('staff','admin'), passengerController.deletePassenger);

// Passenger self-service routes
router.get('/me', ...authorizeRoles('passenger','staff','admin'), passengerController.getMe);
router.put('/me', ...authorizeRoles('passenger','staff','admin'), passengerController.updateMe);
router.delete('/me', ...authorizeRoles('passenger','staff','admin'), passengerController.deleteMe);

// Passenger post cache routes (legacy support)
router.post('/sync-passenger', ...authorizeRoles('passenger','staff','admin'), passengerController.syncPassenger);


module.exports = router; 