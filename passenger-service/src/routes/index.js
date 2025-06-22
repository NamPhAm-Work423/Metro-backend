const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authorizeRoles } = require('../middlewares/authorization');
const passengerRoutes = require('./passenger.route');

router.get('/profile', authorizeRoles('passenger', 'staff', 'admin'), userController.profile);
router.get('/', authorizeRoles('staff', 'admin'), userController.listUsers);
router.put('/:id', authorizeRoles('passenger', 'staff', 'admin'), userController.updateUser);
router.use('/passenger', passengerRoutes);

module.exports = router; 