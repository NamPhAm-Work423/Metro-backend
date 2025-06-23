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
router.post('/', authorizeRoles('user', 'passenger'), passengerController.createPassenger);
router.get('/me', authorizeRoles('user', 'passenger'), passengerController.getMe);
router.put('/me', authorizeRoles('user', 'passenger'), passengerController.updateMe);
router.delete('/me', authorizeRoles('user', 'passenger'), passengerController.deleteMe);

module.exports = router; 