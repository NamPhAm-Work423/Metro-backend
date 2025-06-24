const express = require('express');
const router = express.Router();
const passengerController = require('../controllers/passenger.controller');
const { authorizeRoles } = require('../middlewares/authorization');

/**
 * @swagger
 * /passengers/getallPassengers:
 *   get:
 *     summary: Get all passengers (admin/staff only)
 *     description: Retrieve all active passenger profiles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Passengers retrieved successfully
 */
router.get('/getallPassengers', authorizeRoles('staff','admin'), passengerController.getAllPassengers);

/**
 * @swagger
 * /passengers/getPassengerById/{id}:
 *   get:
 *     summary: Get passenger by ID (admin/staff only)
 *     description: Retrieve a specific passenger profile by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Passenger retrieved successfully
 *       404:
 *         description: Passenger not found
 */
router.get('/getPassengerById/:id', authorizeRoles('staff','admin'), passengerController.getPassengerById);

/**
 * @swagger
 * /passengers/createPassenger:
 *   post:
 *     summary: Create a new passenger profile (admin/staff only)
 *     description: Creates a new passenger profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               username:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *               gender:
 *                 type: string
 *               address:
 *                 type: string
 *               emergencyContact:
 *                 type: string
 *     responses:
 *       201:
 *         description: Passenger created successfully
 *       409:
 *         description: Passenger already exists
 */
router.post('/createPassenger', authorizeRoles('staff','admin'), passengerController.createPassenger);

/**
 * @swagger
 * /passengers/updatePassenger/{id}:
 *   put:
 *     summary: Update passenger by ID (admin/staff only)
 *     description: Update a specific passenger profile by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Passenger updated successfully
 *       404:
 *         description: Passenger not found
 */
router.put('/updatePassenger/:id', authorizeRoles('staff','admin'), passengerController.updatePassenger);

/**
 * @swagger
 * /passengers/deletePassenger/{id}:
 *   delete:
 *     summary: Delete passenger by ID (admin/staff only)
 *     description: Deactivate a specific passenger profile by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Passenger deleted successfully
 *       404:
 *         description: Passenger not found
 */
router.delete('/deletePassenger/:id', authorizeRoles('staff','admin'), passengerController.deletePassenger);

// Passenger self-service routes
/**
 * @swagger
 * /passengers/me:
 *   get:
 *     summary: Get current passenger profile
 *     description: Retrieve the authenticated passenger's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Passenger profile retrieved successfully
 *       404:
 *         description: Passenger profile not found
 */
router.get('/me', authorizeRoles('passenger'), passengerController.getMe);

/**
 * @swagger
 * /passengers/me:
 *   put:
 *     summary: Update current passenger profile
 *     description: Update the authenticated passenger's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Passenger profile updated successfully
 *       404:
 *         description: Passenger profile not found
 */
router.put('/me', authorizeRoles('passenger'), passengerController.updateMe);

/**
 * @swagger
 * /passengers/me:
 *   delete:
 *     summary: Deactivate current passenger profile
 *     description: Deactivate the authenticated passenger's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Passenger profile deactivated successfully
 *       404:
 *         description: Passenger profile not found
 */
router.delete('/me', authorizeRoles('passenger'), passengerController.deleteMe);

module.exports = router; 