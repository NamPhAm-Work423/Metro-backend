const express = require('express');
const router = express.Router();
const fareController = require('../controllers/fare.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Public fare information (all authenticated users)
router.get('/getAllActiveFares', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.getAllFares);
router.get('/searchFares', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.searchFares);

// Route-based fare queries (all authenticated users)
router.get('/getFaresByRoute/:routeId', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.getFaresByRoute);
router.get('/getFaresBetweenStations/:originId/:destinationId', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.getFaresBetweenStations);
router.get('/getFaresByZone/:zones', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.getFaresByZone);

// Fare calculation
router.get('/calculateFarePrice/:id', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.calculateFarePrice);

// Administrative operations
router.get('/fareStatistics', ...authorizeRoles('staff', 'admin'), fareController.getFareStatistics);
router.put('/bulkUpdateFares', ...authorizeRoles('admin'), fareController.bulkUpdateFares);

// CRUD operations
router.get('/getAllFares', ...authorizeRoles('staff', 'admin'), fareController.getAllFares);
router.post('/createFare', ...authorizeRoles('admin'), fareController.createFare);
router.get('/getFareById/:id', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.getFareById);
router.put('/updateFare/:id', ...authorizeRoles('admin'), fareController.updateFare);
router.delete('/deleteFare/:id', ...authorizeRoles('admin'), fareController.deleteFare);

module.exports = router;
