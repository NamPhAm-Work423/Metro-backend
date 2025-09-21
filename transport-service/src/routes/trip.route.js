const express = require('express');
const router = express.Router();
const tripController = require('../controllers/trip.controller');
const stopController = require('../controllers/stop.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get trips with filters (staff and admin)
router.get('/', ...authorizeRoles('staff', 'admin'), tripController.getTripsWithFilters);

// Get active trips (all roles)
router.get('/active', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.getActiveTrips);

// Get upcoming trips (all roles)
router.get('/upcoming', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.getUpcomingTrips);

// Search trips between stations (all roles)
router.get('/search/between-stations', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.findTripsBetweenStations);

// Get trips by route (all roles)
router.get('/route/:routeId', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.getTripsByRoute);

// Get trips by train (staff and admin)
router.get('/train/:trainId', ...authorizeRoles('staff', 'admin'), tripController.getTripsByTrain);

// Get trips by day of week (all roles)
router.get('/day/:dayOfWeek', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.getTripsByDayOfWeek);

// Get trip by ID (all roles)
router.get('/:id', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.getTripById);

// Get trip statistics (staff and admin)
router.get('/:id/statistics', ...authorizeRoles('staff', 'admin'), tripController.getTripStatistics);

// Get trip schedule with stops (all roles)
router.get('/:tripId/schedule', ...authorizeRoles('passenger', 'staff', 'admin'), stopController.getTripScheduleWithStops);

// Validate stop sequence (admin and staff)
router.post('/:tripId/stops/validate', ...authorizeRoles('staff', 'admin'), stopController.validateStopSequence);

// Create trip (admin only)
router.post('/', ...authorizeRoles('admin'), tripController.createTrip);

// Update trip (admin only)
router.put('/:id', ...authorizeRoles('admin'), tripController.updateTrip);

// Delete trip (admin only)
router.delete('/:id', ...authorizeRoles('admin'), tripController.deleteTrip);

module.exports = router;