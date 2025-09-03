const tripService = require('../services/trip.service');

class TripController {
    async createTrip(req, res, next) {
        try {
            const trip = await tripService.createTrip(req.body);
            return res.status(201).json({
                success: true,
                message: 'Trip created successfully',
                data: trip
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CREATE_TRIP'
            });
        }
    }

    async getAllTrips(req, res, next) {
        try {
            const trips = await tripService.getAllTrips(req.query);
            return res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ALL_TRIPS'
            });
        }
    }

    async getTripById(req, res, next) {
        try {
            const trip = await tripService.getTripById(req.params.id);
            return res.status(200).json({
                success: true,
                data: trip
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(404).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRIP_BY_ID'
            });
        }
    }

    async updateTrip(req, res, next) {
        try {
            const trip = await tripService.updateTrip(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: 'Trip updated successfully',
                data: trip
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_TRIP'
            });
        }
    }

    async deleteTrip(req, res, next) {
        try {
            await tripService.deleteTrip(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'Trip deactivated successfully'
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_DELETE_TRIP'
            });
        }
    }

    async getActiveTrips(req, res, next) {
        try {
            const trips = await tripService.getActiveTrips();
            return res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ACTIVE_TRIPS'
            });
        }
    }

    async getTripsByRoute(req, res, next) {
        try {
            const trips = await tripService.getTripsByRoute(req.params.routeId);
            return res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRIPS_BY_ROUTE'
            });
        }
    }

    async getTripsByTrain(req, res, next) {
        try {
            const trips = await tripService.getTripsByTrain(req.params.trainId);
            return res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRIPS_BY_TRAIN'
            });
        }
    }

    async getTripsByDayOfWeek(req, res, next) {
        try {
            const trips = await tripService.getTripsByDayOfWeek(req.params.dayOfWeek);
            return res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRIPS_BY_DAY_OF_WEEK'
            });
        }
    }

    async getUpcomingTrips(req, res, next) {
        try {
            const { currentTime, dayOfWeek } = req.query;
            const trips = await tripService.getUpcomingTrips(currentTime, dayOfWeek);
            return res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_UPCOMING_TRIPS'
            });
        }
    }

    async findTripsBetweenStations(req, res, next) {
        try {
            const { originStationId, destinationStationId, dayOfWeek } = req.query;
            const trips = await tripService.findTripsBetweenStations(originStationId, destinationStationId, dayOfWeek);
            return res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            next(error);
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_FIND_TRIPS_BETWEEN_STATIONS'
            });
        }
    }

    async getTripStatistics(req, res, next) {
        try {
            const statistics = await tripService.getTripStatistics(req.params.id);
            return res.status(200).json({
                success: true,
                data: statistics
            });
        } catch (error) {
            next(error);
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRIP_STATISTICS'
            });
        }
    }
}

module.exports = new TripController(); 