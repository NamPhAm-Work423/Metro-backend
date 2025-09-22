/**
 * @swagger
 * /v1/route/user/admin/getAllAdmins:
 *   get:
 *     summary: Get all admins
 *     tags: [Admin Management]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all admins
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Admin'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/route/user/admin/getAdminById/{id}:
 *   get:
 *     summary: Get admin by ID
 *     tags: [Admin Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin ID
 *     responses:
 *       200:
 *         description: Admin details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Admin'
 *       404:
 *         description: Admin not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/route/user/admin/updateAdmin/{id}:
 *   put:
 *     summary: Update admin
 *     tags: [Admin Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Admin ID
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
 *     responses:
 *       200:
 *         description: Admin updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Admin'
 */

/**
 * @swagger
 * /v1/route/user/admin/me:
 *   get:
 *     summary: Get current admin profile
 *     tags: [Admin Management]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current admin profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Admin'
 */

/**
 * @swagger
 * /v1/route/user/passenger/getAllPassengers:
 *   get:
 *     summary: Get all passengers (Staff/Admin only)
 *     tags: [Passenger Management]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all passengers
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Passenger'
 *       403:
 *         description: Forbidden - Staff/Admin access required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/route/user/passenger/getPassengerById/{id}:
 *   get:
 *     summary: Get passenger by ID (Staff/Admin only)
 *     tags: [Passenger Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the passenger
 *     responses:
 *       200:
 *         description: Passenger details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Passenger'
 *       403:
 *         description: Forbidden - Staff/Admin access required
 *       404:
 *         description: Passenger not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/route/user/passenger/createPassenger:
 *   post:
 *     summary: Create a new passenger (Staff/Admin only)
 *     tags: [Passenger Management]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phoneNumber
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: First name of the passenger
 *               lastName:
 *                 type: string
 *                 description: Last name of the passenger
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the passenger
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number of the passenger
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Date of birth
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: Gender of the passenger
 *               address:
 *                 type: string
 *                 description: Address of the passenger
 *     responses:
 *       201:
 *         description: Passenger created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Passenger'
 *       400:
 *         description: Bad request - Invalid input data
 *       403:
 *         description: Forbidden - Staff/Admin access required
 *       409:
 *         description: Conflict - Email already exists
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/route/user/passenger/updatePassenger/{id}:
 *   put:
 *     summary: Update passenger (Staff/Admin only)
 *     tags: [Passenger Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the passenger to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: First name of the passenger
 *               lastName:
 *                 type: string
 *                 description: Last name of the passenger
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number of the passenger
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Date of birth
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: Gender of the passenger
 *               address:
 *                 type: string
 *                 description: Address of the passenger
 *     responses:
 *       200:
 *         description: Passenger updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Passenger'
 *       400:
 *         description: Bad request - Invalid input data
 *       403:
 *         description: Forbidden - Staff/Admin access required
 *       404:
 *         description: Passenger not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/route/user/passenger/deletePassenger/{id}:
 *   delete:
 *     summary: Delete passenger (Staff/Admin only)
 *     tags: [Passenger Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the passenger to delete
 *     responses:
 *       200:
 *         description: Passenger deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Passenger deleted successfully"
 *       403:
 *         description: Forbidden - Staff/Admin access required
 *       404:
 *         description: Passenger not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/route/user/passenger/me:
 *   get:
 *     summary: Get current passenger profile (Passenger/Staff/Admin)
 *     tags: [Passenger Management]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current passenger profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Passenger'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * 
 *   put:
 *     summary: Update current passenger profile (Passenger/Staff/Admin)
 *     tags: [Passenger Management]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: First name of the passenger
 *               lastName:
 *                 type: string
 *                 description: Last name of the passenger
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number of the passenger
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Date of birth
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: Gender of the passenger
 *               address:
 *                 type: string
 *                 description: Address of the passenger
 *     responses:
 *       200:
 *         description: Passenger profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Passenger'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * 
 *   delete:
 *     summary: Delete current passenger profile (Passenger/Staff/Admin)
 *     tags: [Passenger Management]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Passenger profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Passenger profile deleted successfully"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/route/user/passenger/sync-passenger:
 *   post:
 *     summary: Sync passenger data (Passenger/Staff/Admin)
 *     tags: [Passenger Management]
 *     security:
 *       - cookieAuth: []
 *     description: Legacy endpoint for syncing passenger data with cache
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               passengerData:
 *                 type: object
 *                 description: Passenger data to sync
 *     responses:
 *       200:
 *         description: Passenger data synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Passenger data synced successfully"
 *       400:
 *         description: Bad request - Invalid passenger data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/route/user/staff/getAllStaff:
 *   get:
 *     summary: Get all staff
 *     tags: [Staff Management]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all staff
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Staff'
 */

/**
 * @swagger
 * /v1/route/user/staff/getStaffById/{id}:
 *   get:
 *     summary: Get staff by ID
 *     tags: [Staff Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Staff'
 */

/**
 * @swagger
 * /v1/route/user/staff/updateStaff/{id}:
 *   put:
 *     summary: Update staff
 *     tags: [Staff Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Staff ID
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
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               address:
 *                 type: string
 *               position:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       200:
 *         description: Staff updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Staff'
 */

/**
 * @swagger
 * /v1/route/user/staff/changeStatus/{id}:
 *   patch:
 *     summary: Change staff status
 *     tags: [Staff Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Staff ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, on_leave]
 *                 description: New staff status
 *     responses:
 *       200:
 *         description: Staff status changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Staff'
 */

/**
 * @swagger
 * /v1/route/user/staff/me:
 *   get:
 *     summary: Get current staff profile
 *     tags: [Staff Management]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current staff profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Staff'
 */ 

/**
 * @swagger
 * /v1/route/user/staff/me:
 *   put:
 *     summary: Update current staff profile
 *     tags: [Staff Management]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               position:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       200:
 *         description: Staff profile updated successfully
 *
 *   delete:
 *     summary: Delete current staff profile
 *     tags: [Staff Management]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Staff profile deleted successfully
 */

/**
 * @swagger
 * /v1/route/user/staff/updateStaffStatus/{id}:
 *   put:
 *     summary: Update staff status (admin)
 *     tags: [Staff Management]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, on_leave]
 *     responses:
 *       200:
 *         description: Staff status updated
 */ 