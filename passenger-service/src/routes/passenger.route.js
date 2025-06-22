const express = require('express');
const router = express.Router();
const passengerController = require('../controllers/passenger.controller');
const { authorizeRoles } = require('../middlewares/authorization');

router.post('/', authorizeRoles('passenger'), passengerController.createPassenger);
router.get('/me', authorizeRoles('passenger'), passengerController.getMe);

module.exports = router; 