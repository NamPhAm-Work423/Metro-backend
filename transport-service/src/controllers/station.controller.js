const stationService = require('../services/station.service');

class StationController {
    async createStation(req, res, next) {
        try {
            const station = await stationService.createStation(req.body);
            return res.status(201).json({
                success: true,
                message: 'Station created successfully',
                data: station
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CREATE_STATION'
            });
        }
    }

    async getAllStations(req, res, next) {
        try {
            const stations = await stationService.getAllStations(req.query);
            return res.status(200).json({
                success: true,
                data: stations
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ALL_STATIONS'
            });
        }
    }

    async getStationById(req, res, next) {
        try {
            const station = await stationService.getStationById(req.params.id);
            return res.status(200).json({
                success: true,
                data: station
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(404).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_STATION_BY_ID'
            });
        }   
    }

    async updateStation(req, res, next) {
        try {
            const station = await stationService.updateStation(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: 'Station updated successfully',
                data: station
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_STATION'
            });
        }
    }

    async deleteStation(req, res, next) {
        try {
            await stationService.deleteStation(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'Station deactivated successfully'
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_DELETE_STATION'
            });
        }
    }

    async getActiveStations(req, res, next) {
        try {
            const stations = await stationService.getActiveStations();
            return res.status(200).json({
                success: true,
                data: stations
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ACTIVE_STATIONS'
            });
        }
    }

    async getStationsByOperatingHours(req, res, next) {
        try {
            const { currentTime } = req.query;
            const stations = await stationService.getStationsByOperatingHours(currentTime);
            return res.status(200).json({
                success: true,
                data: stations
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_STATIONS_BY_OPERATING_HOURS'
            });
        }
    }

    async updateStationFacilities(req, res, next) {
        try {
            const { facilities } = req.body;
            const station = await stationService.updateStationFacilities(req.params.id, facilities);
            return res.status(200).json({
                success: true,
                message: 'Station facilities updated successfully',
                data: station
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_STATION_FACILITIES'
            });
        }
    }
}

module.exports = new StationController(); 