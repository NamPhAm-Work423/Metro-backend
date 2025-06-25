const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { authorizeRoles } = require('../middlewares/authorization');

/**
 * @swagger
 * /staff/getAllStaff:
 *   get:
 *     summary: Get all staff (admin only)
 *     description: Retrieve all active staff profiles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff retrieved successfully
 */
router.get('/getAllStaff', ...authorizeRoles('admin'), staffController.getAllStaff);

/**
 * @swagger
 * /staff/getStaffById/{id}:
 *   get:
 *     summary: Get staff by ID (admin/staff only)
 *     description: Retrieve a specific staff profile by ID
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
 *         description: Staff retrieved successfully
 *       404:
 *         description: Staff not found
 */
router.get('/getStaffById/:id', ...authorizeRoles('staff','admin'), staffController.getStaffById);

/**
 * @swagger
 * /staff/createStaff:
 *   post:
 *     summary: Create a new staff profile (admin only)
 *     description: Creates a new staff profile
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
 *     responses:
 *       201:
 *         description: Staff created successfully
 *       409:
 *         description: Staff already exists
 */
router.post('/createStaff', ...authorizeRoles('admin'), staffController.createStaff);

/**
 * @swagger
 * /staff/updateStaff/{id}:
 *   put:
 *     summary: Update staff by ID (admin only)
 *     description: Update a specific staff profile by ID
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
 *         description: Staff updated successfully
 *       404:
 *         description: Staff not found
 */
router.put('/updateStaff/:id', ...authorizeRoles('admin'), staffController.updateStaff);

/**
 * @swagger
 * /staff/updateStaffStatus/{id}:
 *   patch:
 *     summary: Update staff status (admin only)
 *     description: Update staff active/inactive status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Staff status updated successfully
 *       404:
 *         description: Staff not found
 */
router.patch('/updateStaffStatus/:id', ...authorizeRoles('admin'), staffController.updateStaffStatus);

/**
 * @swagger
 * /staff/deleteStaff/{id}:
 *   delete:
 *     summary: Delete staff by ID (admin only)
 *     description: Deactivate a specific staff profile by ID
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
 *         description: Staff deleted successfully
 *       404:
 *         description: Staff not found
 */
router.delete('/deleteStaff/:id', ...authorizeRoles('admin'), staffController.deleteStaff);

// Staff self-service routes
/**
 * @swagger
 * /staff/me:
 *   get:
 *     summary: Get current staff profile
 *     description: Retrieve the authenticated staff's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff profile retrieved successfully
 *       404:
 *         description: Staff profile not found
 */
router.get('/me', ...authorizeRoles('staff'), staffController.getMe);

/**
 * @swagger
 * /staff/me:
 *   put:
 *     summary: Update current staff profile
 *     description: Update the authenticated staff's profile
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
 *               phoneNumber:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *     responses:
 *       200:
 *         description: Staff profile updated successfully
 *       404:
 *         description: Staff profile not found
 */
router.put('/me', ...authorizeRoles('staff'), staffController.updateMe);

/**
 * @swagger
 * /staff/me:
 *   delete:
 *     summary: Deactivate current staff profile
 *     description: Deactivate the authenticated staff's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff profile deactivated successfully
 *       404:
 *         description: Staff profile not found
 */
router.delete('/me', ...authorizeRoles('staff'), staffController.deleteMe);

module.exports = router; 