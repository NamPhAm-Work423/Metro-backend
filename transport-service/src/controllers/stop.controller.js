const stopService = require('../services/stop.service');

class StopController {
    async createStop(req, res, next) {
        try {
            const stop = await stopService.createStop(req.body);
            res.status(201).json({
                success: true,
                message: 'Stop created successfully',
                data: stop
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async createMultipleStops(req, res, next) {
        try {
            const { stopsData } = req.body;
            const stops = await stopService.createMultipleStops(stopsData);
            res.status(201).json({
                success: true,
                message: 'Stops created successfully',
                data: stops
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllStops(req, res, next) {
        try {
            const stops = await stopService.getAllStops(req.query);
            res.status(200).json({
                success: true,
                data: stops
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getStopById(req, res, next) {
        try {
            const stop = await stopService.getStopById(req.params.id);
            res.status(200).json({
                success: true,
                data: stop
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateStop(req, res, next) {
        try {
            const stop = await stopService.updateStop(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Stop updated successfully',
                data: stop
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteStop(req, res, next) {
        try {
            await stopService.deleteStop(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Stop deleted successfully'
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getStopsByTrip(req, res, next) {
        try {
            const stops = await stopService.getStopsByTrip(req.params.tripId);
            res.status(200).json({
                success: true,
                data: stops
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getStopsByStation(req, res, next) {
        try {
            const stops = await stopService.getStopsByStation(req.params.stationId);
            res.status(200).json({
                success: true,
                data: stops
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTripScheduleWithStops(req, res, next) {
        try {
            const schedule = await stopService.getTripScheduleWithStops(req.params.tripId);
            res.status(200).json({
                success: true,
                data: schedule
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getNextStopsAtStation(req, res, next) {
        try {
            const { currentTime, dayOfWeek, limit } = req.query;
            const stops = await stopService.getNextStopsAtStation(req.params.stationId, currentTime, dayOfWeek, limit);
            res.status(200).json({
                success: true,
                data: stops
            });
        } catch (error) {
            next(error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async validateStopSequence(req, res, next) {
        try {
            const { tripId } = req.params;
            const { stops } = req.body;
            const validation = await stopService.validateStopSequence(tripId, stops);
            res.status(200).json({
                success: true,
                data: validation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new StopController(); 