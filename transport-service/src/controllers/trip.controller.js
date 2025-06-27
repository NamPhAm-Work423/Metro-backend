const tripService = require('../services/trip.service');

class TripController {
    async createTrip(req, res) {
        try {
            const trip = await tripService.createTrip(req.body);
            res.status(201).json({
                success: true,
                message: 'Trip created successfully',
                data: trip
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllTrips(req, res) {
        try {
            const trips = await tripService.getAllTrips(req.query);
            res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTripById(req, res) {
        try {
            const trip = await tripService.getTripById(req.params.id);
            res.status(200).json({
                success: true,
                data: trip
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateTrip(req, res) {
        try {
            const trip = await tripService.updateTrip(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Trip updated successfully',
                data: trip
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteTrip(req, res) {
        try {
            await tripService.deleteTrip(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Trip deactivated successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getActiveTrips(req, res) {
        try {
            const trips = await tripService.getActiveTrips();
            res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTripsByRoute(req, res) {
        try {
            const trips = await tripService.getTripsByRoute(req.params.routeId);
            res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTripsByTrain(req, res) {
        try {
            const trips = await tripService.getTripsByTrain(req.params.trainId);
            res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTripsByDayOfWeek(req, res) {
        try {
            const trips = await tripService.getTripsByDayOfWeek(req.params.dayOfWeek);
            res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getUpcomingTrips(req, res) {
        try {
            const { currentTime, dayOfWeek } = req.query;
            const trips = await tripService.getUpcomingTrips(currentTime, dayOfWeek);
            res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async findTripsBetweenStations(req, res) {
        try {
            const { originStationId, destinationStationId, dayOfWeek } = req.query;
            const trips = await tripService.findTripsBetweenStations(originStationId, destinationStationId, dayOfWeek);
            res.status(200).json({
                success: true,
                data: trips
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTripStatistics(req, res) {
        try {
            const statistics = await tripService.getTripStatistics(req.params.id);
            res.status(200).json({
                success: true,
                data: statistics
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new TripController(); 