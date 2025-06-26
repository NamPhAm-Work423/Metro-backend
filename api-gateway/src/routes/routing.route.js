const express = require('express');
const router = express.Router();
const routingController = require('../controllers/routing.controller');
const authMiddleware = require('../middlewares/auth.middleware');




// Dynamic routing - all HTTP methods supported
// More specific routes first - catches paths with additional segments
router.all('/:endPoint/*', authMiddleware.autoInjectAPIKeyMiddleware, routingController.useService);
// Less specific routes last - catches exact endpoint matches
router.all('/:endPoint', authMiddleware.autoInjectAPIKeyMiddleware, routingController.useService);

module.exports = router;
