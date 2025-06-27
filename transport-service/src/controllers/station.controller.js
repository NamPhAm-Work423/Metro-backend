const stationService = require('../services/station.service');

class StationController {
    async createStation(req, res) {
        try {
            const station = await stationService.createStation(req.body);
            res.status(201).json({
                success: true,
                message: 'Station created successfully',
                data: station
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllStations(req, res) {
        try {
            const stations = await stationService.getAllStations(req.query);
            res.status(200).json({
                success: true,
                data: stations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getStationById(req, res) {
        try {
            const station = await stationService.getStationById(req.params.id);
            res.status(200).json({
                success: true,
                data: station
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateStation(req, res) {
        try {
            const station = await stationService.updateStation(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Station updated successfully',
                data: station
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteStation(req, res) {
        try {
            await stationService.deleteStation(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Station deactivated successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getActiveStations(req, res) {
        try {
            const stations = await stationService.getActiveStations();
            res.status(200).json({
                success: true,
                data: stations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getStationsByOperatingHours(req, res) {
        try {
            const { currentTime } = req.query;
            const stations = await stationService.getStationsByOperatingHours(currentTime);
            res.status(200).json({
                success: true,
                data: stations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateStationFacilities(req, res) {
        try {
            const { facilities } = req.body;
            const station = await stationService.updateStationFacilities(req.params.id, facilities);
            res.status(200).json({
                success: true,
                message: 'Station facilities updated successfully',
                data: station
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new StationController(); 