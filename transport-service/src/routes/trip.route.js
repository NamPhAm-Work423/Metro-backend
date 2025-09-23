const express = require('express');
const router = express.Router();
const tripController = require('../controllers/trip.controller');
const stopController = require('../controllers/stop.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get trips with filters (staff and admin)
router.get('/getTripsWithFilters', ...authorizeRoles('staff', 'admin'), tripController.getTripsWithFilters);

// Get active trips (all roles)
router.get('/getActiveTrips', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.getActiveTrips);

// Get upcoming trips (all roles)
router.get('/getUpcomingTrips', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.getUpcomingTrips);

// Search trips between stations (all roles)
router.get('/findTripsBetweenStations', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.findTripsBetweenStations);

// Get trips by route (all roles)
router.get('/getTripsByRoute/:routeId', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.getTripsByRoute);

// Get trips by train (staff and admin)
router.get('/getTripsByTrain/:trainId', ...authorizeRoles('staff', 'admin'), tripController.getTripsByTrain);

// Get trips by day of week (all roles)
router.get('/getTripsByDayOfWeek/:dayOfWeek', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.getTripsByDayOfWeek);

// Get trip by ID (all roles)
router.get('/getTripById/:id', ...authorizeRoles('passenger', 'staff', 'admin'), tripController.getTripById);

// Get trip statistics (staff and admin)
router.get('/getTripStatistics/:id', ...authorizeRoles('staff', 'admin'), tripController.getTripStatistics);

// Get trip schedule with stops (all roles)
router.get('/getTripScheduleWithStops/:tripId', ...authorizeRoles('passenger', 'staff', 'admin'), stopController.getTripScheduleWithStops);

// Validate stop sequence (admin and staff)
router.post('/validateStopSequence/:tripId', ...authorizeRoles('staff', 'admin'), stopController.validateStopSequence);

// Create trip (admin only)
router.post('/createTrip', ...authorizeRoles('admin'), tripController.createTrip);

// Update trip (admin only)
router.put('/updateTrip/:id', ...authorizeRoles('admin'), tripController.updateTrip);

// Delete trip (admin only)
router.delete('/deleteTrip/:id', ...authorizeRoles('admin'), tripController.deleteTrip);

module.exports = router;