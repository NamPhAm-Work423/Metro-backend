const express = require('express');
const router = express.Router();
const passengerController = require('../controllers/passenger.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Passenger profile routes
/**
 * @swagger
 * /passengers:
 *   post:
 *     summary: Create a new passenger profile
 *     description: Creates a new passenger profile for the authenticated user
 */
router.post('/', authorizeRoles('passenger'), passengerController.createPassenger);
router.get('/me', authorizeRoles('passenger'), passengerController.getMe);
router.put('/me', authorizeRoles('passenger'), passengerController.updateMe);
router.delete('/me', authorizeRoles('passenger'), passengerController.deleteMe);

module.exports = router; 