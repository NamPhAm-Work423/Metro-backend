const express = require('express');
const router = express.Router();
const fareController = require('../controllers/fare.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Public fare information (all authenticated users)
router.get('/get-all', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.getAllFares);
router.get('/search', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.searchFares);

// Route-based fare queries (all authenticated users)
router.get('/route/:routeId', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.getFaresByRoute);
router.get('/stations/:originId/:destinationId', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.getFaresBetweenStations);
router.get('/zones/:zones', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.getFaresByZone);

// Fare calculation
router.get('/:id/calculate', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.calculateFarePrice);

// Administrative operations
router.get('/statistics', ...authorizeRoles('staff', 'admin'), fareController.getFareStatistics);
router.put('/bulk-update', ...authorizeRoles('admin'), fareController.bulkUpdateFares);

// CRUD operations
router.get('/', ...authorizeRoles('staff', 'admin'), fareController.getAllFares);
router.post('/', ...authorizeRoles('admin'), fareController.createFare);
router.get('/:id', ...authorizeRoles('passenger', 'staff', 'admin'), fareController.getFareById);
router.put('/:id', ...authorizeRoles('admin'), fareController.updateFare);
router.delete('/:id', ...authorizeRoles('admin'), fareController.deleteFare);

module.exports = router;
