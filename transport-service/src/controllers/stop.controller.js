const stopService = require('../services/stop.service');

class StopController {
    async createStop(req, res, next) {
        try {
            const stop = await stopService.createStop(req.body);
            return res.status(201).json({
                success: true,
                message: 'Stop created successfully',
                data: stop
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CREATE_STOP'
            });
        }
    }

    async createMultipleStops(req, res, next) {
        try {
            const { stopsData } = req.body;
            const stops = await stopService.createMultipleStops(stopsData);
            return res.status(201).json({
                success: true,
                message: 'Stops created successfully',
                data: stops
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CREATE_MULTIPLE_STOPS'
            });
        }
    }

    async getAllStops(req, res, next) {
        try {
            const stops = await stopService.getAllStops(req.query);
            return res.status(200).json({
                success: true,
                data: stops
            }); 
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ALL_STOPS'
            });
        }
    }

    async getStopById(req, res, next) {
        try {
            const stop = await stopService.getStopById(req.params.id);
            return res.status(200).json({
                success: true,
                data: stop
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(404).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_STOP_BY_ID'
            });
        }
    }

    async updateStop(req, res, next) {
        try {
            const stop = await stopService.updateStop(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: 'Stop updated successfully',
                data: stop
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_STOP'
            });
        }
    }

    async deleteStop(req, res, next) {
        try {
            await stopService.deleteStop(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'Stop deleted successfully'
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_DELETE_STOP'
            });
        }
    }

    async getStopsByTrip(req, res, next) {
        try {
            const stops = await stopService.getStopsByTrip(req.params.tripId);
            return res.status(200).json({
                success: true,
                data: stops
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_STOPS_BY_TRIP'
            });
        }
    }

    async getStopsByStation(req, res, next) {
        try {
            const stops = await stopService.getStopsByStation(req.params.stationId);
            return res.status(200).json({
                success: true,
                data: stops
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_STOPS_BY_STATION'
            });
        }
    }

    async getTripScheduleWithStops(req, res, next) {
        try {
            const schedule = await stopService.getTripScheduleWithStops(req.params.tripId);
            return res.status(200).json({
                success: true,
                data: schedule
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRIP_SCHEDULE_WITH_STOPS'
            });
        }
    }

    async getNextStopsAtStation(req, res, next) {
        try {
            const { currentTime, dayOfWeek, limit } = req.query;
            const stops = await stopService.getNextStopsAtStation(req.params.stationId, currentTime, dayOfWeek, limit);
            return res.status(200).json({
                success: true,
                data: stops
            });
        } catch (error) {
            next(error);
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_NEXT_STOPS_AT_STATION'
            });
        }
    }

    async validateStopSequence(req, res, next) {
        try {
            const { tripId } = req.params;
            const { stops } = req.body;
            const validation = await stopService.validateStopSequence(tripId, stops);
            return res.status(200).json({
                success: true,
                data: validation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_VALIDATE_STOP_SEQUENCE'
            });
        }
    }
}

module.exports = new StopController(); 