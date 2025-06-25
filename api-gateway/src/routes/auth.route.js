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
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: accessToken
 *       description: 'JWT token stored in HTTP-only cookie (automatic)'
 *
 * tags:
 *   - name: Authentication
 *     description: |
 *       ## 🔐 Authentication System
 *       
 *       ### Simple 2-Step Process:
 *       
 *       1. **Register/Login** → JWT automatically saved in HTTP-only cookie
 *       2. **Use any endpoint** → Cookies automatically sent with requests
 *       
 *       ### How It Works:
 *       - JWT stored in secure HTTP-only cookies (auto-sent)
 *       - API keys automatically managed by backend
 *       - Zero token management required
 *       - Maximum security (XSS protection)
 *       
 *       ### Quick Start:
 *       ```bash
 *       # 1. Login (cookies auto-saved)
 *       curl -X POST /v1/auth/login \\
 *         --cookie-jar cookies.txt \\
 *         -H "Content-Type: application/json" \\
 *         -d '{"email":"user@example.com","password":"password"}'
 *       
 *       # 2. Use any endpoint (cookies auto-sent)
 *       curl --cookie cookies.txt /v1/route/passengers
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
 *       - cookieAuth: []
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
 *     description: Reset password using token and user ID from reset email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - uid
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token from email
 *               uid:
 *                 type: string
 *                 description: User ID from email
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: New password
 *     responses:
 *       200:
 *         description: ✅ Password reset successful
 *       400:
 *         description: ❌ Invalid request or expired token
 *       403:
 *         description: ❌ Invalid or expired reset token
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


router.get('/key/:id', authMiddleware.authenticate, authController.generateAPIToken);


router.get('/keys/:userId', authMiddleware.authenticate, authController.getAPIKeyByUser);


router.delete('/key/:id', authMiddleware.authenticate, authController.deleteKeyById);

module.exports = router;