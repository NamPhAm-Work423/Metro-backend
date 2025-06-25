const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - phoneNumber
 *         - dateOfBirth
 *         - gender
 *         - address
 *         - username
 *         - email
 *         - password
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 2
 *           example: John
 *           description: User's first name (minimum 2 characters)
 *         lastName:
 *           type: string
 *           minLength: 2
 *           example: Doe
 *           description: User's last name (minimum 2 characters)
 *         phoneNumber:
 *           type: string
 *           example: "09090909090"
 *           description: User's phone number
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: "1990-01-01"
 *           description: Date of birth in YYYY-MM-DD format
 *         gender:
 *           type: string
 *           enum: [male, female]
 *           example: male
 *           description: User's gender
 *         address:
 *           type: string
 *           example: "123 Main St, Anytown, USA"
 *           description: User's physical address
 *         username:
 *           type: string
 *           minLength: 2
 *           example: johndoe
 *           description: Unique username (minimum 2 characters)
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *           description: Valid email address
 *         password:
 *           type: string
 *           minLength: 6
 *           example: password123
 *           description: Password (minimum 6 characters)
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *           description: Registered email address
 *         password:
 *           type: string
 *           example: password123
 *           description: User's password
 *     RefreshTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *           description: Valid refresh token from login response
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Registration successful
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             tokens:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT token for API access (expires in 1 hour)
 *                 refreshToken:
 *                   type: string
 *                   description: Token to refresh access token (expires in 7 days)
 *                 expiresIn:
 *                   type: string
 *                   example: 1h
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "0aca0654-1ea3-425b-9cd0-151e0996412a"
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         email:
 *           type: string
 *           example: john@example.com
 *         username:
 *           type: string
 *           example: johndoe
 *         isVerified:
 *           type: boolean
 *           example: true
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *           example: ["passenger"]
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     APIKeyResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         token:
 *           type: string
 *           example: api_1234567890abcdef
 *           description: Generated API key for accessing routing endpoints
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: 'JWT token obtained from login endpoint. Format: Bearer <token>'
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *       description: 'API key for routing endpoints. Get from /v1/auth/key/{userId}'
 *
 * tags:
 *   - name: Authentication
 *     description: |
 *       ## 🔐 Authentication System
 *       
 *       ### Simple 2-Step Process:
 *       
 *       1. **Register/Login** → Get JWT tokens only
 *       2. **Use JWT everywhere** → Works for all endpoints (auth + routing)
 *       
 *       ### How It Works:
 *       - API keys are automatically managed by the backend
 *       - Users only interact with JWT tokens
 *       - Zero API key management required
 *       
 *       ### Quick Start:
 *       ```bash
 *       # 1. Login
 *       curl -X POST /v1/auth/login \\
 *         -H "Content-Type: application/json" \\
 *         -d '{"email":"user@example.com","password":"password"}'
 *       
 *       # 2. Use JWT for everything
 *       curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
 *         /v1/route/passengers
 *       ```
 *       
 *       ### Swagger UI Authentication:
 *       1. Login to get `accessToken`
 *       2. Click **🔒 Authorize** → Enter: `Bearer YOUR_ACCESS_TOKEN`
 *       3. Use any endpoint with the same token
 *       
 *       ### Advanced Features:
 *       - Manual API key management endpoints available for integrations
 *       - Rate limiting per user
 *       - Automatic token refresh
 */

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: |
 *       Create a new user account with passenger role.
 *       
 *       - API key is automatically generated and stored internally
 *       - Email verification may be required
 *       - Use `/v1/auth/login` after registration to get JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             example1:
 *               summary: Sample registration
 *               value:
 *                 firstName: John
 *                 lastName: Doe
 *                 phoneNumber: "09090909090"
 *                 dateOfBirth: "1990-01-01"
 *                 gender: male
 *                 address: "123 Main St, Anytown, USA"
 *                 username: johndoe
 *                 email: john@example.com
 *                 password: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User registered successfully. Please verify your email to activate your account."
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - validation errors
 *       409:
 *         description: User already exists
 */
router.post('/register', userController.signup);

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: Login user
 *     description: |
 *       Authenticate user and get JWT tokens for API access.
 *       
 *       - API key is automatically refreshed internally
 *       - Use the returned JWT token for all subsequent requests
 *       - Token expires in 1 hour, use refresh token to renew
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             example1:
 *               summary: Sample login
 *               value:
 *                 email: john@example.com
 *                 password: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           description: JWT token for API authentication
 *                         refreshToken:
 *                           type: string
 *                           description: Token to refresh access token (expires in 7 days)
 *                         expiresIn:
 *                           type: string
 *                           example: 1h
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
router.post('/login', userController.login);

/**
 * @swagger
 * /v1/auth/logout:
 *   post:
 *     summary: 🚪 Logout user
 *     description: Logout the current user and clear authentication cookies.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ✅ Logout successful
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing token
 */
router.post('/logout', authMiddleware.authenticate, userController.logout);

/**
 * @swagger
 * /v1/auth/refresh:
 *   post:
 *     summary: 🔄 Refresh access token
 *     description: Get a new access token using refresh token when current token expires.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: ✅ Token refreshed successfully
 *       401:
 *         description: ❌ Invalid or expired refresh token
 */
router.post('/refresh', userController.refreshToken);

/**
 * @swagger
 * /v1/auth/forgot-password:
 *   post:
 *     summary: 🔒 Request password reset
 *     description: Send password reset email to user.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: ✅ Password reset email sent (if account exists)
 *       400:
 *         description: ❌ Email is required
 */
router.post('/forgot-password', userController.forgotPassword);

/**
 * @swagger
 * /v1/auth/reset-password:
 *   post:
 *     summary: 🔑 Reset password
 *     description: Reset password using token from reset email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token from email
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: New password
 *     responses:
 *       200:
 *         description: ✅ Password reset successful
 *       400:
 *         description: ❌ Invalid request or expired token
 */
router.post('/reset-password', userController.resetPassword);

/**
 * @swagger
 * /v1/auth/verify/{token}:
 *   get:
 *     summary: ✉️ Verify email address (URL path)
 *     description: Verify user email using token from verification email (legacy format).
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: ✅ Email verified successfully
 *       400:
 *         description: ❌ Invalid or expired token
 */
router.get('/verify/:token', userController.verifyEmail);

/**
 * @swagger
 * /v1/auth/verify-email:
 *   get:
 *     summary: ✉️ Verify email address (clickable link)
 *     description: Verify user email using token from verification email link.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: ✅ Email verified successfully
 *       400:
 *         description: ❌ Invalid or expired token
 */
router.get('/verify-email', userController.verifyEmailFromQuery);

/**
 * @swagger
 * /v1/auth/key/{userId}:
 *   get:
 *     summary: Generate additional API key (Advanced)
 *     description: |
 *       Generate an additional API key for accessing routing endpoints.
 *       
 *       **Note**: This is optional since API keys are auto-generated during login.
 *       Mainly used for:
 *       - Creating additional keys for the same user
 *       - System integrations
 *       - Advanced key management
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID from login response
 *         example: "0aca0654-1ea3-425b-9cd0-151e0996412a"
 *     responses:
 *       200:
 *         description: API key generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/APIKeyResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 */
router.get('/key/:id', authMiddleware.authenticate, authController.generateAPIToken);

/**
 * @swagger
 * /v1/auth/keys/{userId}:
 *   get:
 *     summary: 📋 Get all API keys for user
 *     description: Retrieve all active API keys for a specific user.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: ✅ API keys retrieved successfully
 *       401:
 *         description: ❌ Unauthorized
 */
router.get('/keys/:userId', authMiddleware.authenticate, authController.getAPIKeyByUser);

/**
 * @swagger
 * /v1/auth/key/{id}:
 *   delete:
 *     summary: 🗑️ Delete API key
 *     description: Delete a specific API key by ID.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID to delete
 *     responses:
 *       200:
 *         description: ✅ API key deleted successfully
 *       401:
 *         description: ❌ Unauthorized
 *       404:
 *         description: ❌ API key not found
 */
router.delete('/key/:id', authMiddleware.authenticate, authController.deleteKeyById);

module.exports = router;